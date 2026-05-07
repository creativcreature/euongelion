-- Migration 011: Enable RLS on generated_illustrations (security advisor fix)
-- Date: 2026-05-07
-- Source: Supabase Security Advisor emails dated 2026-04-27 and 2026-05-03
--   - rls_disabled_in_public  (CRITICAL)
--   - sensitive_columns_exposed (CRITICAL)
--
-- Root cause:
--   Migration 008 (`008_create_generated_illustrations.sql`) created
--   `public.generated_illustrations` WITHOUT enabling Row Level Security.
--   Every other public table in this project enables RLS at create time.
--   This is the only table in the migrations tree that does not.
--
--   The advisor flagged the table on two grounds:
--     1. `rls_disabled_in_public` — RLS not enabled, so `anon` and
--        `authenticated` could read/write all rows via the project URL.
--     2. `sensitive_columns_exposed` — the `prompt` column (and possibly
--        `asset_url`) may contain content treated as sensitive by the
--        advisor's column-name heuristics.
--
-- Fix:
--   Enable RLS on the table. We do NOT add any anon/authenticated
--   policies. All legitimate writes happen server-side via the
--   `service_role` key, which bypasses RLS. Read access for
--   illustrations is intentionally not exposed to the anon role today.
--
--   This mirrors the defense-in-depth pattern already used in migration
--   009: enable RLS, no permissive policies, server-side service-role
--   access only.
--
-- Verification (run in Supabase SQL editor after applying):
--   SELECT
--     n.nspname  AS schema,
--     c.relname  AS table,
--     c.relrowsecurity AS rls_enabled
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE c.relkind = 'r'
--     AND n.nspname = 'public'
--     AND c.relname = 'generated_illustrations';
--   -- Expected: rls_enabled = true
--
--   Then re-run the Supabase Security Advisor:
--     Project → Database → Advisors → Security
--   Both `rls_disabled_in_public` and `sensitive_columns_exposed` for
--   this table should clear. If any other table still shows up, ping
--   the founder and we'll write a follow-up migration.

ALTER TABLE public.generated_illustrations ENABLE ROW LEVEL SECURITY;

-- No policies are added on purpose. With RLS enabled and zero policies,
-- the anon and authenticated roles cannot read or write any rows;
-- service_role bypasses RLS for legitimate server-side operations.

-- Defensive: revoke any direct grants that may have leaked to anon
-- prior to this migration. Idempotent; safe to re-run.
REVOKE ALL ON public.generated_illustrations FROM anon;
REVOKE ALL ON public.generated_illustrations FROM authenticated;
