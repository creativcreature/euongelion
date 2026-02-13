-- Soul Audit + Devotional Engine Consolidation (curated-first)

CREATE TABLE IF NOT EXISTS audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL,
  response_text TEXT NOT NULL,
  crisis_detected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_session_token ON audit_runs(session_token);
CREATE INDEX IF NOT EXISTS idx_audit_runs_created_at ON audit_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_options (
  id TEXT PRIMARY KEY,
  audit_run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('ai_primary', 'curated_prefab')),
  rank INTEGER NOT NULL CHECK (rank >= 1),
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  reasoning TEXT NOT NULL,
  preview JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_options_run ON audit_options(audit_run_id);

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  essential_accepted BOOLEAN NOT NULL,
  analytics_opt_in BOOLEAN NOT NULL DEFAULT false,
  crisis_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consent_records_run_unique ON consent_records(audit_run_id);

CREATE TABLE IF NOT EXISTS audit_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES audit_options(id) ON DELETE CASCADE,
  option_kind TEXT NOT NULL CHECK (option_kind IN ('ai_primary', 'curated_prefab')),
  series_slug TEXT NOT NULL,
  plan_token UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_selection_run_unique ON audit_selections(audit_run_id);

CREATE TABLE IF NOT EXISTS devotional_plan_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  audit_run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  series_slug TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  timezone_offset_minutes INTEGER NOT NULL DEFAULT 0,
  start_policy TEXT NOT NULL CHECK (start_policy IN ('monday_cycle', 'tuesday_archived_monday', 'wed_sun_onboarding')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_start_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_instances_token ON devotional_plan_instances(plan_token);
CREATE INDEX IF NOT EXISTS idx_plan_instances_session ON devotional_plan_instances(session_token);

CREATE TABLE IF NOT EXISTS devotional_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_token UUID NOT NULL REFERENCES devotional_plan_instances(plan_token) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 0 AND day_number <= 7),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_token, day_number)
);

CREATE TABLE IF NOT EXISTS devotional_day_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id UUID NOT NULL REFERENCES devotional_plan_days(id) ON DELETE CASCADE,
  endnote_index INTEGER NOT NULL CHECK (endnote_index >= 1),
  source TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_day_citations_plan_day ON devotional_day_citations(plan_day_id);

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL,
  devotional_slug TEXT NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('note', 'highlight', 'sticky', 'sticker')),
  anchor_text TEXT,
  body TEXT,
  style JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotations_session ON annotations(session_token);
CREATE INDEX IF NOT EXISTS idx_annotations_slug ON annotations(devotional_slug);

CREATE TABLE IF NOT EXISTS session_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL,
  devotional_slug TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_token, devotional_slug)
);

CREATE INDEX IF NOT EXISTS idx_session_bookmarks_session ON session_bookmarks(session_token);

CREATE TABLE IF NOT EXISTS mock_account_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('anonymous', 'mock_account')),
  analytics_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mock_account_sessions_set_updated_at ON mock_account_sessions;
CREATE TRIGGER mock_account_sessions_set_updated_at
BEFORE UPDATE ON mock_account_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotional_plan_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotional_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotional_day_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_account_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_audit_runs'
  ) THEN
    CREATE POLICY allow_all_audit_runs ON audit_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_audit_options'
  ) THEN
    CREATE POLICY allow_all_audit_options ON audit_options FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_consent_records'
  ) THEN
    CREATE POLICY allow_all_consent_records ON consent_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_audit_selections'
  ) THEN
    CREATE POLICY allow_all_audit_selections ON audit_selections FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_plan_instances'
  ) THEN
    CREATE POLICY allow_all_plan_instances ON devotional_plan_instances FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_plan_days'
  ) THEN
    CREATE POLICY allow_all_plan_days ON devotional_plan_days FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_day_citations'
  ) THEN
    CREATE POLICY allow_all_day_citations ON devotional_day_citations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_annotations'
  ) THEN
    CREATE POLICY allow_all_annotations ON annotations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_session_bookmarks'
  ) THEN
    CREATE POLICY allow_all_session_bookmarks ON session_bookmarks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_mock_account_sessions'
  ) THEN
    CREATE POLICY allow_all_mock_account_sessions ON mock_account_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
