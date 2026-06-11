-- Migration 014: Soul Audit cost ledger + shared daily counters
--
-- Phase 1A.4 — budget cap + rate limiting + cost ledger for the Soul Audit
-- generation path. These are load-bearing cost controls: the Soul Audit
-- generates devotional plan days with the Anthropic API (Haiku for options on
-- the Worker, Sonnet for days via the Supabase Edge function) and the founder
-- cannot absorb runaway LLM spend.
--
-- Two tables, two jobs:
--
--   * soul_audit_daily_counters — the BLOCKING controls. One row per
--     (utc_day, scope, subject) shared across BOTH the Cloudflare Worker and
--     the Supabase Edge function so per-day rate limits and the global daily
--     spend ceiling are enforced consistently no matter which runtime served
--     the request. `count` powers per-day submit/plan caps; `spend_usd`
--     powers the global daily token/cost budget. Atomic increments via an
--     upsert keep the check cheap (one round trip) under the Workers 10ms CPU
--     budget.
--
--   * soul_audit_cost_ledger — OBSERVABILITY ONLY. One row per real LLM
--     generation call, capturing the provider-reported input/output tokens,
--     estimated USD cost, day mode, model, and the session token. The ledger
--     write is best-effort-but-LOUD: if it fails, the app logs a structured
--     telemetry event but does NOT block the user's devotional. (The counters
--     above are the blocking controls; the ledger is the audit trail.)
--
-- Both tables are written ONLY by the service-role admin client (server +
-- Edge). RLS is enabled with NO permissive policy, so the anon/authenticated
-- roles cannot read or write them — service role bypasses RLS by design.
--
-- NOTE: This migration is provided for review. Do NOT run it automatically;
-- apply it deliberately against the target database.

-- ─── Shared daily counters (rate limit + budget) ────────────────────────────

create table if not exists public.soul_audit_daily_counters (
  -- UTC calendar day the counter belongs to (YYYY-MM-DD). UTC is used so the
  -- Worker and Edge agree on the day boundary regardless of caller timezone.
  utc_day date not null,

  -- Counter scope. Rate-limit scopes are keyed per session/IP subject;
  -- 'global_spend' is a single platform-wide row per day (subject = 'global').
  scope text not null check (scope in (
    'submit',        -- Soul Audit submissions (per subject per day)
    'plan',          -- plan-day generations started (per subject per day)
    'global_spend'   -- platform-wide accumulated LLM spend (per day)
  )),

  -- The subject the counter is keyed to:
  --   * 'submit' / 'plan' → 'session:<token>' or 'ip:<hash>'
  --   * 'global_spend'    → the literal 'global'
  subject text not null,

  -- Monotonic event count for the day (submissions / plan-days started).
  count integer not null default 0 check (count >= 0),

  -- Accumulated estimated USD spend for the day (used by 'global_spend').
  spend_usd numeric(12, 6) not null default 0 check (spend_usd >= 0),

  -- Accumulated tokens for the day (observability for the spend row).
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (utc_day, scope, subject)
);

-- Fast lookups for "today's spend" and "today's per-subject count".
create index if not exists soul_audit_daily_counters_day_scope_idx
  on public.soul_audit_daily_counters (utc_day, scope);

alter table public.soul_audit_daily_counters enable row level security;

-- No permissive policy: only the service-role key (which bypasses RLS) may
-- touch this table. anon/authenticated get nothing.
revoke all on public.soul_audit_daily_counters from anon, authenticated;

-- ─── Per-generation cost ledger (observability) ─────────────────────────────

create table if not exists public.soul_audit_cost_ledger (
  id uuid primary key default gen_random_uuid(),

  -- When the generation call completed (provider response received).
  created_at timestamptz not null default now(),

  -- UTC day for cheap daily aggregation joins against the counters table.
  utc_day date not null default (now() at time zone 'utc')::date,

  -- Correlation ids (best-effort; some may be null for ad-hoc calls).
  session_token text,
  job_id text,
  plan_token text,
  run_id text,
  day_number smallint,

  -- Generation mode: the daily reading vs the long-form deep dive.
  day_mode text not null check (day_mode in ('reading', 'deepdive')),

  -- Model + provider-reported real usage (NOT estimates) from the Anthropic
  -- response. estimated_cost_usd is derived from these token counts using the
  -- configured per-million pricing in src/lib/soul-audit/cost-ledger.ts.
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0 check (estimated_cost_usd >= 0)
);

create index if not exists soul_audit_cost_ledger_day_idx
  on public.soul_audit_cost_ledger (utc_day);
create index if not exists soul_audit_cost_ledger_session_idx
  on public.soul_audit_cost_ledger (session_token);
create index if not exists soul_audit_cost_ledger_created_idx
  on public.soul_audit_cost_ledger (created_at desc);

alter table public.soul_audit_cost_ledger enable row level security;

revoke all on public.soul_audit_cost_ledger from anon, authenticated;

-- ─── Atomic counter increment helper ────────────────────────────────────────
--
-- Single-round-trip increment used by the rate limiter and budget accumulator.
-- Returns the POST-increment counter row so the caller can compare against its
-- configured ceiling without a second read (keeps the Worker CPU cheap).
--
-- p_count_delta bumps the event count; p_spend_delta / p_input / p_output
-- accumulate spend + tokens (used by the 'global_spend' scope). All deltas are
-- optional (default 0) so the same function serves both rate-limit and budget
-- writes.

create or replace function public.soul_audit_bump_counter(
  p_utc_day date,
  p_scope text,
  p_subject text,
  p_count_delta integer default 0,
  p_spend_delta numeric default 0,
  p_input bigint default 0,
  p_output bigint default 0
)
returns public.soul_audit_daily_counters
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.soul_audit_daily_counters;
begin
  insert into public.soul_audit_daily_counters as c (
    utc_day, scope, subject, count, spend_usd, input_tokens, output_tokens, updated_at
  )
  values (
    p_utc_day, p_scope, p_subject,
    greatest(0, p_count_delta),
    greatest(0, p_spend_delta),
    greatest(0, p_input),
    greatest(0, p_output),
    now()
  )
  on conflict (utc_day, scope, subject) do update
    set count = c.count + greatest(0, p_count_delta),
        spend_usd = c.spend_usd + greatest(0, p_spend_delta),
        input_tokens = c.input_tokens + greatest(0, p_input),
        output_tokens = c.output_tokens + greatest(0, p_output),
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

-- Only the service role may execute the increment helper.
revoke all on function public.soul_audit_bump_counter(
  date, text, text, integer, numeric, bigint, bigint
) from anon, authenticated;
