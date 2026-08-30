# Homepage Devotional Redesign — Handoff Doc

**Status:** PLANNING ONLY. No production code changes have been made this session.
**Source:** the 2026-05-04 image-generation campaign (~615 new assets in `public/images/generated-2026-05-04/`).
**For:** the next supervised Claude session that will execute homepage devotional redesign work with the founder watching the diff.
**Sibling docs:** `MANIFEST.md`, `SITE-REPLACEMENT-PLAN.md`, `BRAND-BIBLE-AUDIT.md`, `2026-05-04-site-changes.md`.

---

## 1 — Current homepage shape (so you know what's there before you change it)

`src/app/page.tsx` (557 lines) renders, top-to-bottom:

| Section                                                      | Anchor / class                             | Devotional touchpoint? |
| ------------------------------------------------------------ | ------------------------------------------ | ---------------------- |
| Shell header                                                 | `<EuangelionShellHeader />`                | Wordmark + nav         |
| **Hero — Soul Audit prompt OR "MY DEVOTIONAL" resume state** | `.homepage-hero` `#start-audit`            | **YES — primary**      |
| Section centerpiece title                                    | `.mock-section-center` ("How this works.") | No                     |
| **3-step "How This Works" cards**                            | `.mock-steps-grid`                         | **YES — supporting**   |
| **Featured Series rail** (`<SeriesRailSection>`)             | `cardVariant="large"`                      | **YES — primary**      |
| "More devotionals" CTA                                       | `.mock-more-row`                           | Link only              |
| Carousel FAQ row                                             | `.mock-faq-row`                            | No                     |
| Bottom CTA ("Start with one honest sentence" / resume)       | `.mock-cta`                                | **YES — supporting**   |
| Site footer + bottom EUANGELION masthead                     | —                                          | No                     |

Five devotional touchpoints on the homepage. The redesign work targets the four image-bearing ones.

---

## 2 — What's already shipping vs. what was discussed

### 2.1 Hero rotation (`HOMEPAGE_HEROES` in `src/app/page.tsx:44–60`)

**Currently live, 6 webp images in `/public/images/site/homepage/hero/`:**

- `hero-pillar-light.webp`
- `hero-prophet.webp`
- `hero-shepherd-carry.webp`
- `hero-cypress.webp`
- `hero-jacob-ladder.webp`
- `hero-pilgrim.webp`

Rotation: deterministic by UTC day-of-year mod 6. No hydration mismatch. Tall-narrow column (228px on desktop, 100vw mobile).

**Discussed in this session:** expand the pool by 4–8 candidates from the new ultrawide library to give the daily rotation more variety. Top candidates that survive the 228px-wide tall-narrow crop without losing the subject:

| New library file                                                             | Theme                         | Why it fits the column             |
| ---------------------------------------------------------------------------- | ----------------------------- | ---------------------------------- |
| `hero/banner-stone-tomb-dawn.png` (or `nt-resurrection-empty-tomb-dawn.png`) | Resurrection / new beginning  | Vertical light shaft survives crop |
| `hero/nt-baptism-jordan-dove-ultrawide.png`                                  | Baptism / new beginning       | Dove anchored center               |
| `hero/banner-river-jordan.png`                                               | Threshold / passage           | River vertical-friendly            |
| `hero/banner-vineyard-rows.png`                                              | Abundance / vine-and-branches | Receding rows hold center          |
| `hero/atmos-stormy-sea-ultrawide.png`                                        | Theophany / fear of the Lord  | Sky-heavy, vertical-friendly       |
| `hero/atmos-mountain-storm-ultrawide.png`                                    | Voice from the whirlwind      | Mountain anchors center            |
| `hero/nt-walking-on-water.png`                                               | Faith in chaos                | Standing figure center             |
| `hero/nt-gethsemane-prostrate.png`                                           | Lament / surrender            | Prostrate figure low-center        |

**Action for next session:**

1. Optimize the 4–8 selected `.png`s → `.webp` at the same size budget as the current 6 (~200–280 KB each)
2. Save to `public/images/site/homepage/hero/` with consistent naming
3. Append paths to `HOMEPAGE_HEROES` in `src/app/page.tsx`
4. Verify rotation determinism (UTC day mod new count)
5. Test 228px tall-narrow crop on desktop + 100vw mobile crop on phone

### 2.2 "How This Works" 3 step cards (`HOW_STEPS` in `src/app/page.tsx:15–31`)

**Currently live:**

- Step 1 ("Name it.") → `step-1-name.webp`
- Step 2 ("Read it.") → `step-2-read.webp`
- Step 3 ("Now Walk It Out.") → `step-3-walk.webp`

These three exist at `/public/images/site/homepage/steps/`. They sit in `.mock-step-image` containers.

**Discussed in this session:** swap to single-ink sym-icons or to scene halftones that match the action verb. Two design options:

**Option A — Sym-icon route (more iconic, less narrative):**

- Step 1 (Name) → `decorative/sym-hand-pointing-up-etched.png` or `sym-hand-extended-etched.png` (gesture of declaring/giving)
- Step 2 (Read) → `decorative/sym-scroll-open-etched.png` or `sym-open-scroll.png`
- Step 3 (Walk) → `decorative/sym-shepherd-crook-linocut.png` or `sym-doorway-arched-linocut.png` (threshold)

**Option B — Scene halftone route (more cinematic, more narrative):**

- Step 1 (Name) → a contemplative figure at a doorway or threshold (e.g., `chapter-header/beatitude-01-poor-in-spirit.png`)
- Step 2 (Read) → reading/study halftone (look in `devotional/` for scroll/study scenes)
- Step 3 (Walk) → a walking-pilgrim halftone (e.g., `chapter-header/nt-emmaus-road-sunset.png` cropped to square, or `hero/banner-river-jordan.png`)

Founder needs to pick A vs B before this swaps.

**Action for next session:**

1. Founder picks A or B
2. Optimize 3 chosen `.png`s → `.webp` matching the current step-image dimensions
3. Save to `public/images/site/homepage/steps/` (overwrite or rename + update HOW_STEPS paths)
4. Verify visual rhythm against the current copy ("1. Name it." / "2. Read it." / "3. Now Walk It Out.")

### 2.3 Featured Series rail (`<SeriesRailSection>` rendering `FEATURED_SERIES`)

**Currently live, 4 featured slugs in `src/data/series.ts:1036–1041`:**

- `identity` → `/images/site/series/identity.webp`
- `too-busy-for-god` → `/images/site/series/too-busy-for-god.webp`
- `why-jesus` → `/images/site/series/why-jesus.webp`
- `hope` → `/images/site/series/hope.webp`

(Page renders the first 6 deduped from `[...FEATURED_SERIES, ...ALL_SERIES_ORDER]` — see `page.tsx:109–113`.)

The page-level component pulls from a 32-series catalog where each `heroImage` lives at `/public/images/site/series/[slug].webp` (32 webps confirmed on disk).

**Discussed in this session:** for at least the 4 featured slugs (and ideally 12–16 of the 32 series), swap `heroImage` to assets generated this campaign. Specific candidates per `SITE-REPLACEMENT-PLAN.md` Tier 2:

| Series slug        | Theme                | Recommended new asset                                                                                            |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `identity`         | Identity in Christ   | `chapter-header/nt-transfiguration-mountain.png` (or beatitude-04 hunger-righteousness for "who am I?" register) |
| `too-busy-for-god` | Stillness            | `chapter-header/fruit-03-peace-dove-boat.png` (still water, anchored stillness)                                  |
| `why-jesus`        | Foundational claim   | `chapter-header/nt-sermon-mount-crowd.png` or `hero/nt-resurrection-empty-tomb-dawn.png`                         |
| `hope`             | Hope under suffering | `chapter-header/beatitude-08-persecuted.png` or `decorative/sym-anchor-hope-linocut.png`                         |

For non-featured series, see `SITE-REPLACEMENT-PLAN.md` Tier 2 for the broader thematic mapping.

**Action for next session:**

1. Founder approves a focused set of 4–16 series swaps
2. Optimize each chosen `.png` → `.webp` at the series-hero dimensions
3. Save to `public/images/site/series/[slug].webp` (overwriting existing webps)
4. No code changes required — `series.ts` paths stay the same; the file behind each path is what's swapped

### 2.4 "MY DEVOTIONAL" resume state (`page.tsx:254–276`)

When `resumeRoute` is non-null, the hero column flips to:

- Kicker: "MY DEVOTIONAL"
- Title: "You have a devotional waiting."
- Body: "Continue where you left off. Your current path is ready."
- Primary button: "CONTINUE MY DEVOTIONAL" → `resumeRoute`
- Reset button: "Reset Audit"

**Discussed in this session:** no visual changes needed. The resume state is wired and works. The hero column on the left still uses the same `HOMEPAGE_HEROES` rotation in either state, so any hero expansion automatically applies here too.

**Action for next session:** none specific — confirms that the hero rotation work in §2.1 covers this state.

### 2.5 Bottom CTA section (`page.tsx:516–544`)

When no resume: kicker "READY TO BEGIN?" + "Start with one honest sentence." + "START YOUR SOUL AUDIT" anchor link to `#start-audit`.
When resume: "Your devotional is ready to continue." + "CONTINUE MY DEVOTIONAL" link.

**Discussed in this session:** consider adding a subtle decorative element behind the CTA — a halftone halo disk or sunburst banner — to give the section visual weight without competing with copy. Candidates:

- `decorative/brand-halftone-halo-disk.png` (faded behind kicker)
- `decorative/brand-sunburst-banner.png` (soft horizontal banner backing)
- `decorative/brand-rays-banner-charcoal.png`

**Action for next session:** founder decides if CTA needs a backdrop; if yes, add as a CSS background-image on `.mock-cta` at low opacity (~6–10%) — purely decorative, no semantic content.

---

## 3 — Daily-bread page (separate surface, mentioned because it's the other primary devotional touch)

`src/app/daily-bread/page.tsx` exists. Not part of homepage redesign per se but worth noting: any homepage hero candidates that don't make the rotation could feed daily-bread's hero/banner if it has one. Out of scope for this handoff unless founder flags it.

---

## 4 — Order of operations for the next session

1. **Founder picks** — open `public/images/generated-2026-05-04/` and approve specific filenames for: hero pool expansion, HOW_STEPS option (A or B), featured series swaps, optional CTA backdrop.
2. **Image optimization** — convert the approved `.png`s to `.webp` at sizes matching what the page expects:
   - Hero rotation: ~228px wide tall-narrow column → ~456px @2x, target 200–280 KB
   - HOW_STEPS: ~320px wide cards → ~640px @2x, target ~150 KB
   - Series heroes: match existing series webp dimensions
   - CTA backdrop: full-width, soft (low opacity), can be larger
3. **File placement** — drop into existing folders:
   - `public/images/site/homepage/hero/`
   - `public/images/site/homepage/steps/`
   - `public/images/site/series/[slug].webp` (overwrite)
4. **Code edits** — only `src/app/page.tsx` (`HOMEPAGE_HEROES` array if expanding hero pool; `HOW_STEPS` paths if changing step images). `src/data/series.ts` only if a featured slug needs a renamed file. CSS edits in the homepage stylesheet only if CTA backdrop is approved.
5. **Local verify** — `npm run dev` on port 3333. Check:
   - Homepage at 375px, 768px, 1024px viewports
   - Light + dark mode (homepage uses `.newspaper-home` cobalt mode)
   - Resume state (visit `/soul-audit` and submit, then return to `/`)
   - All hero rotation candidates render without crop disasters
6. **Preflight** — `npm run type-check && npm run verify:production-contracts && npm run verify:tracking && npm run lint && npm test`
7. **Commit + deploy** — supervised, founder reviews diff before commit.

---

## 5 — Hard limits (do not violate without founder authorization)

| Limit                                                                                                                                           | Why                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **No `npm run deploy` until verified locally**                                                                                                  | CLAUDE.md rule — never push to "test if it works"                                            |
| **No silent fallbacks**                                                                                                                         | If an image path 404s, surface it; don't degrade to a placeholder                            |
| **No partial swap**                                                                                                                             | If approving a featured series swap, complete it (rename + verify) — don't ship a half-state |
| **No new files without asking**                                                                                                                 | Per CLAUDE.md rule — flag the file before creating                                           |
| **Don't touch `relatedArtworks[]` in Wake-Up devotionals**                                                                                      | Out of scope for homepage; that's a separate triage                                          |
| **Don't regenerate images**                                                                                                                     | This handoff assumes the 615 already exist; no Gemini calls                                  |
| **No English/Latin overlay text in any new generation**                                                                                         | Hebrew/Greek is allowed where biblically natural                                             |
| **Lamb mark eye-count** must be deterministically verified before any Lamb plate is committed as canonical (use `scripts/lamb-eyes-overlay.py`) | Gemini cannot reliably count to 7                                                            |

---

## 6 — Verifying nothing else breaks

After homepage redesign work, sanity-check that these still render correctly:

- `/series` (uses same `series.ts` `heroImage` paths in `<SeriesRailSection>`)
- `/wake-up/series/[slug]` (also reads `heroImage`)
- `/wake-up/devotional/[slug]` first day (renders inline art via `<DevotionalArtwork>`)
- `/daily-bread` (any rail using series data)

If any of those break, the swap touched a path that's wider than just the homepage — back out and triage.

---

## 7 — File pointers

| Source                                     | What's in it                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `src/app/page.tsx`                         | Homepage layout — start here                                                    |
| `src/data/series.ts`                       | 32 series objects with `heroImage` + `FEATURED_SERIES` array                    |
| `src/components/SeriesRailSection.tsx`     | Rail rendering for featured series                                              |
| `src/components/EuangelionShellHeader.tsx` | Top nav + wordmark                                                              |
| `public/images/site/homepage/`             | All current homepage production webps (hero/, steps/)                           |
| `public/images/site/series/`               | All 32 series hero webps                                                        |
| `public/images/generated-2026-05-04/`      | The 615 new assets — read MANIFEST.md first                                     |
| `docs/brand/BRAND-BIBLE.md`                | Authoritative brand spec — §3.1 wordmarks, §7.2 subject vocab, §7.4 composition |

---

**This is a planning handoff. No code or asset paths in the live tree have been modified by the 2026-05-04 generation session. The next session resumes with the founder's approval list in hand and executes the swaps under supervision.**

— Generated by Claude Code
