-- 009: Create Soul Audit tables
-- These tables support the entire Soul Audit flow:
--   submit → consent → select → plan creation → cascade day generation
--
-- Without these tables, all data lives only in serverless function memory
-- and is lost between Vercel invocations, breaking cross-request flows
-- like cascade day generation (generate-next).

-- ─── Audit Runs ─────────────────────────────────────────────────────
-- One row per Soul Audit submission. Stores the user's reflection text
-- and whether crisis content was detected.
CREATE TABLE IF NOT EXISTS audit_runs (
  id              TEXT PRIMARY KEY,
  session_token   TEXT NOT NULL,
  response_text   TEXT NOT NULL,
  crisis_detected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_session
  ON audit_runs (session_token);

-- ─── Audit Options ──────────────────────────────────────────────────
-- The 5 devotional pathway options generated for each audit run.
-- Stored as JSONB to preserve the full AuditOptionPreview shape
-- including planOutline for ai_generative options.
CREATE TABLE IF NOT EXISTS audit_options (
  id              TEXT PRIMARY KEY,
  audit_run_id    TEXT NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  title           TEXT NOT NULL,
  question        TEXT NOT NULL,
  confidence      DOUBLE PRECISION NOT NULL DEFAULT 0,
  reasoning       TEXT NOT NULL DEFAULT '',
  rank            INTEGER NOT NULL DEFAULT 0,
  preview         JSONB,
  "planOutline"   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_options_run
  ON audit_options (audit_run_id);

-- ─── Audit Option Telemetry ─────────────────────────────────────────
-- Analytics for option generation strategy and quality.
CREATE TABLE IF NOT EXISTS audit_option_telemetry (
  id                   TEXT PRIMARY KEY,
  audit_run_id         TEXT NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  session_token        TEXT NOT NULL,
  strategy             TEXT NOT NULL,
  split_valid          BOOLEAN NOT NULL DEFAULT TRUE,
  ai_primary_count     INTEGER NOT NULL DEFAULT 0,
  curated_prefab_count INTEGER NOT NULL DEFAULT 0,
  avg_confidence       DOUBLE PRECISION NOT NULL DEFAULT 0,
  response_excerpt     TEXT NOT NULL DEFAULT '',
  matched_terms        JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Consent Records ────────────────────────────────────────────────
-- Tracks user consent for essential data processing and optional analytics.
CREATE TABLE IF NOT EXISTS consent_records (
  id                   TEXT PRIMARY KEY,
  audit_run_id         TEXT NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  session_token        TEXT NOT NULL,
  essential_accepted   BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_opt_in     BOOLEAN NOT NULL DEFAULT FALSE,
  crisis_acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_run
  ON consent_records (audit_run_id);

-- ─── Audit Selections ───────────────────────────────────────────────
-- Records which option the user selected from the 5 presented.
CREATE TABLE IF NOT EXISTS audit_selections (
  id           TEXT PRIMARY KEY,
  audit_run_id TEXT NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  option_id    TEXT NOT NULL,
  option_kind  TEXT NOT NULL,
  series_slug  TEXT NOT NULL,
  plan_token   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_selections_run
  ON audit_selections (audit_run_id);

CREATE INDEX IF NOT EXISTS idx_selections_plan_token
  ON audit_selections (plan_token);

-- ─── Devotional Plan Instances ──────────────────────────────────────
-- The master plan record. One per selected option.
-- Contains scheduling metadata (timezone, start policy, onboarding).
CREATE TABLE IF NOT EXISTS devotional_plan_instances (
  id                       TEXT PRIMARY KEY,
  plan_token               TEXT NOT NULL UNIQUE,
  audit_run_id             TEXT NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  session_token            TEXT NOT NULL,
  series_slug              TEXT NOT NULL,
  timezone                 TEXT NOT NULL DEFAULT 'UTC',
  timezone_offset_minutes  INTEGER NOT NULL DEFAULT 0,
  start_policy             TEXT NOT NULL DEFAULT 'monday_cycle',
  onboarding_variant       TEXT,
  onboarding_days          INTEGER,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_start_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_instances_token
  ON devotional_plan_instances (plan_token);

CREATE INDEX IF NOT EXISTS idx_plan_instances_session
  ON devotional_plan_instances (session_token);

CREATE INDEX IF NOT EXISTS idx_plan_instances_run
  ON devotional_plan_instances (audit_run_id);

-- ─── Devotional Plan Days ───────────────────────────────────────────
-- Individual day content for each plan. Content stored as JSONB
-- (the full CustomPlanDay shape including modules, endnotes, etc.).
-- generationStatus is extracted for cross-instance pending checks.
CREATE TABLE IF NOT EXISTS devotional_plan_days (
  id          TEXT PRIMARY KEY,
  plan_token  TEXT NOT NULL REFERENCES devotional_plan_instances(plan_token) ON DELETE CASCADE,
  day_number  INTEGER NOT NULL,
  content     JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_token, day_number)
);

CREATE INDEX IF NOT EXISTS idx_plan_days_token
  ON devotional_plan_days (plan_token);

-- ─── Devotional Day Citations ───────────────────────────────────────
-- Extracted endnotes/citations for each generated day.
-- Used for reference tracking and composition auditing.
CREATE TABLE IF NOT EXISTS devotional_day_citations (
  id             TEXT PRIMARY KEY,
  plan_day_id    TEXT NOT NULL REFERENCES devotional_plan_days(id) ON DELETE CASCADE,
  endnote_index  INTEGER NOT NULL DEFAULT 0,
  source         TEXT NOT NULL DEFAULT '',
  note           TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citations_day
  ON devotional_day_citations (plan_day_id);

-- ─── Mock Account Sessions ──────────────────────────────────────────
-- Tracks anonymous/mock account sessions for guest users.
CREATE TABLE IF NOT EXISTS mock_account_sessions (
  id               TEXT PRIMARY KEY,
  session_token    TEXT NOT NULL UNIQUE,
  mode             TEXT NOT NULL DEFAULT 'anonymous',
  analytics_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Annotations ────────────────────────────────────────────────────
-- User notes, highlights, stickies on devotional content.
CREATE TABLE IF NOT EXISTS annotations (
  id               TEXT PRIMARY KEY,
  session_token    TEXT NOT NULL,
  devotional_slug  TEXT NOT NULL,
  annotation_type  TEXT NOT NULL DEFAULT 'note',
  anchor_text      TEXT,
  body             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotations_session
  ON annotations (session_token);

-- ─── RLS Policies ───────────────────────────────────────────────────
-- Enable RLS on all tables. The app uses the service_role key
-- (bypasses RLS) for server-side operations, but RLS provides
-- defense-in-depth if the anon key is ever exposed.

ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_option_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotional_plan_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotional_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotional_day_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_account_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- No anon policies needed since all access is server-side via service_role.
