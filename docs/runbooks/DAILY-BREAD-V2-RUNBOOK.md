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
   Then apply `supabase/migrations/20260914000001_daily_bread_v2_private_provenance.sql`
   (plan §27). It is idempotent. Check it with the anon key: a REST request for
   `daily_bread_editions?select=slug` returns 200, and requests for
   `daily_bread_editions?select=generation` or `daily_bread_edition_revisions` return
   401 or 403 (permission denied).
2. **Optional backfill** of archive entries before launch:
   `npm run daily-bread -- backfill --from=2026-08-18 --to=<day before launch> --dry-run`.
   Then run it again without `--dry-run`. These entries carry no issue numbers.
   - Each entry imports that day's paper from its dated sources (plan §81). It gets no
     written standfirst, rabbit holes, scene or reprinted comic, no rotation, and the
     Broadsheet layout.
   - A date that already has a native READY row is skipped, never published: publishing
     it would spend an issue number.
   - Entries built by the first backfill (before 2026-09-14) are corrected with
     `npm run daily-bread -- reimport-backfill --from=2026-08-18 --to=2026-09-12
     --dry-run`, then without `--dry-run`. Each is corrected by revision; native
     editions are skipped. Repoint strip No. 1's row first, or Aug 20 loses its strip.
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
   npm run daily-bread -- bundle-scan   # plan §56: exits 1 on any credential in the build
   npm run daily-bread -- fixtures --from=2026-09-13 --days=7 --assets-dir=.open-next/assets
   DAILY_BREAD_V2=on DAILY_BREAD_V2_SOURCE=fixture npx wrangler dev --port 8799 \
     --var DAILY_BREAD_V2:on --var DAILY_BREAD_V2_SOURCE:fixture
   curl -s localhost:8799/daily-bread | grep -o 'Vol\. 1 · No\. [0-9]*' | head -1
   curl -s localhost:8799/daily-bread/2026-09-14 | grep -o 'data-archetype="[a-z-]*"'
   curl -s -o /dev/null -w '%{http_code}\n' localhost:8799/daily-bread/2026-02-30   # 404
   ```
   A fresh `npm run deploy` rebuilds `.open-next`, so the fixture copy is never
   deployed.
6. **Turn on the reader.** Since the go-live commit, `DAILY_BREAD_V2_DEFAULT` in
   `src/lib/daily-bread/flags.ts` is `'on'`, so a normal deploy turns the reader on.
   No variable is needed, so build and runtime always agree. `/daily-bread` is
   prerendered at build time, which is why this is a committed default and not a
   runtime-only variable. Deploy through the normal path (verify accounts first;
   COMMIT-AND-DEPLOY-GUIDE.md), then check the result with curl:
   `curl -s https://euangelion.app/daily-bread | grep -o 'Vol\. 1 · No\. [0-9]*'`.
   `/api/admin/daily-bread/health` with `X-Internal-Secret` returns `"status":"ok"`.

**Rollback:** either set `DAILY_BREAD_V2=off` in the build environment (for example
`DAILY_BREAD_V2=off npm run deploy`) and as a Worker variable, or change
`DAILY_BREAD_V2_DEFAULT` to `'off'` and deploy. `/daily-bread` is the SA-090 paper
again. V2 data stays in its tables.

**Removing the schema** (only after the reader rollback above, with the scheduler
variable not `enabled`, and after exporting the tables if the archive should
survive): run `database/ROLLBACK-2026-09-13-daily-bread-v2.sql` in the Supabase SQL
editor with `SET daily_bread.confirm_rollback = 'destroy-archive';` first. It
deletes every edition, revision and attempt. Re-applying the migration afterwards
starts the paper again at No. 001.

## Daily operation

- **Health:** `npm run daily-bread -- health`, or
  `curl -H "X-Internal-Secret: $INTERNAL_ROUTE_SECRET" https://euangelion.app/api/admin/daily-bread/health`.
  A `down` status returns HTTP 503.
- **Attempts:** see the most recent runs with
  `select target_date, lifecycle_stage, publication_result, quality, primary_provider, fallback_providers_used, errors from daily_bread_publication_attempts order by started_at desc limit 20;`
- **Scheduler:** there are two parts.
  - **Builds:** open the Actions tab and choose `daily-bread-v2`. A failed run or a
    `down` health opens an issue.
  - **The 7am publish:** Cloudflare dashboard → Workers → `euangelion` → Logs; filter
    for `cron_publish`. Expect `published` at 07:01 ET, then `already_published`.
    `no-internal-secret` means the Worker secret `INTERNAL_ROUTE_SECRET` is missing.
    `not_ready` means no build finished; run the fix in the first incident row.
  - **Test the cron locally:** `npx wrangler dev --test-scheduled`, then
    `curl "http://127.0.0.1:8787/__scheduled?cron=1,15,30,45+11,12+*+*+*"`.

## Incidents

| Symptom | Do this |
| --- | --- |
| Today shows "is delayed", or Workers Logs show `last_known_good_served` or a `cron_publish` line at `level: critical` | Readers are getting the previous paper, under its own date, more than 35 minutes after 7am (plan §31). Run `npm run daily-bread -- run`. It builds and publishes the live date. Check `errors` in the newest attempt. ("Still on the press" inside the first 35 minutes is normal.) |
| Health `degraded`: tomorrow not ready | Run `npm run daily-bread -- build --date=<tomorrow>`. |
| A build is stuck `assembling` | The lease expires after 15 minutes, then the next run takes over. Nothing to delete. |
| Every edition is `fallback` | The providers are failing. Check `provider_usage[].error` in the attempts: `unavailable` means a secret is missing; `HTTP 401` means a bad key; timeouts mean slow providers. The paper is still publishing. |
| A published edition has an error | Write a revision with `select * from daily_bread_create_revision('<date>', '<reason>', '{"deck":"..."}'::jsonb);`. The number and date are kept, and the page shows "Corrected edition". |
| A published edition must come down | Withdraw it with `select daily_bread_supersede('<date>', '<reason shown to readers>');`. Its number stays retired. |
| The founder rejected a reviewed item after the build | Nothing to do. Publish sees the rejection, reopens the edition and the next run rebuilds it. |
| The comic is missing or wrong | The funnies are Echo & Dust only. `generation.comicLevel`: `approved-art` is the day's strip; `archive-reprint` means no strip was drawn for the date (the strip machine is the founder's `STRIP_MACHINE` switch); `omitted` means no published strip ran before that date or none was reachable. The attempt's `warnings` name each skip. To fix published editions after a strip row is corrected: `npm run daily-bread -- repair-comics --from=<date> --to=<date> --dry-run`, check the list, then run without `--dry-run`. |

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

Each edition makes one small model call (the frame, about 900 output tokens). The
comic calls no model: it is Echo & Dust, drawn upstream. The subscription CLI transport costs $0 marginal. The
API transport costs a few cents per day; the attempt rows carry `estimated_cost_usd`
and health sums 7 days. The workflow runs eight short Actions jobs a day (about 1–2
minutes each; most are no-ops). The Worker cron is 8 invocations a day inside the
free plan.
