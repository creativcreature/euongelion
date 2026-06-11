-- Migration 014: Web Push subscriptions (Phase 2.2)
--
-- Stores one row per browser PushSubscription so a future scheduled sender
-- (a Cloudflare Worker Cron Trigger — OUT OF SCOPE of the subscribe route)
-- can deliver ONE calm daily nudge to readers who opted in.
--
-- Keyed by `session_token` to match the rest of the anonymous-friendly
-- reading flow (session_bookmarks, annotations, audit_runs, etc. — see
-- migration 005 + lib/session.ts SESSION_KEYED_TABLES). A signed-in user's
-- id is written into session_token by the API route when present, so the
-- subscription follows the user.
--
-- Writes happen exclusively through the admin (service-role) client in
-- src/app/api/push/subscribe/route.ts, which bypasses RLS — matching how the
-- other session-keyed tables are written. RLS is still enabled with a
-- deny-by-default posture so the table is never readable via the anon key.
--
-- DO NOT RUN automatically — apply via the normal migration process.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One subscription per browser endpoint. Re-subscribing upserts on this.
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists idx_push_subscriptions_session
  on public.push_subscriptions (session_token);

-- Enable RLS. No anon/authenticated policies are added: all access is via the
-- service-role admin client (RLS-bypass), so the table is deny-by-default for
-- every other role — subscriptions (which contain delivery secrets) are never
-- exposed through the public anon key.
alter table public.push_subscriptions enable row level security;

-- Service role bypasses RLS, so it can read every row for the daily send.
grant all on public.push_subscriptions to service_role;
