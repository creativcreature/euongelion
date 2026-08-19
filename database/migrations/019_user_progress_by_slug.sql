-- ─── Reading progress by slug ───────────────────────────────────────
-- Finish a devotional on your phone, see it finished on your laptop.
--
-- WHY THIS MIGRATION EXISTS AT ALL. `user_progress` has been in the schema
-- since migration 004 and NO app code has ever read or written it, for a
-- reason that is invisible until you try: its key is
-- `devotional_id UUID NOT NULL REFERENCES public.devotionals(id)`, and the
-- 175 devotionals this product actually serves live as JSON under
-- `public/devotionals/`, not as rows in `public.devotionals` (seeded with 3
-- rows, and custom-generated plans are never seeded at all). Every write
-- keyed by the slug the app really has would fail the foreign key. The table
-- was unusable, not merely unused.
--
-- Every other reader-owned table added since — `session_bookmarks`,
-- `annotations`, `listening_progress` — is keyed by `devotional_slug TEXT`
-- for exactly this reason. This migration brings `user_progress` in line
-- rather than adding a fourth progress table beside the three that exist.
--
-- SAFETY: additive and constraint-RELAXING only.
--   * a new nullable column cannot affect any existing row or query;
--   * dropping NOT NULL widens what the table accepts, so nothing that was
--     valid before becomes invalid;
--   * the legacy `unique_user_devotional (user_id, devotional_id)` constraint
--     stays. Postgres treats NULLs as distinct in a unique constraint, so
--     slug-keyed rows (devotional_id NULL) never collide with each other or
--     with any legacy id-keyed row.
-- Until it IS applied, reading progress degrades to on-device only — the
-- behaviour that shipped before this feature — and logs
-- CONFIG_FEATURE_DISABLED with `migration: 019_user_progress_by_slug` rather
-- than failing silently.

ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS devotional_slug TEXT;

-- The slug is now the key. `devotional_id` remains for any historical row and
-- for a future in which the catalog does live in Postgres.
ALTER TABLE public.user_progress
  ALTER COLUMN devotional_id DROP NOT NULL;

-- One completion row per reader per devotional. Deliberately NOT a partial
-- index: PostgREST's `on_conflict` cannot emit the matching WHERE clause that
-- Postgres needs to infer a partial index, so the upsert would fail to match
-- it and insert duplicates instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_progress_user_slug
  ON public.user_progress (user_id, devotional_slug);
