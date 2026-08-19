-- ═══════════════════════════════════════════════════════════════════════
--  EUANGELION — PASTE #2 for tonight (Supabase SQL editor, same as before)
--  SA-092: Daily Bread grows to ~30 modules/day — 7 new section kinds.
--  SAFETY: widens a CHECK constraint (accepts MORE, never less) + additive.
--  EXPECTED: "Success. No rows returned."
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.edition_items
  DROP CONSTRAINT IF EXISTS edition_items_kind_check;

ALTER TABLE public.edition_items
  ADD CONSTRAINT edition_items_kind_check CHECK (kind IN (
    'lead', 'rail', 'season',
    'word', 'practice', 'guide',
    'strip',
    'crossword', 'unscramble', 'quiz',
    'gallery', 'screening',
    'prayer', 'witness', 'letter', 'notice',
    -- SA-092 additions: the paper grows to ~30 modules a day
    'redletter',   -- a saying of Jesus, from the red-letter data
    'proverb',     -- a proverb a day, BSB verbatim
    'verse',       -- the week's memory verse
    'archive',     -- from the archive: an older devotional, resurfaced
    'b365',        -- today in the Bible-365 reading plan
    'voices',      -- a historic voice from the reference library, attributed
    'question'     -- the day's reflection question (reviewed editorial)
  ));
