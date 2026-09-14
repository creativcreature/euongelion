-- The Daily Bread V2 — serialized, self-archiving editions — SA-142 / F-184
--
-- One row per editorial date. A row is ASSEMBLED (under a lease), marked READY
-- with its complete frozen document, then PUBLISHED at the 7am New York
-- rollover. Publication is one transaction: it allocates the next native issue
-- number under an advisory lock and writes immutable revision 1. Readers only
-- ever see a published (or withdrawn) row, and they see the frozen document,
-- never a re-computation.
--
-- Lifecycle (draft → assembling → ready → published → superseded) is
-- ORTHOGONAL to quality (normal | fallback | minimum). A fallback edition is a
-- real, published, numbered edition that says how it was made.
--
-- Backfilled editions (dates before V2 launched) are archive entries only:
-- they never take an issue number, so "No. 001" is the first native paper.
--
-- Idempotent: safe to paste twice. No down migration (house style).

CREATE TABLE IF NOT EXISTS public.daily_bread_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_date DATE NOT NULL,
  slug TEXT NOT NULL,
  archive_origin TEXT NOT NULL DEFAULT 'native'
    CHECK (archive_origin IN ('native', 'backfilled')),
  volume INTEGER,
  issue INTEGER,
  lifecycle TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle IN ('draft', 'assembling', 'ready', 'published', 'superseded')),
  quality TEXT CHECK (quality IN ('normal', 'fallback', 'minimum')),
  active_revision INTEGER NOT NULL DEFAULT 0 CHECK (active_revision >= 0),
  title TEXT,
  deck TEXT,
  primary_scripture JSONB,
  liturgical JSONB,
  seed TEXT,
  archetype TEXT,
  composition JSONB,
  modules JSONB,
  assets JSONB,
  generation JSONB,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  renderer_version TEXT,
  superseded_reason TEXT,
  lock_owner TEXT,
  lock_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_bread_editions_date_unique UNIQUE (edition_date),
  CONSTRAINT daily_bread_editions_slug_matches_date
    CHECK (slug = to_char(edition_date, 'YYYY-MM-DD')),
  CONSTRAINT daily_bread_editions_issue_positive CHECK (issue IS NULL OR issue > 0),
  CONSTRAINT daily_bread_editions_volume_positive CHECK (volume IS NULL OR volume > 0),
  -- Backfilled editions never consume an issue number.
  CONSTRAINT daily_bread_editions_backfill_has_no_issue
    CHECK (archive_origin = 'native' OR (issue IS NULL AND volume IS NULL)),
  -- A ready row carries its whole document.
  CONSTRAINT daily_bread_editions_ready_complete
    CHECK (
      lifecycle IN ('draft', 'assembling')
      OR (quality IS NOT NULL AND title IS NOT NULL AND modules IS NOT NULL
          AND composition IS NOT NULL AND ready_at IS NOT NULL)
    ),
  -- A published (or withdrawn) row is numbered, stamped and revisioned.
  CONSTRAINT daily_bread_editions_published_complete
    CHECK (
      lifecycle NOT IN ('published', 'superseded')
      OR (published_at IS NOT NULL AND active_revision >= 1
          AND (archive_origin = 'backfilled' OR (issue IS NOT NULL AND volume IS NOT NULL)))
    ),
  CONSTRAINT daily_bread_editions_superseded_has_reason
    CHECK (lifecycle <> 'superseded' OR superseded_reason IS NOT NULL),
  CONSTRAINT daily_bread_editions_title_length CHECK (title IS NULL OR char_length(title) <= 200),
  CONSTRAINT daily_bread_editions_deck_length CHECK (deck IS NULL OR char_length(deck) <= 400)
);

-- Native issue numbers are unique forever (withdrawn numbers are never reused).
CREATE UNIQUE INDEX IF NOT EXISTS daily_bread_editions_native_issue_unique
  ON public.daily_bread_editions (issue)
  WHERE archive_origin = 'native' AND issue IS NOT NULL;

-- Read paths: latest published on or before a date; archive listing.
CREATE INDEX IF NOT EXISTS daily_bread_editions_public_date_idx
  ON public.daily_bread_editions (edition_date DESC)
  WHERE lifecycle IN ('published', 'superseded');

CREATE TABLE IF NOT EXISTS public.daily_bread_edition_revisions (
  edition_id UUID NOT NULL REFERENCES public.daily_bread_editions (id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  snapshot JSONB NOT NULL,
  PRIMARY KEY (edition_id, revision)
);

-- Revisions are the archive's memory: append-only, enforced in the database.
CREATE OR REPLACE FUNCTION public.daily_bread_revisions_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'daily_bread_edition_revisions rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS daily_bread_revisions_no_update ON public.daily_bread_edition_revisions;
CREATE TRIGGER daily_bread_revisions_no_update
  BEFORE UPDATE OR DELETE ON public.daily_bread_edition_revisions
  FOR EACH ROW EXECUTE FUNCTION public.daily_bread_revisions_immutable();

CREATE TABLE IF NOT EXISTS public.daily_bread_publication_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_date DATE NOT NULL,
  run_id TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'scheduler'
    CHECK (trigger IN ('scheduler', 'manual', 'backfill', 'e2e')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  lifecycle_stage TEXT NOT NULL,
  primary_provider TEXT,
  fallback_providers_used TEXT[] NOT NULL DEFAULT '{}',
  quality TEXT CHECK (quality IN ('normal', 'fallback', 'minimum')),
  errors JSONB NOT NULL DEFAULT '[]',
  warnings JSONB NOT NULL DEFAULT '[]',
  module_failures JSONB NOT NULL DEFAULT '[]',
  asset_fallbacks JSONB NOT NULL DEFAULT '[]',
  stage_timings JSONB NOT NULL DEFAULT '[]',
  provider_usage JSONB NOT NULL DEFAULT '[]',
  estimated_cost_usd NUMERIC(10, 5) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  publication_result TEXT
    CHECK (publication_result IN ('published', 'ready', 'already_published', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS daily_bread_attempts_date_idx
  ON public.daily_bread_publication_attempts (target_date DESC, started_at DESC);

-- ── Functions ──────────────────────────────────────────────────────────────

-- The frozen document for a row (what a revision stores).
CREATE OR REPLACE FUNCTION public.daily_bread_edition_document(p_row public.daily_bread_editions)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'schemaVersion', p_row.schema_version,
    'editionDate', p_row.slug,
    'slug', p_row.slug,
    'archiveOrigin', p_row.archive_origin,
    'volume', p_row.volume,
    'issue', p_row.issue,
    'quality', p_row.quality,
    'title', p_row.title,
    'deck', p_row.deck,
    'primaryScripture', p_row.primary_scripture,
    'liturgical', p_row.liturgical,
    'seed', p_row.seed,
    'composition', p_row.composition,
    'modules', p_row.modules,
    'assets', p_row.assets,
    'generation', p_row.generation,
    'rendererVersion', p_row.renderer_version,
    'readyAt', p_row.ready_at,
    'publishedAt', p_row.published_at
  );
$$;

-- Acquire (or resume) the assembly lease for one editorial date. A second job
-- for the same date gets acquired=false while the lease is live; a ready or
-- published row is never re-assembled.
CREATE OR REPLACE FUNCTION public.daily_bread_acquire_assembly(
  p_date DATE,
  p_owner TEXT,
  p_ttl_seconds INTEGER DEFAULT 900,
  p_archive_origin TEXT DEFAULT 'native'
) RETURNS TABLE (acquired BOOLEAN, lifecycle TEXT, edition_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.daily_bread_editions%ROWTYPE;
BEGIN
  IF p_owner IS NULL OR char_length(p_owner) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'daily_bread_acquire_assembly: owner required';
  END IF;
  IF p_ttl_seconds NOT BETWEEN 30 AND 7200 THEN
    RAISE EXCEPTION 'daily_bread_acquire_assembly: ttl out of range';
  END IF;

  INSERT INTO public.daily_bread_editions (edition_date, slug, archive_origin)
  VALUES (p_date, to_char(p_date, 'YYYY-MM-DD'), p_archive_origin)
  ON CONFLICT (edition_date) DO NOTHING;

  SELECT * INTO v_row FROM public.daily_bread_editions e
   WHERE e.edition_date = p_date FOR UPDATE;

  IF v_row.lifecycle IN ('ready', 'published', 'superseded') THEN
    RETURN QUERY SELECT false, v_row.lifecycle, v_row.id;
    RETURN;
  END IF;

  IF v_row.lifecycle = 'assembling' AND v_row.lock_owner IS DISTINCT FROM p_owner
     AND v_row.lock_expires_at > now() THEN
    RETURN QUERY SELECT false, v_row.lifecycle, v_row.id;
    RETURN;
  END IF;

  UPDATE public.daily_bread_editions e
     SET lifecycle = 'assembling',
         archive_origin = p_archive_origin,
         lock_owner = p_owner,
         lock_expires_at = now() + make_interval(secs => p_ttl_seconds),
         updated_at = now()
   WHERE e.id = v_row.id;
  RETURN QUERY SELECT true, 'assembling'::TEXT, v_row.id;
END;
$$;

-- Give the lease back after a failed assembly (row returns to draft).
CREATE OR REPLACE FUNCTION public.daily_bread_release_assembly(p_date DATE, p_owner TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.daily_bread_editions e
     SET lifecycle = 'draft', lock_owner = NULL, lock_expires_at = NULL, updated_at = now()
   WHERE e.edition_date = p_date AND e.lifecycle = 'assembling' AND e.lock_owner = p_owner;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- Freeze the assembled document. Only the lease holder may mark ready.
CREATE OR REPLACE FUNCTION public.daily_bread_mark_ready(
  p_date DATE,
  p_owner TEXT,
  p_document JSONB
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.daily_bread_editions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.daily_bread_editions e
   WHERE e.edition_date = p_date FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;
  IF v_row.lifecycle IN ('ready', 'published', 'superseded') THEN
    RETURN 'already_' || v_row.lifecycle;
  END IF;
  IF v_row.lifecycle <> 'assembling' OR v_row.lock_owner IS DISTINCT FROM p_owner THEN
    RETURN 'lock_lost';
  END IF;
  IF p_document->>'editionDate' IS DISTINCT FROM to_char(p_date, 'YYYY-MM-DD') THEN
    RAISE EXCEPTION 'daily_bread_mark_ready: document date does not match';
  END IF;

  UPDATE public.daily_bread_editions e
     SET lifecycle = 'ready',
         quality = p_document->>'quality',
         title = p_document->>'title',
         deck = p_document->>'deck',
         primary_scripture = p_document->'primaryScripture',
         liturgical = p_document->'liturgical',
         seed = p_document->>'seed',
         archetype = p_document->'composition'->>'archetype',
         composition = p_document->'composition',
         modules = p_document->'modules',
         assets = p_document->'assets',
         generation = p_document->'generation',
         schema_version = COALESCE((p_document->>'schemaVersion')::INTEGER, 1),
         renderer_version = p_document->>'rendererVersion',
         ready_at = now(),
         lock_owner = NULL,
         lock_expires_at = NULL,
         updated_at = now()
   WHERE e.id = v_row.id;
  RETURN 'ready';
END;
$$;

-- Send a READY (never published) edition back to draft so it can be rebuilt —
-- e.g. the founder rejected a reviewed item it was built from.
CREATE OR REPLACE FUNCTION public.daily_bread_reopen_ready(p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.daily_bread_editions e
     SET lifecycle = 'draft', ready_at = NULL, lock_owner = NULL, lock_expires_at = NULL,
         updated_at = now()
   WHERE e.edition_date = p_date AND e.lifecycle = 'ready';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- Atomic publication: allocates the native issue number inside the
-- transaction (advisory lock serializes concurrent publishers) and writes
-- immutable revision 1. Re-running is a no-op that returns the same number.
CREATE OR REPLACE FUNCTION public.daily_bread_publish(p_date DATE, p_now TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (result TEXT, edition_id UUID, issue INTEGER, volume INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.daily_bread_editions%ROWTYPE;
  v_issue INTEGER;
  v_volume INTEGER;
  v_launch DATE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('daily_bread_issue_sequence'));

  SELECT * INTO v_row FROM public.daily_bread_editions e
   WHERE e.edition_date = p_date FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'missing'::TEXT, NULL::UUID, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_row.lifecycle IN ('published', 'superseded') THEN
    RETURN QUERY SELECT 'already_published'::TEXT, v_row.id, v_row.issue, v_row.volume;
    RETURN;
  END IF;

  IF v_row.lifecycle <> 'ready' THEN
    RETURN QUERY SELECT 'not_ready'::TEXT, v_row.id, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_row.archive_origin = 'native' THEN
    SELECT COALESCE(MAX(e.issue), 0) + 1 INTO v_issue
      FROM public.daily_bread_editions e
     WHERE e.archive_origin = 'native' AND e.issue IS NOT NULL;
    SELECT MIN(e.edition_date) INTO v_launch
      FROM public.daily_bread_editions e
     WHERE e.archive_origin = 'native' AND e.issue IS NOT NULL;
    v_launch := COALESCE(v_launch, p_date);
    v_volume := 1 + GREATEST(0, EXTRACT(YEAR FROM age(p_date, v_launch))::INTEGER);
  END IF;

  UPDATE public.daily_bread_editions e
     SET lifecycle = 'published', issue = v_issue, volume = v_volume,
         published_at = p_now, active_revision = 1,
         lock_owner = NULL, lock_expires_at = NULL, updated_at = p_now
   WHERE e.id = v_row.id
  RETURNING * INTO v_row;

  INSERT INTO public.daily_bread_edition_revisions (edition_id, revision, reason, snapshot)
  VALUES (v_row.id, 1, 'initial publication', public.daily_bread_edition_document(v_row));

  RETURN QUERY SELECT 'published'::TEXT, v_row.id, v_issue, v_volume;
END;
$$;

-- A correction to a published edition: a new immutable revision. The issue
-- number, date and publication stamp never change.
CREATE OR REPLACE FUNCTION public.daily_bread_create_revision(
  p_date DATE,
  p_reason TEXT,
  p_document JSONB
) RETURNS TABLE (result TEXT, revision INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.daily_bread_editions%ROWTYPE;
  v_next INTEGER;
BEGIN
  SELECT * INTO v_row FROM public.daily_bread_editions e
   WHERE e.edition_date = p_date FOR UPDATE;
  IF NOT FOUND OR v_row.lifecycle <> 'published' THEN
    RETURN QUERY SELECT 'not_published'::TEXT, NULL::INTEGER;
    RETURN;
  END IF;
  IF p_reason IS NULL OR char_length(p_reason) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'daily_bread_create_revision: reason required';
  END IF;
  v_next := v_row.active_revision + 1;

  UPDATE public.daily_bread_editions e
     SET title = COALESCE(p_document->>'title', e.title),
         deck = CASE WHEN p_document ? 'deck' THEN p_document->>'deck' ELSE e.deck END,
         quality = COALESCE(p_document->>'quality', e.quality),
         modules = COALESCE(p_document->'modules', e.modules),
         composition = COALESCE(p_document->'composition', e.composition),
         assets = COALESCE(p_document->'assets', e.assets),
         generation = COALESCE(p_document->'generation', e.generation),
         active_revision = v_next,
         updated_at = now()
   WHERE e.id = v_row.id
  RETURNING * INTO v_row;

  INSERT INTO public.daily_bread_edition_revisions (edition_id, revision, reason, snapshot)
  VALUES (v_row.id, v_next, p_reason, public.daily_bread_edition_document(v_row));

  RETURN QUERY SELECT 'revised'::TEXT, v_next;
END;
$$;

-- Withdraw a published edition. Its number stays retired; the page says why.
CREATE OR REPLACE FUNCTION public.daily_bread_supersede(p_date DATE, p_reason TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_reason IS NULL OR char_length(p_reason) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'daily_bread_supersede: reason required';
  END IF;
  UPDATE public.daily_bread_editions e
     SET lifecycle = 'superseded', superseded_reason = p_reason, updated_at = now()
   WHERE e.edition_date = p_date AND e.lifecycle = 'published';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN CASE WHEN v_count > 0 THEN 'superseded' ELSE 'not_published' END;
END;
$$;

-- ── Row level security ────────────────────────────────────────────────────

ALTER TABLE public.daily_bread_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_bread_edition_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_bread_publication_attempts ENABLE ROW LEVEL SECURITY;

-- The paper is public once published. Drafts, assembling and ready rows are
-- invisible to anon and authenticated; the builder writes with the service role.
DROP POLICY IF EXISTS daily_bread_editions_public_read ON public.daily_bread_editions;
CREATE POLICY daily_bread_editions_public_read
  ON public.daily_bread_editions
  FOR SELECT
  USING (lifecycle IN ('published', 'superseded'));

DROP POLICY IF EXISTS daily_bread_revisions_public_read ON public.daily_bread_edition_revisions;
CREATE POLICY daily_bread_revisions_public_read
  ON public.daily_bread_edition_revisions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.daily_bread_editions e
     WHERE e.id = edition_id AND e.lifecycle IN ('published', 'superseded')
  ));

-- Publication attempts are operational telemetry: no public policy at all.

-- Deny-by-default writes for client roles, and no client may run the pipeline.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.daily_bread_editions FROM anon;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.daily_bread_edition_revisions FROM anon;
    REVOKE ALL ON public.daily_bread_publication_attempts FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.daily_bread_editions FROM authenticated;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.daily_bread_edition_revisions FROM authenticated;
    REVOKE ALL ON public.daily_bread_publication_attempts FROM authenticated;
  END IF;
END;
$$;

-- Supabase's default privileges grant EXECUTE on every new public function to
-- anon and authenticated DIRECTLY, so revoking from PUBLIC alone leaves the
-- pipeline callable by anyone with the anon key (found in production on first
-- apply, 2026-09-13, closed within a minute, no rows existed). Revoke from the
-- client roles by name as well.
REVOKE ALL ON FUNCTION public.daily_bread_acquire_assembly(DATE, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_release_assembly(DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_mark_ready(DATE, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_reopen_ready(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_publish(DATE, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_create_revision(DATE, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_supersede(DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_edition_document(public.daily_bread_editions) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.daily_bread_revisions_immutable() FROM PUBLIC;

DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_acquire_assembly(DATE, TEXT, INTEGER, TEXT) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_release_assembly(DATE, TEXT) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_mark_ready(DATE, TEXT, JSONB) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_reopen_ready(DATE) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_publish(DATE, TIMESTAMPTZ) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_create_revision(DATE, TEXT, JSONB) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_supersede(DATE, TEXT) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_edition_document(public.daily_bread_editions) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.daily_bread_revisions_immutable() FROM %I', r);
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.daily_bread_acquire_assembly(DATE, TEXT, INTEGER, TEXT) TO service_role;
    GRANT EXECUTE ON FUNCTION public.daily_bread_release_assembly(DATE, TEXT) TO service_role;
    GRANT EXECUTE ON FUNCTION public.daily_bread_mark_ready(DATE, TEXT, JSONB) TO service_role;
    GRANT EXECUTE ON FUNCTION public.daily_bread_reopen_ready(DATE) TO service_role;
    GRANT EXECUTE ON FUNCTION public.daily_bread_publish(DATE, TIMESTAMPTZ) TO service_role;
    GRANT EXECUTE ON FUNCTION public.daily_bread_create_revision(DATE, TEXT, JSONB) TO service_role;
    GRANT EXECUTE ON FUNCTION public.daily_bread_supersede(DATE, TEXT) TO service_role;
  END IF;
END;
$$;

COMMENT ON TABLE public.daily_bread_editions IS
  'The Daily Bread V2 editions, one per editorial date (SA-142/F-184). Frozen documents; native issues allocated at publish; backfilled rows carry no issue.';
COMMENT ON TABLE public.daily_bread_edition_revisions IS
  'Append-only revisions of published Daily Bread editions (trigger-enforced).';
COMMENT ON TABLE public.daily_bread_publication_attempts IS
  'One row per pipeline attempt: providers, fallbacks, stage timings, errors, cost. Service role only.';
