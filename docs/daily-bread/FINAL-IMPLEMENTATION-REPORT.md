# Daily Bread V2 — implementation report (plan §97)

SA-142 / F-184. Written 2026-09-14 at the end of the realignment, on
`feat/daily-bread-v2` (`5dba2546` and the commit that adds this file).

**The work is not complete.** §97 asks for this report "only after completing the
work". It is written now because the remaining items wait on founder decisions and
approvals, listed at the end. Nothing below is deployed unless it says so. Production
runs Worker version `1ff29569`, from before the realignment.

## Implemented

- **Serialized editions.** One row per editorial date; Vol. 1 · No. 001 onward,
  numbered inside the publish transaction under an advisory lock and never reused.
  Backfilled editions are unnumbered archive entries.
- **Frozen snapshots and revisions.** Published pages render the stored document.
  Corrections write immutable revisions; a reason and "Corrected edition" show.
- **Dated URLs, archive, ending.** `/daily-bread/YYYY-MM-DD` is canonical. The archive
  shows one month per page. Each paper ends with the plan's copy and previous/next.
- **Editorial clock.** 7am America/New_York. The Worker's Cron Trigger publishes. GitHub
  builds in five evening and morning attempts.
- **EditorialGenerator (§21).** The frame, the SA-100 Sunday lead and the SA-114 guides
  run through one provider chain with timeouts, retries, validation and prompt
  versions.
- **Quality.** `normal`, `fallback` or `minimum`, independent of lifecycle. A frame not
  written by Claude, a reprinted or omitted comic, or a failed module makes an edition
  `fallback`.
- **Echo & Dust, weekly.** One founder-approved strip per week prints all week.
  Otherwise a credited reprint, or no comic. Batch approval at `/admin/comics`.
- **Composition.** Eight archetypes, each with its own presentation. Module roles and
  budgets rotate departments and interactives. Ten rhythm beats. Anti-repeat over 90
  days (gallery works 60 days, artists 7, voices 30, heroes and renderers day to day,
  lead-led openings as one hero). The preview page explains every choice.
- **Rabbit holes and Good News.** Rabbit holes link to a same-site thread. Good News
  items carry a checked date.
- **Backfill as import.** Backfilled editions take no number, frame, scene or rotation.
  `reimport-backfill` corrects them by revision.
- **Accessibility and mobile.** Puzzle grids fixed to 0 axe violations. The contents
  line is a single scrollable line on phones with 44px targets.
- **Sitemap.** Lists published issues and the archive.
- **Reader reads time out.** 8 s per attempt, cancelled and retried, at most about 25 s.

## Tests

| Command | Result (2026-09-14) |
| --- | --- |
| `npx vitest run __tests__/daily-bread-v2*` | 260 passed |
| `npx vitest run` (clean environment, `env -i`, as CI) | 3,103 passed, 2 failed, 16 skipped |
| `npm run daily-bread -- e2e` (clean environment) | exit 0, 52 of 52 checks `ok` |
| `npx tsc --noEmit`, ESLint on changed files | clean |
| `npm run verify:tracking`, `verify:feature-prds` | OK |
| `npm run daily-bread -- bundle-scan` | 4,864 files, 0 hits |

The 2 failures are not Daily Bread: `audio-chapter-tiers` (corpus now 6,267 chapters)
and `narration-manifest-current` (14 All These Things tracks without a versioned key),
from SA-123/SA-124. **CI has not passed since 2026-07-12**; see external blockers.

QA records: `QA-2026-09-14-SEVEN-DAY.md` (seven days at 390px, five archetypes, no two
days opening the same way) and `QA-2026-09-14-MOBILE-ACCESSIBILITY.md` (three emulated
phones, Slow 4G, CPU 4×).

## Daily pipeline

1. **Build (evening before, GitHub `daily-bread-v2.yml`).** Runs at 22:15, 00:15, 02:15,
   05:15 and 08:15 UTC. `npm run daily-bread -- run` acquires the assembly lease for
   tomorrow and loads sources. It then selects assets, generates the frame through the
   chain, picks the week's Echo & Dust strip and composes the archetype. It validates
   the document, marks it `ready` and records a PublicationAttempt with stage timings.
2. **Publish (7am ET).** The Worker's Cron Trigger (`1,15,30,45 11,12 * * *`) posts the
   live date to the internal publish route. Publishing is idempotent. It revalidates
   `/daily-bread`, the dated URL and the archive.
3. **Emergency path.** GitHub runs at 11:05, 12:05 and 13:05 UTC build and publish
   if the date is still not published.
4. **Reader.** `/daily-bread` serves the current issue. After rollover it shows
   "on press" for up to 35 minutes, then yesterday's issue with a notice and a
   critical `last_known_good_served` log.

## Fallbacks

- **Editorial text:** Claude API → Claude Code CLI → OpenAI `gpt-5-mini` → Gemini
  `gemini-flash-lite-latest` → the deterministic floor. Quota and billing errors are
  not retried. Empty output and refusals are rejected before parsing.
- **Comic:** the week's approved strip → one reprint of an approved strip all week
  (not from the three weeks before, never a strip whose image file is shared) → no
  comic. A strip-bank failure omits the comic; the paper still publishes.
- **Scene:** WebGL scene → static poster → CSS texture → type only (forced colours,
  print, no WebGL).
- **Plates:** the day's generated plate → the series' own art → no plate. A missing
  image falls back to its alt text.
- **Publication:** today's issue → "on press" → last known good.

## Comic

**Root cause.** The comic never "failed to load"; no strip rows were being made. Six
causes are pinned in `__tests__/daily-bread-v2-comic-root-cause.test.ts`:

1. Gap-fill ran its tier probe before installing the Claude CLI.
2. A 15-minute timeout killed the weekly job before its strip step.
3. A tier-3 run broke the Sunday lead and skipped the strips.
4. Failure alerts could not file issues.
5. `generate-strip.mjs` named files by number, so No. 4 was written over the published
   No. 1's image.
6. `--force` could turn a printed strip back into a draft.

**Final behaviour.** Echo & Dust only, weekly, founder-approved. The first V2 build
replaced it with generic wordless SVG strips on 23 of 28 editions; that is removed.
The art style is undecided.

## Visual engine

- First-party WebGL scenes (Living Water, Grain, Wilderness Stars), with riso,
  halftone and ASCII renderers.
- Motion levels come from the archetype. A 30 fps cap, a DPR cap, a pause when off
  screen or with reduced motion, and context loss handling.
- No image model at request time.
- **Dependencies.** V2 added one package, `@electric-sql/pglite` 0.2.17 (Apache-2.0),
  for database tests. `aiscii` is not used. See `DEPENDENCIES-AND-LICENCES.md`.
- **Known failures.** The poster fails the measured print constraints
  (`VISUAL-ENGINE-CONSTRAINTS.md`), and the founder rated the shader animations "not
  great". Both wait on the scenes verdict.

## Security

- Service-role writes only, through SQL functions. All 9 pipeline functions are revoked
  from `anon` and `authenticated` (production probe: 0 of 9 callable).
- RLS allows public reads of published rows only. The publish endpoint needs an
  internal secret, a date window and a rate limit. Health and preview are admin-only.
- Generation provenance is private to the service role (migration `20260914000001`),
  **not yet applied to production**.
- Document validation rejects credential-shaped strings, script content, HTML,
  `javascript:` and `data:` links, and malformed characters. Links and assets are
  checked as safe.
- Logs are redacted. The bundle scan checks every client file for secret names and
  values, and a test forbids client components from importing secrets.

## Observability

- Structured logs for every stage (lock acquired → sources → assets → primary
  generation → comic → composition → validation → ready → published → cache
  revalidated), each attempt with an `attemptId`, and `attempt_completed` and
  `edition_published` metrics.
- A PublicationAttempt row per attempt: providers, fallback level, prompt versions,
  stage timings, module failures, cost.
- Health (`GET /api/admin/daily-bread/health`, `npm run daily-bread -- health`): latest
  published, latest failure, provider status, alert level. The CLI exits 1 on
  critical. CI alerts open an issue.
- Reader-side critical log when last known good is served.

## Migrations

| File | State |
| --- | --- |
| `supabase/migrations/20260913000001_daily_bread_v2.sql` | Applied to production 2026-09-13. Three tables (editions, revisions, attempts), nine functions. |
| `database/ROLLBACK-2026-09-13-daily-bread-v2.sql` | Tested; refuses without confirmation. |
| `supabase/migrations/20260914000001_daily_bread_v2_private_provenance.sql` | **Not applied.** Hides generation and lock columns and revisions from client roles. |

## Operations

- **Scheduler:** repository variable `DAILY_BREAD_V2_SCHEDULER=enabled`; the Worker
  Cron Trigger in `wrangler.jsonc`.
- **Commands:** `npm run daily-bread -- <command>`:
  - `build`, `publish`, `run`: pipeline steps; reruns are safe;
  - `health`: exits 1 on critical;
  - `e2e`, `fixtures`: offline pipeline checks and fixture data;
  - `backfill`, `reimport-backfill --from --to [--dry-run]`: archive import;
  - `repair-comics`, `repair-lead-plates`: corrections by revision;
  - `sunday-lead`, `guides` (with `--dry-run`): editorial drafts;
  - `bundle-scan`, `reservoir [--usage]`: audits.
- **Runbook:** `docs/runbooks/DAILY-BREAD-V2-RUNBOOK.md` covers each plan §89 scenario.
- **Rollback:** build and run with `DAILY_BREAD_V2=off`, or roll back the Worker version.

## External blockers

These are genuinely outside the code:

1. **CI build secret.** The repository has no `NEXT_PUBLIC_SUPABASE_ANON_KEY` secret. The
   permission classifier refused to store it.
2. **Claude subscription limit.** The Claude Code account is at its weekly limit until
   Sep 16, so the backup provider writes frames until then.
3. **OpenCode Zen.** The key exists locally, but a test generation was refused by the
   permission classifier, so whether it can generate is unverified.

These wait on founder decisions or approvals, not on external services:

- **Comic and scenes verdicts.** Comic style (`echo-dust-weekly-code-vs-codex`) and
  scenes (`daily-bread-scenes-a-vs-b`) have no verdict. The months of strips and the
  shader rework follow them.
- **Held production steps, in order.**
  1. Repoint strip No. 1's row.
  2. `reimport-backfill` Aug 18–Sep 12.
  3. `repair-comics` Sep 13–14.
  4. Rebuild Sep 15 (stored as `normal`; under the plan it is `fallback`).
  5. Apply migration `20260914000001`.
  6. Deploy, after the Workers preview output is approved.
  7. Push the branch to `main` (the classifier treats this as a production deploy).
- **Other decisions.**
  - Next.js 16.2.11 (critical advisory).
  - LCP options for plate-led pages.
  - `gpt-5-mini` or Zen as the backup.
  - OpenNext incremental cache.
  - Crimson or gold spot colour.
  - Site-wide soft-404 status.
  - The Monday release workflow deploy risk.

## Devotional safety

**Existing devotionals were not modified.** No file under `public/devotionals/` changed
in any of the 44 SA-142 commits (`git diff-tree` for each commit, 2026-09-14). V2 only
reads the corpus: `devotionalReferences()` reads 604 devotionals for rabbit-hole
threads.
