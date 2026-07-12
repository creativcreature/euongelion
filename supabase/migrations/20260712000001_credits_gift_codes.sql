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
