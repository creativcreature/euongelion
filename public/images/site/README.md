# public/images/site/

The home for the **surfaced site image library** as of the
2026-05-07 image-swap migration.

Every image inside this tree is tracked in git, optimized for delivery
(WebP, quality 80), and actively rendered on production euangelion.app.

## Directory layout

```
public/images/site/
├── README.md                 (this file)
├── homepage/
│   ├── hero/                 6 WebPs — homepage hero rotation
│   │                         picked once per UTC day in src/app/page.tsx
│   └── steps/                3 WebPs — HOW_STEPS icons
├── series/                   32 WebPs — one per series, populated via
│                             src/data/series.ts:heroImage and consumed by
│                             src/components/SeriesHero.tsx + JSON-LD +
│                             RSS feed.
└── devotional/               266 WebPs — inline art for 175 devotionals,
                              indirected via src/data/site-devotional-art.ts
                              (each devotional gets 2 image picks; many
                              images serve multiple devotionals)
```

## Where these images came from

Two generative-AI batches sit at:

- `public/images/generated-2026-05-04/` (Gemini 3 Pro, 803 files, ~1.3 GB)
- `public/images/generated-2026-05-04-vertex/` (Vertex Imagen 4, 3,755 files, ~6.7 GB, `_DISCARD_*` excluded)

Both directories are gitignored — they're staging only.

`scripts/consolidate-image-library.mjs` walks both, dedupes by filename
(Gemini-preferred), categorizes by surface, and writes a deduped staging
tree to `public/images/library/<surface>/<filename>` (also gitignored).

The catalog (`docs/image-library-catalog-2026-05-08.json`) and the
founder-readable index (`docs/image-library-index-2026-05-08.md`) are
tracked — those are the founder's source of truth for "what's available."

## How to swap or add an image

**One series's hero:**
1. Edit the `MAPPING` table in `scripts/apply-series-hero-mapping.mjs`
2. Run `node scripts/apply-series-hero-mapping.mjs`
3. Commit `public/images/site/series/<slug>.webp` + `src/data/series.ts`

**Devotional inline art (mass refresh):**
1. Edit scoring logic or `PICKS_PER_DEVOTIONAL` in
   `scripts/build-devotional-art-mapping.mjs`
2. Run `node scripts/build-devotional-art-mapping.mjs`
3. Commit `public/images/site/devotional/*.webp` + `src/data/site-devotional-art.ts`

**One devotional override** (manual pick, e.g. founder direction on a
specific page):
1. Edit `src/data/site-devotional-art.ts` directly — change the entry for
   that slug.
2. Make sure the referenced WebP exists at `/images/site/devotional/<name>.webp`.
3. Commit.

**Homepage hero rotation:**
1. Edit `HOMEPAGE_HEROES` array in `src/app/page.tsx`
2. Drop new WebP into `public/images/site/homepage/hero/`
3. Commit.

## Where the OLD artist prints went

`public/images/devotional-prints/` (369 artworks, 1924 tracked files,
~150 MB) was archived to **`archive/devotional-prints/`** in this
migration. The `archive/` tree:

- Lives outside `public/` so it's NOT served by Cloudflare Workers
- Stays tracked in git (full history preserved)
- Reachable from the founder's local working tree for reference

If a future product (print product, limited release, etc.) needs the
artist prints back, restore them with `git mv archive/devotional-prints public/images/`
and re-run `npm run generate:artwork-manifest`.

## Pointers

- Migration plan: `docs/overnight-progress.md`
- Image library catalog: `docs/image-library-catalog-2026-05-08.json`
- Founder-readable index: `docs/image-library-index-2026-05-08.md`
- Brand bible (color, typography, image style): `docs/brand/BRAND-BIBLE.md`
- Lamb mark workstream (separate, deferred): `scripts/lamb-eyes-overlay.py`
