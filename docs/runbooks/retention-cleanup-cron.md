# Runbook — Anonymous-data retention cleanup cron

**Status:** GitHub Action wired and ready to run today.
Cloudflare Cron Trigger declared in `wrangler.jsonc` but inert until
OpenNext is wrapped with a `scheduled()` handler.
**Source-of-truth:** Master plan Section 0.7 + founder direction
2026-05-07 (morning deck).

This runbook explains the two paths, what's wired today, and how to
switch from path A → path B when OpenNext support lands.

---

## What the cleanup does

Calls `runRetentionCleanup()` (`src/lib/privacy/retention-cleanup.ts`)
which:

1. Finds all `user_sessions` rows where `user_id IS NULL` AND
   `last_active_at < (now - 30 days)`.
2. Cascade-deletes the session-token-keyed rows in
   `audit_runs`, `audit_options`, `audit_option_telemetry`,
   `consent_records`, `audit_selections`,
   `devotional_plan_instances`, `annotations`, `session_bookmarks`,
   `mock_account_sessions`.
3. Cascade-deletes plan-token-keyed rows in `devotional_plan_days`
   and `devotional_day_citations`.
4. Deletes the `user_sessions` rows themselves.

**Authenticated users are NEVER touched** — only rows where
`user_id IS NULL`. Authenticated deletions go through the explicit
`deleteUserAccount()` helper invoked from `/api/user/delete-account`.

The helper records partial failures rather than throwing; the
endpoint returns `{ ok: true, cleanup: { ...result } }` on success.

## Path A — GitHub Action (wired today)

`.github/workflows/retention-cleanup.yml` runs daily at 03:00 UTC
and on manual `workflow_dispatch`. It hits
`POST /api/admin/run-retention-cleanup` with the
`X-Internal-Secret` header.

### Setup

1. **Create the repo secret:**
   - GitHub repo → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `INTERNAL_ROUTE_SECRET`
   - Value: the same string you put on the Worker via
     `wrangler secret put INTERNAL_ROUTE_SECRET`

2. **Verify the workflow runs:**
   - Actions tab → Retention Cleanup → Run workflow → Run
   - Output should show `Status: 200` and a JSON body with
     `{ ok: true, cleanup: { ... } }`

3. **Monitor the daily run:** Actions tab shows each scheduled run.
   Failures send an email to the GitHub account owner.

### Disabling

To disable temporarily: Actions tab → Retention Cleanup → ⋮ →
Disable workflow.

To remove permanently: delete `.github/workflows/retention-cleanup.yml`.

## Path B — Cloudflare Cron Trigger (declared, not yet wired)

`wrangler.jsonc` declares:

```jsonc
"triggers": {
  "crons": ["0 3 * * *"]
}
```

This causes Cloudflare to fire a `scheduled()` event on the Worker
daily at 03:00 UTC. **However**, the OpenNext-generated worker
(`.open-next/worker.js`) only exports a `fetch` handler, not a
`scheduled` handler — so the event currently fires and is dropped.

### To wire it (when ready to do this work)

1. Create a wrapper Worker that re-exports OpenNext's `fetch` and
   adds a `scheduled()` handler. Sketch:

   ```ts
   // src/cron-worker-entry.ts
   // @ts-expect-error — generated at build time by opennextjs-cloudflare
   import openNextWorker from '../.open-next/worker.js'
   import { runRetentionCleanup } from './lib/privacy/retention-cleanup'

   export default {
     fetch: openNextWorker.fetch,
     async scheduled(_event, _env, ctx) {
       ctx.waitUntil(
         runRetentionCleanup().then((result) => {
           console.info('[cron] retention cleanup result:', result)
         }),
       )
     },
   }
   ```

2. Update the deploy pipeline:
   - Currently `npm run deploy` runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
   - Need to insert an esbuild step that bundles the wrapper and
     overrides `wrangler.jsonc.main` to point at the wrapper output.
   - Sketch (untested):
     ```bash
     opennextjs-cloudflare build
     npx esbuild src/cron-worker-entry.ts \
       --bundle \
       --platform=neutral \
       --format=esm \
       --outfile=.open-next/worker-with-cron.js
     # Then either: edit wrangler.jsonc.main → ".open-next/worker-with-cron.js"
     # OR: run wrangler deploy with explicit --main flag
     ```

3. Test locally with `wrangler dev --test-scheduled` then trigger
   via `curl http://localhost:8787/__scheduled?cron=0+3+*+*+*`.

4. Deploy. Verify in Cloudflare dashboard → Workers → euangelion →
   Triggers → Cron Triggers shows the schedule.

5. **Remove the GitHub Action** to avoid double-runs:
   `git rm .github/workflows/retention-cleanup.yml`.

### Why we didn't do this in the autonomous session

Modifying the deploy pipeline carries deploy-failure risk. The
autonomous session shipped the GitHub Action (works today, tested
shape) and declared the cron trigger (forward-compatible). The
founder approves the wrapper work as a small focused PR when
they're ready to verify the deploy still succeeds.

## Verification (either path)

After a run, query Supabase:

```sql
-- How many anonymous sessions remain that are older than 30 days?
SELECT COUNT(*)
FROM public.user_sessions
WHERE user_id IS NULL
  AND last_active_at < now() - interval '30 days';
-- Expected: 0
```

If non-zero after a successful run, check
`partial_failures` in the cleanup result for which table errored.

## Manual trigger

Path A: GitHub UI (Actions tab → Run workflow).

Path B (after wiring): `curl` from a Worker-trusted environment:

```bash
curl -X POST https://euangelion.app/api/admin/run-retention-cleanup \
  -H "X-Internal-Secret: <INTERNAL_ROUTE_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Body params (all optional):

- `windowDays`: override the 30-day default (testing only)
- `now`: ISO timestamp to treat as "now" (testing only)
