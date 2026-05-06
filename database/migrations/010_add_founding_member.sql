-- Migration 010: Founding Member program
-- Date: 2026-05-05
-- Source-of-truth: master plan Section 0.2 (founder-locked 2026-05-03)
-- Companion docs:
--   docs/copy-specs/pricing-page-spec.md
--   docs/copy-specs/stripe-alignment-audit-2026-05-05.md
--
-- Schema rationale:
--
-- Founding Member is a status applied to the FIRST 500 users to claim a
-- paid annual subscription, locked at the moment of claim. Per the
-- founder direction, the badge persists even if the user later cancels
-- their subscription. Storing a TIMESTAMPTZ (vs a boolean) gives us:
--   1) deterministic ordering (first 500 by claim time)
--   2) "Founding member since Feb 2026" in profile copy if desired
--   3) audit trail for refunds / disputes
--
-- Concurrency: setting founding_member_at uses an atomic conditional
-- UPDATE (see src/lib/billing/founding-member.ts) that only writes when
-- the current count is < 500. Two simultaneous subscriptions at slot
-- 500 will see one win the row update; the other will have its column
-- left null. No row is ever bumped out once set.

-- ─── 1. Add the column ─────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS founding_member_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.founding_member_at IS
  'Timestamp at which the user claimed Founding Member status (first 500 paid annual subscribers per master plan Section 0.2). NULL = not a founding member. Set ONCE at first annual subscription via the Stripe lifecycle webhook; never unset, even on cancellation.';

-- ─── 2. Index for the count query ──────────────────────────────────
-- Page-load query: SELECT COUNT(*) FROM users WHERE founding_member_at IS NOT NULL.
-- Cap is 500 so the partial index stays tiny and fast.

CREATE INDEX IF NOT EXISTS idx_users_founding_member
  ON public.users(founding_member_at)
  WHERE founding_member_at IS NOT NULL;

-- ─── 3. Constraint: cap at 500 (defense in depth) ──────────────────
-- The application enforces the 500 limit via the conditional UPDATE,
-- but a CHECK constraint at the DB level catches any future bug that
-- bypasses the helper. We do this via a deferred constraint trigger
-- rather than a CHECK because CHECK can't reference table-level state.

CREATE OR REPLACE FUNCTION enforce_founding_member_cap()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Only enforce when the column transitions to non-null.
  IF NEW.founding_member_at IS NOT NULL
     AND (OLD.founding_member_at IS NULL OR TG_OP = 'INSERT') THEN
    SELECT COUNT(*) INTO current_count
    FROM public.users
    WHERE founding_member_at IS NOT NULL
      AND id <> NEW.id;
    IF current_count >= 500 THEN
      RAISE EXCEPTION 'Founding Member cap of 500 reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_founding_member_cap ON public.users;
CREATE TRIGGER trg_enforce_founding_member_cap
  BEFORE INSERT OR UPDATE OF founding_member_at ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_founding_member_cap();

-- ─── 4. RLS: read-only for the count query ─────────────────────────
-- The /api/billing/founding-member-count endpoint runs server-side
-- via the service role, so existing RLS policies on public.users
-- already cover it. No new policy needed.
