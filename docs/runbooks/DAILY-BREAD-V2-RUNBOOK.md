# Daily Bread V2 — runbook (SA-142 / F-184)

Architecture: `docs/daily-bread/DAILY-BREAD-V2.md`. All commands run from the repo
root. Pipeline commands read secrets from the environment (CI) or `.env.local`
(locally) and never print them.

## Activation (in order)

1. **Apply the migration (founder, SA-094).** In the Supabase SQL editor, paste
   `supabase/migrations/20260913000001_daily_bread_v2.sql`. The same text is bundled
   as `database/APPLY-NOW-2026-09-13-daily-bread-v2.sql`. It is idempotent.
   Check the result:
   `select count(*) from daily_bread_editions;` returns 0.
   `select proname from pg_proc where proname like 'daily_bread_%';` lists 9 functions.
2. **Optional backfill** of archive entries before launch:
   `npm run daily-bread -- backfill --from=2026-08-18 --to=<day before launch> --dry-run`.
   Then run it again without `--dry-run`. These entries carry no issue numbers.
3. **Build the first native edition**:
   `npm run daily-bread -- build --date=<launch date>`.
   Inspect it at `/admin/preview/daily-bread-v2?date=<launch date>`.
4. **Enable the scheduler.** Set the repository variable
   `DAILY_BREAD_V2_SCHEDULER=enabled`. Confirm the secrets exist:
   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required.
   `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`, and `GEMINI_API_KEY`, are optional.
5. **Workers preview check (CLAUDE.md rule 9)**, before any deploy:
   ```bash
   npm run daily-bread -- fixtures --from=2026-09-13 --days=7
   npx opennextjs-cloudflare build
   npm run daily-bread -- fixtures --from=2026-09-13 --days=7 --assets-dir=.open-next/assets
   DAILY_BREAD_V2=on DAILY_BREAD_V2_SOURCE=fixture npx wrangler dev --port 8799 \
     --var DAILY_BREAD_V2:on --var DAILY_BREAD_V2_SOURCE:fixture
   curl -s localhost:8799/daily-bread | grep -o 'Vol\. 1 · No\. [0-9]*' | head -1
   curl -s localhost:8799/daily-bread/2026-09-14 | grep -o 'data-archetype="[a-z-]*"'
   curl -s -o /dev/null -w '%{http_code}\n' localhost:8799/daily-bread/2026-02-30   # 404
   ```
   A fresh `npm run deploy` rebuilds `.open-next`, so the fixture copy is never
   deployed.
6. **Turn on the reader.** Set `DAILY_BREAD_V2=on` BOTH as a build variable and as a
   Worker runtime variable, then deploy through the normal path (verify accounts
   first; COMMIT-AND-DEPLOY-GUIDE.md). Both are needed because `/daily-bread` and
   `/daily-bread/archive` are prerendered at build time (ISR 5 minutes). A build without
   the flag bakes the SA-090 page into the first render, and readers see it until the
   first revalidation.
   Check the result with curl:
   `curl -s https://euangelion.app/daily-bread | grep -o 'Vol\. 1 · No\. [0-9]*'`.
   `/api/admin/daily-bread/health` with `X-Internal-Secret` returns `"status":"ok"`.

**Rollback:** unset `DAILY_BREAD_V2`, or set it to `off`, and redeploy. `/daily-bread`
is the SA-090 paper again. V2 data stays in its tables.

## Daily operation

- **Health:** `npm run daily-bread -- health`, or
  `curl -H "X-Internal-Secret: $INTERNAL_ROUTE_SECRET" https://euangelion.app/api/admin/daily-bread/health`.
  A `down` status returns HTTP 503.
- **Attempts:** see the most recent runs with
  `select target_date, lifecycle_stage, publication_result, quality, primary_provider, fallback_providers_used, errors from daily_bread_publication_attempts order by started_at desc limit 20;`
- **Scheduler:** open the Actions tab and choose `daily-bread-v2`. A failed run or a
  `down` health opens an issue.

## Incidents

| Symptom | Do this |
| --- | --- |
| Today shows "still on the press" after 08:30 ET | Run `npm run daily-bread -- run`. It builds and publishes the live date. Check `errors` in the newest attempt. |
| Health `degraded`: tomorrow not ready | Run `npm run daily-bread -- build --date=<tomorrow>`. |
| A build is stuck `assembling` | The lease expires after 15 minutes, then the next run takes over. Nothing to delete. |
| Every edition is `fallback` | The providers are failing. Check `provider_usage[].error` in the attempts: `unavailable` means a secret is missing; `HTTP 401` means a bad key; timeouts mean slow providers. The paper is still publishing. |
| A published edition has an error | Write a revision with `select * from daily_bread_create_revision('<date>', '<reason>', '{"deck":"..."}'::jsonb);`. The number and date are kept, and the page shows "Corrected edition". |
| A published edition must come down | Withdraw it with `select daily_bread_supersede('<date>', '<reason shown to readers>');`. Its number stays retired. |
| The founder rejected a reviewed item after the build | Nothing to do. Publish sees the rejection, reopens the edition and the next run rebuilds it. |
| The comic is missing | The edition's `generation.comicLevel` tells you why. `omitted` means every level failed; the attempt's `warnings` name each failure. |

## Local development

```bash
npm run daily-bread -- e2e                                   # whole pipeline in memory
npm run daily-bread -- build --date=2026-09-14 --dry-run     # writes .daily-bread-local/2026-09-14.json
npm run daily-bread -- fixtures --from=2026-09-13 --days=7   # 7 published editions for the fixture source
DAILY_BREAD_V2=on DAILY_BREAD_V2_SOURCE=fixture npm run dev  # then open /daily-bread
npx vitest run __tests__/daily-bread-v2-*                    # the V2 suites
```

## Good News

`src/data/daily-bread-good-news.ts` is filled by hand only. To add an item, add an
entry with:
- `runOn`: the editorial date to print it
- a headline and summary in our own words
- the outlet name and https URL
- the report's own publication date, within 30 days before `runOn`

On dates with no entry, the module does not appear. Never let a model find, write or
summarize Good News.

## Cost

Each edition makes two small model calls (the frame, about 900 output tokens, and the
comic storyboard, about 1,200). The subscription CLI transport costs $0 marginal. The
API transport costs a few cents per day; the attempt rows carry `estimated_cost_usd`
and health sums 7 days. The scheduler runs five short Actions jobs a day (about 1–2
minutes each).
