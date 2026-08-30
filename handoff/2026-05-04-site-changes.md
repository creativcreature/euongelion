# Site Changes — Handoff Doc for Next Session

**Status:** PLANNING ONLY. No production code or asset paths have been modified this session.
**For:** the next Claude Code session that will execute supervised site updates.
**From:** the 2026-05-04 image-generation session — see also `MANIFEST.md`, `SITE-REPLACEMENT-PLAN.md`, `BRAND-BIBLE-AUDIT.md`, `OVERNIGHT-DIRECTIVE-REVIEW.md` in this same folder.

---

## 1 — What was generated this session

**~615 images** in `public/images/generated-2026-05-04/`, organized into 5 surfaces:

| Folder            | Count | Use                                                                               |
| ----------------- | ----- | --------------------------------------------------------------------------------- |
| `hero/`           | ~75   | Homepage / featured hero rotation (21:9, 16:9, 3:2)                               |
| `chapter-header/` | ~110  | Series chapter heroes + Beatitudes + Fruits + Plagues + parable banners           |
| `devotional/`     | ~210  | Inline devotional art (1:1, 4:5, 9:16, etc.)                                      |
| `decorative/`     | ~110  | Single-ink sym icons (74 §7.2-vocabulary objects) + pull-quote backgrounds        |
| `logo-system/`    | ~120  | Wordmarks (6 refined + 35 color variants), Lamb treatments (7+25), lockups (5+19) |

Brand bible coverage verified against `docs/brand/BRAND-BIBLE.md` — see `BRAND-BIBLE-AUDIT.md` in this folder for the §-by-§ cross-reference. **All §3.1 / §3.2 / §3.3 / §3.4 / §7.2 / §7.3 specs are accounted for.**

---

## 2 — Site changes the founder discussed (status: proposed, not executed)

### 2.1 Homepage (`src/app/page.tsx`)

- **Hero rotation** — replace whatever currently anchors the landing region with rotating ultrawide hero (21:9 or 16:9). Recommended starters from the new library:
  - `hero/atmos-stormy-sea-ultrawide.png` (theophany / fear-of-the-Lord)
  - `hero/banner-river-jordan.png` / `hero/nt-baptism-jordan-dove-ultrawide.png` (baptism, new beginning)
  - `hero/banner-stone-tomb-dawn.png` / `hero/nt-resurrection-empty-tomb-dawn.png` (resurrection)
  - `hero/banner-vineyard-rows.png` (abundance / vine-and-branches)
  - `hero/nt-sermon-mount-crowd.png` (teaching / community)
- **Wordmark behavior** — `src/data/series.ts` and the masthead component currently render Industry caps (variant 7 per §3.1). The 6 refined hand-generated wordmarks (`logo-system/wordmark-variants/wordmark-01..06-REFINED.png`) need to be SVG-traced before they can join the rotation per §3.1 deployment spec. **Vector tracing is a downstream production step, not part of this generation session.**

### 2.2 Series chapter heroes (`src/data/series.ts`)

The 32 series each have a `heroImage` path. Current values point to the legacy 369-print batch in `public/images/devotional-prints/`. Recommended swaps from the new library are mapped in `SITE-REPLACEMENT-PLAN.md` Tier 2. Approximately **12–16 series** are clear thematic upgrades; others can stay on the legacy assets.

Touch points: `src/data/series.ts:1004-1009` (`FEATURED_SERIES`), plus per-series `heroImage` field updates throughout the file.

### 2.3 Inline devotional art (`public/devotionals/*.json`)

The 175 devotionals with `art` modules currently reference the 369-print batch. Most should stay. ~10–15 specific devotionals are clear thematic upgrades — see `SITE-REPLACEMENT-PLAN.md` Tier 3 for the proposed mapping table (daily-bread → `sym-bread-wine-table`, lost-and-found → `lamb-shepherd-carry-vertical`, suffering → `ot-job-ash-heap`, etc.).

Touch points: the `art.slug` fields in individual devotional JSONs.

### 2.4 New decorative utility (no replacement — net-new additions)

The 74 `sym-*` single-ink icons + decorative backgrounds (`brand-pull-quote-burgundy`, `brand-sunburst-banner`, `brand-halftone-halo-disk`, `brand-stained-glass-abstract`, `brand-paper-torn-edge`) are net-new to the asset library. They have no current site reference but are ready for use as:

- Verse-of-day card backgrounds
- Section dividers / hero backgrounds
- Devotional inline accents
- Footer marks
- Pull-quote frames

### 2.5 Brand-bible audit (no code changes — audit only)

`BRAND-BIBLE-AUDIT.md` confirms every §-spec is covered. Founder should:

1. Triage `seven-eyed-lamb/` plates and pick a winning treatment (eye-count caveat below)
2. Approve a wordmark variant set for SVG vectorization
3. Approve lockup configurations
4. Approve the sym-icon library before SVG vectorization

---

## 3 — What's NOT done (next-session execution plan)

### Step 1 — Founder triage (manual, not Claude work)

Walk through `hero/`, `chapter-header/`, `devotional/`, `decorative/`, `logo-system/`. Mark winners and rejects. Probably 15–25% of any AI batch underperforms; flag those for regen or removal.

Suggested output: `public/images/generated-2026-05-04/APPROVED.txt` listing approved filenames.

### Step 2 — Lamb mark eye-count fix (deterministic Python pipeline)

**This is critical and must precede committing any Lamb plate as the canonical mark.** Gemini-generated Lamb plates are stylistically correct but consistently miscount the seven eyes.

The deterministic path already exists: `scripts/lamb-eyes-overlay.py`. Workflow:

1. Generate (or pick from existing) an **eyeless** lamb silhouette in the chosen treatment
2. Run `scripts/lamb-eyes-overlay.py` to overlay exactly 7 sketchy almond eyes via PIL (head bbox detection + intentional vertex jitter)
3. Save to `logo-system/seven-eyed-lamb/lamb-FINAL-{treatment}.png`
4. SVG-trace later

### Step 3 — Site swap execution (supervised Claude session)

Once the founder has marked APPROVED:

1. Update `src/data/series.ts` `heroImage` fields for the 12–16 approved series — single-file edit
2. Update the homepage page/Hero component to point at the new ultrawide hero(s)
3. Update the ~10–15 approved devotional JSONs' `art.slug` fields
4. Test locally (`npm run dev` on port 3333) — verify visual quality on actual pages
5. Run preflight: `npm run type-check && npm run lint && npm test`
6. Commit + deploy in a single supervised change

### Step 4 — SVG vectorization (downstream production step)

Per brand bible §7.5 step 4: shape-driven items (Lamb marks, sym icons) should be traced into clean SVG vectors. Wordmarks particularly — variants 01–06 must be SVG before they can rotate per §3.1. This is **not** Claude generation work — it's manual or scripted vector tracing (Adobe Illustrator Image Trace, or Inkscape CLI, or Vectornator). Out of scope for the next image session.

---

## 4 — Hard limits to preserve in the next session

| Limit                                                                          | Rationale                                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Don't touch production unsupervised**                                        | High blast radius — site is live at euangelion.app                                 |
| **Don't auto-replace Wake-Up `relatedArtworks[]`**                             | These are content-data mappings; founder approves per-devotional                   |
| **Verify Lamb eye-count via Python** before any treatment commits as canonical | Gemini cannot reliably count to 7                                                  |
| **No English/Latin overlay text** in any image                                 | Hebrew/Greek allowed where biblically natural (doorposts, scrolls)                 |
| **No 7-eyed Lamb regeneration** unless founder explicitly authorizes           | Founder is hand-designing the mark                                                 |
| **Single-ink discipline per §7.4**                                             | No multi-color sym icons; sacred-accent variants are the only allowed color shifts |

---

## 5 — Existing untouched assets (do NOT auto-replace)

- All 369 existing `public/images/devotional-prints/*` print-style artworks (the prior-session batch) — keep
- Wake-Up Magazine `relatedArtworks[]` mappings — keep
- The 7-eyed Lamb mark + brand wordmark system — founder is locking these
- Soul Audit visual treatment — no changes
- Footer + navigation imagery — no changes
- Print-style assets that have established usage in the codebase — keep until founder explicitly swaps

---

## 6 — File pointers for the next session

| Doc                             | What it is                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `MANIFEST.md`                   | Full inventory of generated assets + style locks captured                       |
| `SITE-REPLACEMENT-PLAN.md`      | Tier 1–4 proposed mappings (homepage / series / devotional / decorative)        |
| `BRAND-BIBLE-AUDIT.md`          | §3.1/§3.3/§3.4/§7.2/§7.3 coverage cross-reference, all 615 assets accounted for |
| `OVERNIGHT-DIRECTIVE-REVIEW.md` | Audit trail of the original directive — what was done, declined, why            |
| `SITE-CHANGES-HANDOFF.md`       | This file — operational handoff for the next supervised session                 |

`docs/brand/BRAND-BIBLE.md` is the authoritative source for any future asset decisions — read first if anything in this doc seems ambiguous.

---

## 7 — Cost / spend status

- ~615 images this campaign × $0.12/image ≈ **~$74 spent** on the active Gemini API key
- Authorized cap: $230 — well under the ceiling
- Active key: `AIzaSy...0jNY` (verified in `~/.claude/settings.json` and `~/.claude.json`)
- **Founder must rotate both keys** after the campaign ends (key was disclosed in transcript)

---

**This handoff is read-first material for the next session. No code changes have shipped from this session. Resume in a supervised window with the founder reviewing the diff before commit.**

— Generated 2026-05-04 by Claude Code
