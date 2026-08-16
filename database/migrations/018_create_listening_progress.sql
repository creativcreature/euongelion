-- ─── Listening progress ─────────────────────────────────────────────
-- Cross-device audio resume: start a reading on your phone, finish it on
-- your laptop.
--
-- Founder-approved 2026-08-16. That approval is what SA-039 §2 requires
-- before any production DDL, and it is recorded here because the next
-- person to read this file will want to know it was not taken unilaterally.
--
-- SHAPE: one upserted row per reader per devotional — deliberately NOT an
-- append-only event log. A log would write on every timeupdate tick for no
-- benefit, and Cloudflare Workers gives each request 10ms of CPU.
-- `seconds_listened` accumulates real playback time instead, so a later
-- year-in-review can total hours across the catalog without an events table.
--
-- SAFETY: additive and idempotent. Applying it cannot affect anything already
-- running; until it IS applied, the resume feature degrades to on-device only
-- (which is the behaviour that shipped before it) and logs
-- MIGRATION_018_PENDING rather than failing silently.

CREATE TABLE IF NOT EXISTS listening_progress (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devotional_slug   TEXT NOT NULL,
  -- Where they stopped. Resume reads this.
  position_seconds  REAL NOT NULL DEFAULT 0,
  -- Track length at the time of writing, so progress can be shown as a
  -- fraction without loading the audio manifest.
  duration_seconds  REAL,
  -- Cumulative time actually spent listening, NOT position. A reader who
  -- replays a passage three times listened three times; position says nothing
  -- about that.
  seconds_listened  REAL NOT NULL DEFAULT 0,
  completed_at      TIMESTAMPTZ,
  first_played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The conflict-resolution key: across devices the NEWER write wins, never
  -- the further position. A reader who deliberately restarts on their phone
  -- must not be dragged back to where the laptop left off.
  last_played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, devotional_slug)
);

CREATE INDEX IF NOT EXISTS idx_listening_progress_user
  ON listening_progress (user_id, last_played_at DESC);

ALTER TABLE listening_progress ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS automatically and all access is server-side,
-- matching the model established in migration 009. No anon policies needed.
