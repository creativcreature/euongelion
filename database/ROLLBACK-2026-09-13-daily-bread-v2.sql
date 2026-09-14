-- ROLLBACK for supabase/migrations/20260913000001_daily_bread_v2.sql — SA-142 / F-184
--
-- The Supabase CLI runs migrations forward only, so the reverse of the Daily
-- Bread V2 migration lives here as a script. It removes exactly what that
-- migration created: 3 tables (with their indexes, trigger and policies) and
-- 9 functions. It touches no other table.
--
-- THIS DESTROYS THE PUBLISHED ARCHIVE. Every edition, revision and attempt row
-- goes with the tables. Before running it in production:
--   1. Build and deploy with DAILY_BREAD_V2=off so /daily-bread serves the
--      SA-090 paper and nothing reads these tables.
--   2. Set the repository variable DAILY_BREAD_V2_SCHEDULER to anything but
--      'enabled' so no job writes to them.
--   3. Export the tables if the archive should survive.
--
-- The script refuses to run unless the session confirms it:
--   SET daily_bread.confirm_rollback = 'destroy-archive';
-- One transaction: it either removes everything or nothing.

BEGIN;

DO $$
BEGIN
  IF current_setting('daily_bread.confirm_rollback', true) IS DISTINCT FROM 'destroy-archive' THEN
    RAISE EXCEPTION 'daily bread v2 rollback refused: run SET daily_bread.confirm_rollback = ''destroy-archive''; first (this deletes the published archive)';
  END IF;
END;
$$;

-- Functions that take the editions row type must go before the table.
DROP FUNCTION IF EXISTS public.daily_bread_acquire_assembly(DATE, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.daily_bread_release_assembly(DATE, TEXT);
DROP FUNCTION IF EXISTS public.daily_bread_mark_ready(DATE, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.daily_bread_reopen_ready(DATE);
DROP FUNCTION IF EXISTS public.daily_bread_publish(DATE, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.daily_bread_create_revision(DATE, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.daily_bread_supersede(DATE, TEXT);
DROP FUNCTION IF EXISTS public.daily_bread_edition_document(public.daily_bread_editions);

-- Tables (indexes, policies and the revisions trigger drop with them).
DROP TABLE IF EXISTS public.daily_bread_publication_attempts;
DROP TABLE IF EXISTS public.daily_bread_edition_revisions;
DROP TABLE IF EXISTS public.daily_bread_editions;

DROP FUNCTION IF EXISTS public.daily_bread_revisions_immutable();

COMMIT;
