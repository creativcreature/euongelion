-- Daily Bread V2 — provenance is internal (plan §27, SA-142 / F-184).
--
-- "Persist internal provenance… Never expose confidential prompts or
-- credentials publicly." The first migration let anon and authenticated read
-- every column of a published edition, so the anon key returned `generation`
-- (provider calls, redacted errors, models, costs, run ids) and the lease
-- columns, and every revision snapshot (which embeds `generation`). Verified
-- against production with the anon key on 2026-09-14.
--
-- The site reads these tables with the service role only, so client roles keep
-- the published paper's public columns and lose the rest:
--   daily_bread_editions           column-level SELECT without generation,
--                                  lock_owner, lock_expires_at
--   daily_bread_edition_revisions  no client access (policy dropped, SELECT revoked)
-- A column added later is not granted to client roles unless a migration says so.

DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE SELECT ON public.daily_bread_editions FROM %I', r);
      EXECUTE format(
        'GRANT SELECT (id, edition_date, slug, archive_origin, volume, issue, lifecycle, quality, '
        'active_revision, title, deck, primary_scripture, liturgical, seed, archetype, composition, '
        'modules, assets, schema_version, renderer_version, superseded_reason, created_at, ready_at, '
        'published_at, updated_at) ON public.daily_bread_editions TO %I',
        r
      );
      EXECUTE format('REVOKE SELECT ON public.daily_bread_edition_revisions FROM %I', r);
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS daily_bread_revisions_public_read ON public.daily_bread_edition_revisions;
