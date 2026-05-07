-- Migration 012: Supabase Security Advisor — full fix
-- Date: 2026-05-07
-- Source: Founder shared Supabase Advisor screenshot showing 5 ERRORS
-- + 17 WARNINGS on project ovivwbopjfruikehrlgm.
-- Companion: docs/runbooks/supabase-rls-vulnerability-2026-05-07.md
--
-- Migration 011 enabled RLS on the unused generated_illustrations table.
-- That was a defensive cleanup, not the advisor's actual finding. The
-- advisor screenshot reveals the real picture:
--
-- ERRORS (5):
--   1. SECURITY DEFINER view: public.bookmarks_with_devotionals
--   2. SECURITY DEFINER view: public.soul_audit_results
--   3. SECURITY DEFINER view: public.user_streaks
--   4. RLS Disabled in Public:    public.soul_audit_jobs
--   5. Sensitive Columns Exposed: public.soul_audit_jobs
--
-- WARNINGS (17):
--   - 8 functions without search_path locked
--   - public.vector extension in public schema (low-priority, deferred)
--   - public.user_sessions has RLS policy USING (true)
--   - 3 SECURITY DEFINER functions publicly executable
--
-- This migration fixes everything I can see in the migrations tree.
-- The runbook covers the live-only objects (`soul_audit_jobs`,
-- `user_sessions`, `set_updated_at`, `current_audit_session_token`,
-- `cleanup_expired_sessions`, `update_updated_at`, `match_devotional_plans`)
-- with paste-ready SQL the founder can run in the dashboard editor.

-- ─── 1. Recreate the 3 SECURITY DEFINER views with security_invoker ─
-- A view created without explicit security_invoker runs as the view's
-- owner (postgres / service_role). That bypasses RLS on the underlying
-- tables, so any caller with SELECT on the view sees ALL rows.
-- Postgres 15+ supports `security_invoker = true` which makes the view
-- run as the caller — RLS on the underlying tables is then enforced
-- correctly. Supabase is on PG15+, so this is safe.

ALTER VIEW IF EXISTS public.user_streaks
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.bookmarks_with_devotionals
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.soul_audit_results
  SET (security_invoker = true);

-- ─── 2. Lock down search_path on every function in the tree ─────────
-- A mutable search_path on a SECURITY DEFINER function lets a caller
-- with CREATE on any reachable schema shadow built-ins. Even on
-- non-DEFINER functions it's a code-injection risk. Setting search_path
-- explicitly removes the ambiguity.
--
-- These three functions live in the migrations tree:

ALTER FUNCTION public.handle_new_user()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_series_devotional_count()
  SET search_path = pg_catalog, public;

-- ─── 3. Revoke PUBLIC execute on the SECURITY DEFINER functions ─────
-- These are trigger-bound functions invoked by the system, not by
-- application code. PUBLIC execute is unnecessary and is what the
-- advisor flagged as "Public Can Execute SECURITY DEFINER".

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.update_series_devotional_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_series_devotional_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_series_devotional_count() FROM authenticated;

-- update_updated_at_column is not flagged as SECURITY DEFINER but lock
-- it down anyway — it's a trigger fn with no caller use case.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;

-- ─── 4. Verification queries (paste into SQL editor after applying) ─
--
-- Confirm views are now security_invoker:
--   SELECT c.relname,
--     COALESCE((c.reloptions::text[])::text[] @> ARRAY['security_invoker=true'], false) AS si
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE c.relkind = 'v'
--     AND n.nspname = 'public'
--     AND c.relname IN ('user_streaks','bookmarks_with_devotionals','soul_audit_results');
--
-- Confirm function search_path is locked:
--   SELECT p.proname, p.proconfig
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN ('handle_new_user','update_updated_at_column','update_series_devotional_count');
--   -- Expected proconfig contains: search_path=pg_catalog, public
--
-- Then re-run the Security Advisor:
--   Project → Database → Advisors → Security → Refresh
-- The 3 SECURITY DEFINER View errors should clear, plus the 3 function
-- "Public Can Execute SECURITY DEFINER" warnings, plus 3 of the 8
-- "Function Search Path Mutable" warnings. The remaining 5 mutable-
-- path warnings + the 2 soul_audit_jobs errors + the user_sessions
-- USING(true) warning are addressed in the runbook (live-only objects).
