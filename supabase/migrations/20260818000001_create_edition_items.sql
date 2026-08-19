-- The Daily Bread edition engine — SA-090 / F-136 (founder-directed 2026-08-18)
--
-- One table holds every section of every edition. A "kind" is a section of the
-- paper; a "slot" is the ordinal within a kind for the sections that run more
-- than one entry per edition (guides, screening room).
--
-- WHY A TABLE AND NOT A COMMITTED FILE. Cloudflare Cron is inert in this
-- project (wrangler.jsonc triggers.crons commented out; the OpenNext worker
-- exports only `fetch`), and auto-deploy on push to main is not reliably
-- firing. Any design where tomorrow's paper requires a deploy inherits this
-- project's most failure-prone operation every single day. Rows publish
-- without a commit and without a deploy.

CREATE TABLE IF NOT EXISTS public.edition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which section of the paper this is.
  kind TEXT NOT NULL CHECK (kind IN (
    'lead', 'rail', 'season',
    'word', 'practice', 'guide',
    'strip',
    'crossword', 'unscramble', 'quiz',
    'gallery', 'screening',
    'prayer', 'witness', 'letter', 'notice'
  )),

  -- The edition this belongs to, in UTC. Two readers opening the paper on the
  -- same morning read the same edition; that property is what makes it an
  -- edition rather than a feed.
  publish_date DATE NOT NULL,

  -- Ordinal within a kind, for kinds that run several entries per edition.
  slot INTEGER NOT NULL DEFAULT 0 CHECK (slot >= 0),

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'published', 'rejected')),

  -- Section-shaped content, validated in TypeScript by the per-kind guards in
  -- src/lib/edition/kinds.ts before it is ever written.
  payload JSONB NOT NULL,

  -- Attribution. A dispatch without attribution is a rumour (F-098), so for
  -- third-party kinds these are enforced NOT NULL by the CHECK below rather
  -- than left to convention.
  source_name TEXT,
  source_url TEXT,

  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Third-party content must carry its source. This is the invention line,
  -- expressed as a constraint.
  CONSTRAINT edition_items_third_party_needs_source CHECK (
    kind <> 'screening'
    OR (source_name IS NOT NULL AND source_url IS NOT NULL)
  )
);

-- One entry per (section, day, ordinal).
CREATE UNIQUE INDEX IF NOT EXISTS edition_items_kind_date_slot_key
  ON public.edition_items (kind, publish_date, slot);

-- The read path: assemble one edition by date.
CREATE INDEX IF NOT EXISTS edition_items_published_idx
  ON public.edition_items (publish_date, kind)
  WHERE status = 'published';

-- The review queue: everything waiting on the founder, oldest first.
CREATE INDEX IF NOT EXISTS edition_items_draft_idx
  ON public.edition_items (publish_date, kind)
  WHERE status = 'draft';

COMMENT ON TABLE public.edition_items IS
  'Sections of The Daily Bread, one row per (kind, publish_date, slot). SA-090/F-136. Deterministic kinds (prayer, word, puzzles, gallery, season, witness) are computed from the corpus and lexicon already in the repo and write in as approved; invented voice and third-party items land as draft and pass the review queue.';

ALTER TABLE public.edition_items ENABLE ROW LEVEL SECURITY;

-- The paper is public, but ONLY what has actually been published. Drafts are
-- invisible to anon and authenticated alike; the review queue reads through
-- the service role.
DROP POLICY IF EXISTS edition_items_public_read_published ON public.edition_items;
CREATE POLICY edition_items_public_read_published
  ON public.edition_items
  FOR SELECT
  USING (status = 'published');

-- No INSERT/UPDATE/DELETE policies: deny-by-default. The generator runner and
-- the admin queue both write with the service role.
