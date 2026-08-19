-- ═══════════════════════════════════════════════════════════════════════
--  EUANGELION — RUN THIS WHOLE FILE ONCE, IN THE SUPABASE SQL EDITOR
--  Prepared 2026-08-18 for founder application. SA-090 / F-136.
--
--  WHAT THIS DOES — four migrations, in order:
--    1. Custom generation entitlements (Stripe columns, webhook idempotency)
--    2. Admin role column
--    3. Credit packs + gift codes
--    4. NEW: edition_items — the Daily Bread edition engine
--
--  1-3 have been sitting UNAPPLIED in production since July. Their absence
--  is silent: readUserBillingState selects columns that do not exist, fails
--  closed, and every signed-in user reads as free tier. Nothing looks broken,
--  which is why it survived this long.
--
--  SAFETY: every statement is idempotent and additive — ADD COLUMN IF NOT
--  EXISTS, CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS. There is
--  not a single DROP of a table or column. Running it twice is harmless.
--  Running it does NOT flip GENERATION_GATE_LIVE — that stays a separate
--  environment switch.
--
--  EXPECTED RESULT: "Success. No rows returned."
-- ═══════════════════════════════════════════════════════════════════════



-- ═══ 20260710000001_custom_generation_entitlements ═══════════════════════════════════════

-- Custom Generation entitlements — SA-026 / SA-027 / SA-028 (founder-ratified 2026-07-10)
--
-- 1. public.users becomes the single source of truth for subscription state
--    (SA-028): Stripe identifiers, subscription status/renewal, one-time-term
--    expiry, and the one-time free-generation grant (SA-026).
-- 2. stripe_webhook_events: processed-event idempotency store (brief §12.1).
-- 3. soul_audit_jobs: formalizes the previously live-only table (created
--    manually in production, cast as `any` in code) so fresh environments and
--    the repo schema agree. IF NOT EXISTS makes this a no-op in production.

-- ---------------------------------------------------------------------------
-- 1. users: subscription state + free generation grant
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS free_generation_used_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.stripe_customer_id IS
  'Stripe Customer id (cus_…). Written at checkout-session creation and by webhooks. Customer↔user mapping is by this id, never by email match (SA-028).';
COMMENT ON COLUMN public.users.stripe_subscription_id IS
  'Current Stripe Subscription id (sub_…), null when no subscription has existed.';
COMMENT ON COLUMN public.users.subscription_status IS
  'Raw Stripe subscription status (active|trialing|past_due|canceled|…) as of the last verified webhook.';
COMMENT ON COLUMN public.users.subscription_renews_at IS
  'current_period_end of the active subscription; drives "renews [date]" UI.';
COMMENT ON COLUMN public.users.premium_expires_at IS
  'Term expiry for one-time plans (premium_2year/premium_3year). Premium is active while now() < premium_expires_at even with subscription_tier=free.';
COMMENT ON COLUMN public.users.free_generation_used_at IS
  'SA-026: every verified account gets exactly 1 free custom generation. NULL = unused. Set atomically (WHERE … IS NULL) when the free generation is consumed.';

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_key
  ON public.users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_stripe_subscription_id_idx
  ON public.users (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Webhook idempotency store (service-role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Processed Stripe webhook event ids (replay safety, brief §12.1). Rows recorded after successful dispatch; handlers stay idempotent for at-least-once delivery.';

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: deny-by-default; only the service role touches this table.

-- ---------------------------------------------------------------------------
-- 3. soul_audit_jobs — formalize the live-only table (no-op in production)
--    Shape mirrors JobRecord in src/types/soul-audit-plan.ts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.soul_audit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL,
  session_id TEXT,
  plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'complete', 'error', 'stalled')),
  progress TEXT,
  current_day INTEGER,
  total_days INTEGER NOT NULL DEFAULT 7,
  theme TEXT,
  scripture_anchor TEXT,
  user_input TEXT,
  timezone TEXT,
  timezone_offset_minutes INTEGER,
  error TEXT,
  generating_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS soul_audit_jobs_plan_id_idx
  ON public.soul_audit_jobs (plan_id);
CREATE INDEX IF NOT EXISTS soul_audit_jobs_session_id_idx
  ON public.soul_audit_jobs (session_id);
CREATE INDEX IF NOT EXISTS soul_audit_jobs_status_idx
  ON public.soul_audit_jobs (status);

ALTER TABLE public.soul_audit_jobs ENABLE ROW LEVEL SECURITY;
-- No policies: deny-by-default; job reads/writes go through service-role
-- repository code which scopes by session/user server-side.


-- ═══ 20260711000001_admin_role ═══════════════════════════════════════

-- Admin role on the user row (custom-generation brief §9, F-077).
--
-- Real gating, not obscurity: the role lives in the database, is set
-- MANUALLY by the founder (no UI or API path can grant it), and every
-- admin endpoint verifies it server-side on each call — non-admins
-- receive 404, indistinguishable from a missing route. This is
-- independent of (and in addition to) the ADMIN_EMAIL_ALLOWLIST env
-- used by the existing admin pages.
--
-- Grant (founder, SQL editor only):
--   UPDATE public.users SET role = 'admin' WHERE email = '<founder email>';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.users.role IS
  'Server-side authorization role. Granted manually in the DB only — no UI/API path may write it. Checked per-request; non-admins get 404.';


-- ═══ 20260712000001_credits_gift_codes ═══════════════════════════════════════

-- Phase 2: credit packs + gift codes (SA-027, founder-ratified 2026-07-10).
--
-- Credits are a durable, auditable balance: the spendable number lives on
-- public.users (atomic conditional decrement, same pattern as the SA-026
-- free grant) and EVERY movement is journaled in generation_credit_ledger.
-- Gift codes store hashes only (brief §12.3): ≥12-char random codes,
-- sha256 at rest, constant-time comparison in the redeem route, multi-use
-- via uses_remaining with per-user redemption uniqueness.

-- ---------------------------------------------------------------------------
-- 1. Spendable balance
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS generation_credits INTEGER NOT NULL DEFAULT 0
    CHECK (generation_credits >= 0);

COMMENT ON COLUMN public.users.generation_credits IS
  'Spendable custom-generation credits (SA-027 path 3/6). Purchased via credit packs or redeemed gift codes; consumed atomically at plan creation (WHERE generation_credits > 0). Never expires. Every movement is journaled in generation_credit_ledger.';

-- ---------------------------------------------------------------------------
-- 2. Audit ledger (service-role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generation_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL
    CHECK (reason IN ('pack_purchase', 'gift_redemption', 'consume', 'refund', 'founder_grant')),
  stripe_event_id TEXT,
  gift_code_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A Stripe event may grant credits at most once (belt-and-braces on top of
-- the stripe_webhook_events idempotency store).
CREATE UNIQUE INDEX IF NOT EXISTS generation_credit_ledger_stripe_event_key
  ON public.generation_credit_ledger (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS generation_credit_ledger_user_idx
  ON public.generation_credit_ledger (user_id, created_at DESC);

ALTER TABLE public.generation_credit_ledger ENABLE ROW LEVEL SECURITY;
-- No policies: deny-by-default; service-role writes only.

-- ---------------------------------------------------------------------------
-- 3. Gift codes (hashes only) + per-user redemption uniqueness
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gift_codes (
  code_hash TEXT PRIMARY KEY,
  credits INTEGER NOT NULL CHECK (credits > 0),
  uses_remaining INTEGER NOT NULL CHECK (uses_remaining >= 0),
  purchaser_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_redeemed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.gift_codes IS
  'Sponsor/gift codes (SA-027 path 6). Plaintext codes are shown ONCE at creation and never stored — only sha256 hashes. Redemption copy: "Someone covered your edition."';

CREATE TABLE IF NOT EXISTS public.gift_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL REFERENCES public.gift_codes(code_hash) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code_hash, user_id)
);

ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_code_redemptions ENABLE ROW LEVEL SECURITY;
-- No policies: deny-by-default; service-role only.

-- ---------------------------------------------------------------------------
-- 4. Atomic redemption (one round trip: code check + decrement + credit +
--    journal + per-user uniqueness, all-or-nothing)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_gift_code(
  p_code_hash TEXT,
  p_user_id UUID
) RETURNS TABLE (credits_added INTEGER, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  -- Lock the code row; fail closed on anything unexpected.
  SELECT gc.credits INTO v_credits
  FROM public.gift_codes gc
  WHERE gc.code_hash = p_code_hash
    AND gc.uses_remaining > 0
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_exhausted_code';
  END IF;

  -- One redemption per user per code (unique constraint backs this up).
  INSERT INTO public.gift_code_redemptions (code_hash, user_id)
  VALUES (p_code_hash, p_user_id);

  UPDATE public.gift_codes
  SET uses_remaining = uses_remaining - 1,
      last_redeemed_at = now()
  WHERE code_hash = p_code_hash;

  UPDATE public.users
  SET generation_credits = generation_credits + v_credits
  WHERE id = p_user_id;

  INSERT INTO public.generation_credit_ledger (user_id, delta, reason, gift_code_hash)
  VALUES (p_user_id, v_credits, 'gift_redemption', p_code_hash);

  RETURN QUERY
  SELECT v_credits, u.generation_credits
  FROM public.users u
  WHERE u.id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_gift_code(TEXT, UUID) FROM PUBLIC;
-- Only the service role (which bypasses RLS and owns the schema) calls this.


-- ═══ 20260818000001_create_edition_items ═══════════════════════════════════════

-- The Daily Bread edition engine — SA-090 / F-136 (founder-directed 2026-08-18)
--
-- One table holds every section of every edition. A "kind" is a section of the
-- paper; a "slot" is the ordinal within a kind for the sections that run more
-- than one entry per edition (guides, screening room).
--
-- WHY A TABLE AND NOT A COMMITTED FILE. Cloudflare Cron is inert in this
-- project (wrangler.jsonc triggers.crons commented out; the OpenNext worker
-- exports only `fetch`), and auto-deploy on push to main is not reliably
-- firing. Any design where tomorrow's paper requires a deploy inherits this
-- project's most failure-prone operation every single day. Rows publish
-- without a commit and without a deploy.

CREATE TABLE IF NOT EXISTS public.edition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which section of the paper this is.
  kind TEXT NOT NULL CHECK (kind IN (
    'lead', 'rail', 'season',
    'word', 'practice', 'guide',
    'strip',
    'crossword', 'unscramble', 'quiz',
    'gallery', 'screening',
    'prayer', 'witness', 'letter', 'notice'
  )),

  -- The edition this belongs to, in UTC. Two readers opening the paper on the
  -- same morning read the same edition; that property is what makes it an
  -- edition rather than a feed.
  publish_date DATE NOT NULL,

  -- Ordinal within a kind, for kinds that run several entries per edition.
  slot INTEGER NOT NULL DEFAULT 0 CHECK (slot >= 0),

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'published', 'rejected')),

  -- Section-shaped content, validated in TypeScript by the per-kind guards in
  -- src/lib/edition/kinds.ts before it is ever written.
  payload JSONB NOT NULL,

  -- Attribution. A dispatch without attribution is a rumour (F-098), so for
  -- third-party kinds these are enforced NOT NULL by the CHECK below rather
  -- than left to convention.
  source_name TEXT,
  source_url TEXT,

  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Third-party content must carry its source. This is the invention line,
  -- expressed as a constraint.
  CONSTRAINT edition_items_third_party_needs_source CHECK (
    kind <> 'screening'
    OR (source_name IS NOT NULL AND source_url IS NOT NULL)
  )
);

-- One entry per (section, day, ordinal).
CREATE UNIQUE INDEX IF NOT EXISTS edition_items_kind_date_slot_key
  ON public.edition_items (kind, publish_date, slot);

-- The read path: assemble one edition by date.
CREATE INDEX IF NOT EXISTS edition_items_published_idx
  ON public.edition_items (publish_date, kind)
  WHERE status = 'published';

-- The review queue: everything waiting on the founder, oldest first.
CREATE INDEX IF NOT EXISTS edition_items_draft_idx
  ON public.edition_items (publish_date, kind)
  WHERE status = 'draft';

COMMENT ON TABLE public.edition_items IS
  'Sections of The Daily Bread, one row per (kind, publish_date, slot). SA-090/F-136. Deterministic kinds (prayer, word, puzzles, gallery, season, witness) are computed from the corpus and lexicon already in the repo and write in as approved; invented voice and third-party items land as draft and pass the review queue.';

ALTER TABLE public.edition_items ENABLE ROW LEVEL SECURITY;

-- The paper is public, but ONLY what has actually been published. Drafts are
-- invisible to anon and authenticated alike; the review queue reads through
-- the service role.
DROP POLICY IF EXISTS edition_items_public_read_published ON public.edition_items;
CREATE POLICY edition_items_public_read_published
  ON public.edition_items
  FOR SELECT
  USING (status = 'published');

-- No INSERT/UPDATE/DELETE policies: deny-by-default. The generator runner and
-- the admin queue both write with the service role.
