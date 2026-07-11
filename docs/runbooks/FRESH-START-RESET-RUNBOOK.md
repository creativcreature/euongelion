# Fresh Start — User-Data Reset Runbook

**Status:** Drafted 2026-07-10 for the custom-generation launch (brief §8).
**Script:** `scripts/ops/fresh-start-reset.mjs`
**Operator:** Founder only. This is never run by automation, CI, cron, or agents.

## What it does

Resets euangelion.app to a zero-user state before launch:

- **Purged:** all auth accounts, `public.users`, anonymous sessions, bookmarks,
  annotations, progress, Soul Audit runs/options/selections/consents, generated
  plan instances/days/citations, jobs, push subscriptions, mock-account
  sessions, daily counters, active/scheduled/archived series rows.
- **Untouched, always:** curated content (`series`, `devotionals`,
  `soul_audit_questions`, `generated_illustrations`), the `reference-library`
  storage bucket, all Stripe objects, and `soul_audit_cost_ledger` (spend
  accounting — pass `--include-cost-ledger` only if you want it gone too).
- **No tombstones, no blocklists:** auth users are hard-deleted
  (`shouldSoftDelete=false`), so any previously registered email — including
  yours — can sign up again as a brand-new account with zero residual state.

## Hard gates built into the script

1. Wipe refuses to run without a **verified** backup manifest (the backup step
   re-reads every archive file from disk, re-hashes it, and re-counts live rows
   before it will mark itself verified).
2. Wipe refuses if **any** live row count differs from the manifest — a stale
   backup aborts; re-run backup immediately before wiping.
3. Wipe refuses if the live database exposes any table the script has not
   classified as purge/keep (schema drift aborts instead of guessing).
4. If Stripe customers exist, wipe refuses until you have reviewed them
   (`stripe-review`) and passed `--stripe-reviewed`. The script never deletes
   or modifies anything on Stripe.
5. Wipe only runs in an interactive terminal and requires typing
   `FRESH START <supabase-host>` verbatim.
6. After deletion it re-counts everything and fails loudly if any user row
   survived.

## Procedure (run each step yourself, in order)

```bash
# 0. Confirm you are pointed at the right project
grep NEXT_PUBLIC_SUPABASE_URL .env.local

# 1. Backup + verification (writes backups/fresh-start-<timestamp>/, gitignored)
node scripts/ops/fresh-start-reset.mjs backup

# 2. Review Stripe customers (report only; decide dashboard-side)
node scripts/ops/fresh-start-reset.mjs stripe-review

# 3. Rehearse — shows exactly what would be deleted, deletes nothing
node scripts/ops/fresh-start-reset.mjs wipe --manifest backups/fresh-start-<ts>/manifest.json --dry-run

# 4. The real thing (add --stripe-reviewed if step 2 listed customers)
node scripts/ops/fresh-start-reset.mjs wipe --manifest backups/fresh-start-<ts>/manifest.json
```

Afterwards, walk the site as a first-time visitor (brief §9) and confirm a
previously used email signs up as a stranger.

## Recovery

The archive under `backups/` contains full JSON of every purged table plus all
auth users. There is no automated restore (deliberate — restoring auth users
recreates them with new instance-side state and should be a considered,
manual operation). If something goes wrong mid-wipe, the script aborts loudly;
the archive is your source for manual reinstatement via the Supabase dashboard
or a bespoke script.
