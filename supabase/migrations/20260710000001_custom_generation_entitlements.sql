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
