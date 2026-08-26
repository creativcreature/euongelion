# Claude Handoff — Euangelion Stabilization Audit

**Date:** 2026-07-28  
**Branch:** `codex/euangelion-stability-audit`  
**Repository:** `/Users/jamesparker/Documents/app-projects/external/euangelion`  
**Status:** Work in progress; changes are uncommitted and not deployed.

## Founder Request

Perform a comprehensive, evidence-driven audit and repair of the Euangelion web
app, beginning with the Daily Bread / Today bug:

- Activating a devotional must make it the durable source of truth.
- It must survive navigation, refreshes, normal rerenders, and relevant
  account/session changes.
- “Seeking the Kingdom of Heaven” or any other fallback may appear only when
  there is genuinely no active devotional.
- Diagnose the full activation → persistence → read → navigation → render path.
- Repair related high-confidence reliability problems without broad rewrites.
- Improve regression coverage and run the full checks/build/Workers preview.
- Deliver a final audit separating fixed, deferred, and founder-decision items.

The founder also requested Mobbin MCP pattern research. Mobbin was not available
in this Codex workspace after tool discovery. Equivalent interaction-pattern
research was done through current Calm and YouVersion documentation; do not
claim it was Mobbin research.

## Required Project Instructions

Read `AGENTS.md` and the production tracking spine before continuing. Most
important constraints:

1. Diagnose before fixing.
2. No silent fallbacks.
3. Do not invent placeholder behavior.
4. Update `CHANGELOG.md` and the relevant feature PRD.
5. Do not deploy until the Workers runtime has been exercised and the founder
   has reviewed the actual responses.
6. Before any push/deploy, verify GitHub and Cloudflare identities exactly as
   described in `AGENTS.md`.
7. Preserve unrelated user changes.

Skills used:

- `.agents/skills/euangelion-platform/SKILL.md`
- `.agents/skills/soul-audit-delivery/SKILL.md`
- `.agents/skills/docs-tracking-governance/SKILL.md`
- `.agents/skills/release-readiness/SKILL.md`

Decision / feature scope:

- `SA-023` — user-controlled active devotional and library
- `SA-032` — account-state resume
- `F-083` — Daily Bread active-series persistence

## Starting Repository State

`main` already contained a July 27 repair for the original Daily Bread failure:

- `84a65dcf` — persistence root cause repair
- `17328fa4` — migration 013 applied and verified in production
- `c971711c` — auth refresh restored through edge middleware
- `183cddfc` — account-owned plan resume
- `7782fde3` — TODAY navigation changed from `/today` to `/daily-bread`

The repository’s existing F-083 documentation records two original root causes:

1. Migration `013_create_active_series.sql` had not been applied to production,
   so `active_series`, `scheduled_series_swap`, and `archived_series` did not
   exist. The repository wrote only to Workers-isolate memory and swallowed the
   failed Supabase write, producing fake success that vanished on reload.
2. Removing the old proxy also removed the only persistable Supabase session
   refresh. After access-token expiry, Server Component renders became
   auth-blind and ignored the user’s `active_series`, falling through to an old
   Soul Audit plan or empty-state devotional.

Those repairs were already on `main`. This pass audited their remaining gaps
rather than assuming they were complete.

### Pre-existing unrelated working-tree state

The following existed before this stabilization work and must not be reverted:

- `src/data/devotional-teasers.ts` was already modified.
- `.agents/`, `.codex/`, and `AGENTS.md` were untracked.

The teaser file is generated and has a very large formatting/content diff. Its
SHA-256 before and after build was identical:

`664a313281931d9ed08f86e9c28aafc4d10652a065dfe2d696f454b9af67a885`

Do not include or discard it casually. Confirm ownership/scope with the founder
before committing.

## Architecture Map — Active Devotional

### Activation

User actions in:

- `src/components/devotional/DevotionalActions.tsx`
- `src/components/devotional/SeriesActions.tsx`
- `src/components/LibraryView.tsx`

call:

- `src/stores/devotionalLibraryStore.ts` → `start()`
- `PUT /api/devotionals/active`
- `src/lib/library/repository.ts` → `replaceActiveSeries()` /
  `setActiveSeries()`
- Supabase table `public.active_series`, keyed by `user_id`

### Progress

Day navigation calls:

- `PATCH /api/devotionals/active`
- `updateActiveSeriesDay()`
- persists `current_day`

### Primary read/render

`src/app/daily-bread/page.tsx`:

1. resolves authenticated user;
2. promotes a due scheduled swap;
3. reads `active_series`;
4. if active exists, renders `CuratedActiveView`;
5. only if active is confirmed absent, resolves account-owned or anonymous Soul
   Audit plan;
6. only if neither exists, renders `EmptyState`.

### Secondary “current plan” consumers

`GET /api/soul-audit/current` feeds:

- `src/hooks/useActivePlan.ts`
- header/resume badge surfaces
- `TodayReturningBand`
- onboarding resume behavior

Before this pass, this endpoint ignored `active_series` and resolved only Soul
Audit history, so it could disagree with `/daily-bread`.

### Navigation

Current primary TODAY destinations:

- desktop header → `/daily-bread`
- mobile tab bar → `/daily-bread`
- old `/my-devotional` → query-preserving redirect to `/daily-bread`

The separate `/today` route is an editorial date rotation and remains available
as “Today’s Edition” in the footer.

## Additional Root Causes Found in This Pass

### 1. Read errors still impersonated “no active devotional”

`src/lib/library/repository.ts` returned `null` or `[]` for:

- Supabase query errors;
- network exceptions;
- table/configuration problems.

`src/app/daily-bread/page.tsx` then caught active-series/auth read failures and
returned `null`, allowing the page to fall through to the old Soul Audit plan or
empty state.

This meant the July 27 write repair was incomplete: transient read/auth failure
could still reproduce the visible symptom.

### 2. Workers-isolate cache still overrode canonical cross-device state

`getActiveSeries()` and `getScheduledSwap()` returned cached rows before querying
Supabase. A long-lived isolate could therefore resurrect a devotional or swap
that had been changed/cleared on another device.

`listArchivedSeries()` merged cached rows with Supabase rows, so a row deleted on
another device could never disappear from that isolate.

### 3. “Current plan” surfaces had a different source of truth

`GET /api/soul-audit/current` ignored `active_series`. Header and returning-user
surfaces could advertise an older “Seeking the Kingdom of Heaven” Soul Audit
plan while `/daily-bread` correctly rendered the manually selected series.

### 4. Client refresh converted outages into empty state

`devotionalLibraryStore.refresh()` mapped any non-2xx active/library/archive
response to `null` or `[]`. A transient 500 made the active devotional disappear
from client surfaces.

Network errors also escaped the store action entirely, leading to fragile or
silent UI behavior.

### 5. Active-plan client cache could become permanently wrong

`useActivePlan` cached failed API reads as `{ hasCurrent: false }`. It also left
the module-level `inflight` promise stuck as a rejected promise when the fetch
failed before its old `finally` block.

Library activation/progress mutations did not invalidate this cache.

### 6. Daily Bread’s apparent API coverage was fake

`__tests__/daily-bread-api.test.ts` was 329 lines of manually constructed
“expected” objects for four endpoints that do not exist:

- `/api/daily-bread/state`
- `/api/daily-bread/activate`
- `/api/daily-bread/replace-slot`
- `/api/daily-bread/switch-current`

It imported no real handlers and could not catch a regression. Some performance
and security test fixtures still reference this abandoned three-slot design.

### 7. Test suite had an animation teardown race

All assertions passed, but the full suite exited nonzero with nine unhandled
GSAP dynamic-import errors after jsdom teardown. Components rendered without the
global animation provider defaulted to `shouldAnimate: true`, starting imports in
isolated tests.

## Changes Implemented

### `src/lib/library/repository.ts`

- Added `LibraryReadError`.
- Supabase read errors now throw instead of returning absence.
- `getActiveSeries()` always queries canonical Supabase state.
- `getScheduledSwap()` always queries canonical Supabase state.
- Confirmed absence evicts the corresponding isolate cache entry.
- `listArchivedSeries()` now replaces cache from canonical results rather than
  merging and resurrecting removed rows.
- Existing write rollback / `LibraryPersistenceError` behavior remains intact.

Important nuance: when Supabase environment variables are wholly absent,
repository reads still return empty for local/test compatibility. In a real
signed-in runtime, `getUser()` requires Supabase first. Review whether a future
platform pass should also make missing production env explicit.

### `src/app/daily-bread/page.tsx`

- `resolveUserActiveSeries()` now rethrows read/auth errors.
- `resolveOwnerPlan()` now rethrows read/auth errors.
- Only a successful `null` read can reach a fallback.
- Failures go to the application error boundary instead of displaying unrelated
  devotional content.

### `src/app/api/soul-audit/current/route.ts`

- Resolves the authenticated user’s active series first.
- Promotes scheduled swaps through the existing helper.
- `active_series` wins unconditionally over older Soul Audit history.
- Returns:
  - `route: "/daily-bread"`
  - `selectionType: "active_series"`
  - canonical `seriesSlug`, title, and persisted `dayNumber`
- Throws on a database/auth read failure instead of returning
  `hasCurrent: false`.
- Throws if an active database slug no longer exists in `SERIES_DATA`, exposing
  corrupt state instead of hiding it.

### `src/stores/devotionalLibraryStore.ts`

- Network exceptions become explicit failed results instead of escaping.
- `refresh()` retains the last confirmed state on network/5xx failure.
- State clears only on:
  - successful response confirming no data; or
  - confirmed 401 anonymous state.
- `lastError` records failed refresh information.
- Successful start, restart, clear, and progress updates emit
  `soulAuditPlanChanged`, invalidating dependent resume surfaces.

### `src/hooks/useActivePlan.ts`

- Added `active_series` selection type.
- Added `cache: "no-store"`.
- Non-2xx reads are not cached as “no plan.”
- `inflight` always clears in `finally`, including network failures.
- Transient failure retains the hook’s last known value rather than rewriting it
  to absence.

### `src/providers/AnimationProvider.tsx`

- Context default changed from animation-on to static progressive enhancement.
- Production still opts into animation through the real provider.
- Isolated renders no longer trigger GSAP imports after environment teardown.

### Tests

`__tests__/daily-bread-api.test.ts` now tests real code:

- authenticated active read;
- confirmed empty vs failed read;
- anonymous 401;
- successful activation;
- honest 503 on failed persistence;
- persisted day progress;
- client store retains active state on 500;
- client store clears state on confirmed 401.

`__tests__/library-repository-persistence.test.ts` adds:

- Supabase read failure throws `LibraryReadError`;
- confirmed no-row returns `null`;
- canonical reread evicts stale isolate state.

`__tests__/soul-audit-current-route.test.ts` adds:

- user-controlled active series beats older Soul Audit plan;
- current day and `/daily-bread` route are returned.

### Tracking/documentation

Updated:

- `CHANGELOG.md`
- `docs/feature-prds/F-083.md`
- `docs/PRODUCTION-10-10-PLAN.md`
- `docs/PRODUCTION-COMPACTION-HANDOFF.md`

No score increase was claimed. Daily-home quality remains 8/10 pending signed-in
runtime/device proof.

## Verification Evidence

### Focused regressions

Command:

```bash
npm test -- --run \
  __tests__/daily-bread-api.test.ts \
  __tests__/library-repository-persistence.test.ts \
  __tests__/soul-audit-current-route.test.ts \
  __tests__/today-returning-band.test.tsx \
  __tests__/mobile-tab-bar.test.tsx \
  __tests__/navigation-routing-shell.test.ts
```

Result:

- 6 test files passed
- 85 tests passed

### Full suite

Initial full run:

- 136 files and all 1,758 assertions passed;
- Vitest exited 1 because of nine GSAP environment-teardown errors.

After the animation-provider repair:

- 136 test files passed
- 1,758 tests passed
- 13 skipped
- clean exit code 0

One jsdom informational message remains:

`Not implemented: navigation to another Document`

It does not fail the suite.

### Type and lint

```bash
npm run type-check
npm run lint
```

Result:

- type-check passed;
- lint passed with six existing warnings and zero errors.

Existing warnings observed:

1. unused `getSelectionWithFallback` in Soul Audit select route;
2. raw `<img>` warning in devotional reader;
3. missing React hook dependency in Bible 365 page;
4. unused `computedModules` in `CuratedActiveView`;
5. unused `_isDayUnlockedOriginal`;
6. unused `PlanRecord`.

These were not broadly cleaned up because only the animation warning manifested
as a failing reliability gate.

### Governance

All passed:

```bash
npm run verify:production-contracts
npm run verify:tracking
npm run verify:feature-prds
npm run verify:feature-prd-link
npm run verify:governance-alignment
npm run verify:methodology-traceability
npm run verify:folder-structure
npm run verify:appstore-gate
```

### Production build

The first build failed while Next attempted to remove a stale
`.next/server/app` directory (`ENOTEMPTY`). The stale `.next` directory was moved
recoverably to `/tmp`, then the clean build passed.

Successful command:

```bash
npx next build --webpack
```

Result:

- exit code 0;
- 707 static pages generated;
- `/daily-bread` dynamic;
- active/current APIs included.

The full `npm run build` generation steps reported:

- artwork manifest loaded 0 artworks;
- generated teaser file remained byte-identical;
- `src/data/artwork-manifest.ts` had no tracked diff.

The zero-artwork report should be investigated separately because the repository
instructions describe a large image library. It did not change tracked output in
this session.

### Cloudflare Workers preview

`npm run preview` successfully:

- built Next;
- generated the OpenNext bundle;
- started Wrangler at `http://localhost:8787`.

Anonymous probes:

1. `GET /api/devotionals/active`
   - `401 AUTH_REQUIRED`
   - explicit error and request ID
2. `GET /api/soul-audit/current`
   - `200`
   - `{ "ok": true, "hasCurrent": false, ... }`
3. `GET /daily-bread`
   - `200`
   - no-store/private response
   - desktop TODAY and DAILY BREAD both point to `/daily-bread`
   - mobile TODAY points to `/daily-bread`
4. `GET /library`
   - `200`

Wrangler log:

```text
GET /api/devotionals/active 401 Unauthorized
GET /daily-bread 200 OK
GET /library 200 OK
GET /api/soul-audit/current 200 OK
```

The preview was stopped cleanly.

### Signed-in verification not completed

No test account/session was available in this task context. Do not claim the
signed-in end-to-end flow has been manually proven in Workers preview.

Automated coverage proves the branches, but the following remains mandatory:

1. sign in;
2. activate a known series;
3. verify `PUT /api/devotionals/active` response;
4. open `/daily-bread`;
5. navigate away and back using TODAY;
6. hard-refresh at least twice;
7. change day and refresh;
8. sign out;
9. sign back in and confirm account resume;
10. if possible, confirm on a second browser/device.

Capture full endpoint responses per `AGENTS.md`. Do not deploy until the founder
has reviewed them.

## Pattern Research

Mobbin was unavailable. Current external references used:

- Calm separates daily content, sequential-program progress, favorites, and
  history. Program progress is resolved from the program itself rather than a
  favorite entry.
- YouVersion account state syncs reading progress across devices.
- YouVersion’s “Catch Me Up” moves “today” to the next unread day without
  fabricating completions.

Useful URLs:

- https://support.calm.com/hc/en-us/articles/115002582928-How-to-Unlock-the-Next-Session-in-a-Sequential-Program
- https://support.calm.com/hc/en-us/articles/360000113813-How-to-Listen-to-Past-Daily-Sessions
- https://help.youversion.com/l/en/article/7de8qv7xuc-catch-me-up-on-android
- https://help.youversion.com/l/en/article/uyt8ppdl9c-bal-account

Applied principle: one explicit active/current source, persisted account
progress, separate history/library semantics, and no invented completion or
fallback state.

## Fixed Issues

1. Active-series read errors no longer become false absence.
2. Daily Bread no longer falls through after auth/database read failure.
3. Cross-device active/swap/archive state no longer loses to isolate cache.
4. Current-plan/resume surfaces now agree with Daily Bread.
5. Client refresh does not erase last confirmed state during an outage.
6. Current-plan cache retries after failure and invalidates after mutations.
7. Fake Daily Bread endpoint tests replaced with executable tests.
8. GSAP teardown race removed; full suite now exits cleanly.

## Deferred Issues

### P0/P1 — Soul Audit repository silent-fallback architecture

`src/lib/soul-audit/repository.ts` explicitly documents and implements:

- swallowed Supabase writes;
- read errors returned as `null` / `[]`;
- in-memory Workers-isolate fallback as operational state.

This is the same failure class as the original Daily Bread bug across audit runs,
options, consent, selections, plan instances, days, annotations, bookmarks, and
telemetry. It is a broad platform migration, not a safe incidental patch.

Recommended next phase:

1. inventory every exported repository method and caller;
2. classify operations as durable-required vs genuinely ephemeral;
3. introduce explicit read/write result types or typed persistence errors;
4. update routes to return honest 5xx/retry states;
5. remove cache-first authority from durable entities;
6. add failure-injection tests;
7. migrate one entity group at a time.

### P1 — Stale test/config contracts

Performance and security test fixtures still name retired three-slot endpoints:

- `/api/daily-bread/state`
- `/api/daily-bread/activate`
- `/api/daily-bread/replace-slot`
- `/api/daily-bread/switch-current`

Rewrite them against:

- `/api/devotionals/active`
- `/api/devotionals/archive`
- `/api/devotionals/archive/restart`
- `/api/devotionals/saved`

Do not merely delete the fixtures; preserve the intended security/performance
coverage against real routes.

### P1 — Signed-in runtime/device evidence

Still required before production-ready claims.

### P2 — Next middleware/proxy compatibility

Next 16 warns that `middleware.ts` is deprecated. The repository documents a
deliberate exception: `proxy.ts` is Node-runtime-only, while the current
OpenNext/Cloudflare adapter rejects Node middleware. The Workers build currently
passes with `middleware.ts`.

Monitor Next/OpenNext support and migrate only when Cloudflare-compatible
session refresh is proven. Do not follow the deprecation warning blindly.

### P2 — Build cache fragility

Multiple consecutive builds can fail with:

`ENOTEMPTY: directory not empty, rmdir .next/server/app`

Investigate whether a watcher/build process or Next 16 cleanup race is leaving
files behind. The safe workaround used here was moving `.next` to a uniquely
named `/tmp` directory before rebuilding.

### P2 — Artwork generator discovers zero files

The generator reports zero artwork despite project documentation describing
thousands of images. Determine whether the image library is absent in this
worktree, ignored, or the generator’s discovery roots are stale. No tracked
manifest change occurred in this pass.

### P2 — Existing lint warnings

Review the six warnings listed above. The Bible 365 hook dependency may be
functional rather than cosmetic and deserves focused analysis.

## Needs Founder Decision

1. **Signed-in test identity:** which safe test account/session should be used
   for Workers-preview and cross-device verification?
2. **Commit scope:** should the pre-existing generated
   `src/data/devotional-teasers.ts` change be included, excluded, or handled in a
   separate commit?
3. **Soul Audit persistence migration:** approve a staged removal of the
   repository’s in-memory/silent-fallback contract. This materially changes
   failure behavior across the core product and should be explicit.
4. **Mobbin:** if Mobbin evidence remains mandatory, connect/install the Mobbin
   integration and run a focused pattern review before final UX recommendations.

## Current Git State

Modified by this stabilization pass:

- `CHANGELOG.md`
- `__tests__/daily-bread-api.test.ts`
- `__tests__/library-repository-persistence.test.ts`
- `__tests__/soul-audit-current-route.test.ts`
- `docs/PRODUCTION-10-10-PLAN.md`
- `docs/PRODUCTION-COMPACTION-HANDOFF.md`
- `docs/feature-prds/F-083.md`
- `src/app/api/soul-audit/current/route.ts`
- `src/app/daily-bread/page.tsx`
- `src/hooks/useActivePlan.ts`
- `src/lib/library/repository.ts`
- `src/providers/AnimationProvider.tsx`
- `src/stores/devotionalLibraryStore.ts`

Pre-existing/unrelated:

- `src/data/devotional-teasers.ts`
- `.agents/`
- `.codex/`
- `AGENTS.md`

This handoff:

- `CLAUDE-HANDOFF-2026-07-28.md`

`git diff --check` was clean immediately before this handoff was created.

## Exact Continuation Order

1. Read `AGENTS.md`.
2. Read this handoff.
3. Read:
   - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
   - `docs/production-decisions.yaml`
   - `docs/feature-prds/F-083.md`
   - the new top entry in `CHANGELOG.md`
4. Inspect `git status` and preserve unrelated changes.
5. Review the stabilization diff file by file.
6. Re-run:

```bash
npm run type-check
npm run lint
npm test
npm run verify:production-contracts
npm run verify:tracking
npm run verify:feature-prds
npm run verify:feature-prd-link
npm run verify:governance-alignment
npm run verify:methodology-traceability
npm run verify:folder-structure
npm run verify:appstore-gate
npm run build
```

7. Perform signed-in Workers-preview verification and record full responses.
8. Update the F-083 acceptance checklist and compaction snapshot with that
   evidence.
9. Present the founder with:
   - root cause;
   - exact changes;
   - fixed/deferred/decision lists;
   - verification evidence;
   - prioritized next-phase stabilization plan.
10. Do not commit/push/deploy without explicit scope confirmation and all
    account checks required by `AGENTS.md`.

## Recommended Final Report Position

The correct conclusion is not “Daily Bread was one bug.” It was a chain of
conflicting truth models:

1. missing production schema;
2. memory-only writes reported as success;
3. expired auth made server reads user-blind;
4. navigation sent TODAY to a different editorial product;
5. read failures still became false absence;
6. secondary resume surfaces ignored `active_series`;
7. client caches converted outages into empty state;
8. tests asserted an abandoned architecture.

This pass repaired items 5–8 and verified the anonymous Workers/runtime path.
Items 1–4 were already repaired on `main`. Signed-in runtime proof is the last
gate for F-083; the larger Soul Audit persistence layer is the highest-priority
next stabilization program.
