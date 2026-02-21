-- Lock down Soul Audit RLS policies and add ownership columns.
-- Do not edit prior migration history; apply hardening as additive migration.

ALTER TABLE audit_runs
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE audit_options
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE consent_records
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE audit_selections
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE devotional_plan_instances
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE devotional_plan_days
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE devotional_day_citations
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE annotations
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE session_bookmarks
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE mock_account_sessions
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_runs_owner_user_id ON audit_runs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_owner_user_id ON consent_records(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_plan_instances_owner_user_id ON devotional_plan_instances(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_owner_user_id ON annotations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_session_bookmarks_owner_user_id ON session_bookmarks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_mock_account_sessions_owner_user_id ON mock_account_sessions(owner_user_id);

-- Backfill child ownership from parent rows where possible.
UPDATE audit_options ao
SET owner_user_id = ar.owner_user_id
FROM audit_runs ar
WHERE ao.audit_run_id = ar.id
  AND ao.owner_user_id IS NULL;

UPDATE consent_records cr
SET owner_user_id = ar.owner_user_id
FROM audit_runs ar
WHERE cr.audit_run_id = ar.id
  AND cr.owner_user_id IS NULL;

UPDATE audit_selections sel
SET owner_user_id = ar.owner_user_id
FROM audit_runs ar
WHERE sel.audit_run_id = ar.id
  AND sel.owner_user_id IS NULL;

UPDATE devotional_plan_instances dpi
SET owner_user_id = ar.owner_user_id
FROM audit_runs ar
WHERE dpi.audit_run_id = ar.id
  AND dpi.owner_user_id IS NULL;

UPDATE devotional_plan_days dpd
SET owner_user_id = dpi.owner_user_id
FROM devotional_plan_instances dpi
WHERE dpd.plan_token = dpi.plan_token
  AND dpd.owner_user_id IS NULL;

UPDATE devotional_day_citations ddc
SET owner_user_id = dpd.owner_user_id
FROM devotional_plan_days dpd
WHERE ddc.plan_day_id = dpd.id
  AND ddc.owner_user_id IS NULL;

CREATE OR REPLACE FUNCTION current_audit_session_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.audit_session_token', true), '');
$$;

-- Remove permissive policies from consolidation migration.
DROP POLICY IF EXISTS allow_all_audit_runs ON audit_runs;
DROP POLICY IF EXISTS allow_all_audit_options ON audit_options;
DROP POLICY IF EXISTS allow_all_consent_records ON consent_records;
DROP POLICY IF EXISTS allow_all_audit_selections ON audit_selections;
DROP POLICY IF EXISTS allow_all_plan_instances ON devotional_plan_instances;
DROP POLICY IF EXISTS allow_all_plan_days ON devotional_plan_days;
DROP POLICY IF EXISTS allow_all_day_citations ON devotional_day_citations;
DROP POLICY IF EXISTS allow_all_annotations ON annotations;
DROP POLICY IF EXISTS allow_all_session_bookmarks ON session_bookmarks;
DROP POLICY IF EXISTS allow_all_mock_account_sessions ON mock_account_sessions;

-- Hybrid ownership model:
-- - Authenticated users own rows via owner_user_id.
-- - Anonymous flow can access rows scoped by app.audit_session_token.
CREATE POLICY audit_runs_owner_or_session
  ON audit_runs
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  );

CREATE POLICY audit_options_owner_or_session
  ON audit_options
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM audit_runs ar
      WHERE ar.id = audit_options.audit_run_id
        AND (
          auth.uid() = ar.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND ar.session_token = current_audit_session_token()
          )
        )
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM audit_runs ar
      WHERE ar.id = audit_options.audit_run_id
        AND (
          auth.uid() = ar.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND ar.session_token = current_audit_session_token()
          )
        )
    )
  );

CREATE POLICY consent_records_owner_or_session
  ON consent_records
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  );

CREATE POLICY audit_selections_owner_or_session
  ON audit_selections
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM audit_runs ar
      WHERE ar.id = audit_selections.audit_run_id
        AND (
          auth.uid() = ar.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND ar.session_token = current_audit_session_token()
          )
        )
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM audit_runs ar
      WHERE ar.id = audit_selections.audit_run_id
        AND (
          auth.uid() = ar.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND ar.session_token = current_audit_session_token()
          )
        )
    )
  );

CREATE POLICY plan_instances_owner_or_session
  ON devotional_plan_instances
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  );

CREATE POLICY plan_days_owner_or_session
  ON devotional_plan_days
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM devotional_plan_instances dpi
      WHERE dpi.plan_token = devotional_plan_days.plan_token
        AND (
          auth.uid() = dpi.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND dpi.session_token = current_audit_session_token()
          )
        )
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM devotional_plan_instances dpi
      WHERE dpi.plan_token = devotional_plan_days.plan_token
        AND (
          auth.uid() = dpi.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND dpi.session_token = current_audit_session_token()
          )
        )
    )
  );

CREATE POLICY day_citations_owner_or_session
  ON devotional_day_citations
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM devotional_plan_days dpd
      JOIN devotional_plan_instances dpi ON dpi.plan_token = dpd.plan_token
      WHERE dpd.id = devotional_day_citations.plan_day_id
        AND (
          auth.uid() = dpi.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND dpi.session_token = current_audit_session_token()
          )
        )
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM devotional_plan_days dpd
      JOIN devotional_plan_instances dpi ON dpi.plan_token = dpd.plan_token
      WHERE dpd.id = devotional_day_citations.plan_day_id
        AND (
          auth.uid() = dpi.owner_user_id
          OR (
            current_audit_session_token() IS NOT NULL
            AND dpi.session_token = current_audit_session_token()
          )
        )
    )
  );

CREATE POLICY annotations_owner_or_session
  ON annotations
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  );

CREATE POLICY bookmarks_owner_or_session
  ON session_bookmarks
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  );

CREATE POLICY mock_sessions_owner_or_session
  ON mock_account_sessions
  FOR ALL
  USING (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR (
      current_audit_session_token() IS NOT NULL
      AND session_token = current_audit_session_token()
    )
  );
