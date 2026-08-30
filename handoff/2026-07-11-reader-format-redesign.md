# Reader Format Redesign — Handoff

**Status:** Design exploration. **Nothing is on the live site.** This is a
worked prototype of a new devotional reading format, presented as claude.ai
artifacts for founder review. No production code, routes, or components were
touched.

**Date of work:** 2026-07-11. **Author:** cowork session (reader-experience).

---

## 1. What this was

Improve the **reading experience** of a devotional — the visual/literary
structure of the page, not the content. The founder's brief: the current reader
reads like _formatting_ (twelve bordered module boxes stacked), and wanted a
**distilled, centered, single-column read** that feels like a **textbook** in how
it's _displayed_ (not in content) — clear section-to-section distinction, related
content visually grouped, the reader always aware when a new concept begins.

Reference the founder liked (INPUT, not our work — content is deliberately wrong
in it, only the focused reading style matters):
`https://claude.ai/code/artifact/d31ebd6b-06ba-45cb-950a-15f11fdbe3d0`

---

## 2. The artifacts (deliverables to review)

| Artifact                                                                                         | What it shows                                                                                                             | Currency      |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Full series (CURRENT)** `https://claude.ai/code/artifact/b556a8a1-412c-4ee9-8d95-6bfca3c6b4a7` | All 7 days, 7-day switcher, no scripture underline, Greek parallels, recap + Sabbath. Light/dark, desktop + 375px mobile. | Most complete |
| Single day (earlier) `https://claude.ai/code/artifact/b15d2f84-1378-4866-9737-cf11c3988ffa`      | Day 1 only. Still shows the **blue scripture underline that was later removed** — superseded by the series artifact.      | Stale         |

The artifacts are self-contained HTML (real site fonts + stylesheet inlined).
Their full markup/CSS can be recovered any time with `WebFetch` on the URL — this
is the recovery path for the source, since the session scratchpad build scripts
were not preserved.

---

## 3. The approach that makes these accurate (important)

Early drafts **hand-built the site header and got it wrong** (rendered a fake
header; also grabbed the WAKE UP silo instead of EUANGELION). The fix, and the
method any future iteration must keep:

1. Run the real app (`npm run dev`, port 3333).
2. Load the real page: **`/devotional/too-busy-for-god-day-1`** — this is the
   **`silo="euangelion"`** route (`src/app/devotional/[slug]/page.tsx:208`),
   which renders the **EUANGELION** masthead + SERIES breadcrumbs. The
   `/wake-up/devotional/[slug]` route is a _different silo_ (WAKE UP masthead) —
   the same devotional renders under **two brands at two URLs**; any format must
   work for both.
3. Extract, verbatim from the live DOM: `header.mock-shell-header`,
   `.devotional-shell-breadcrumb`, `footer.mock-site-footer`, `.mock-bottom-brand`.
4. Pull the compiled stylesheet (`globals.css`) and **inline every font** as a
   data URI (fonts: 5 site faces + 4 Next/Geist).
5. Build **only the reading column** new, on the **site's own tokens + utility
   classes** (`--color-gold`, `--color-text-*`, `--font-family-serif`,
   `.text-label`, `.text-gold`) so light/dark come straight from the design
   system — never hand-picked hex.
6. Port the site's masthead-fit JS (`EuangelionShellHeader.tsx:287-301`) or the
   wordmark overflows and the mobile page scrolls sideways.
7. Preview each breakpoint in its **own iframe** at a true device width so the
   site's real media queries fire.

**Theme note surfaced by using real tokens:** dark mode's accent is **amber
`#c8a56a`**, not cobalt; `mock-paper` goes deep indigo. Hand-built drafts had
invented a "lifted cobalt" — wrong. Inheriting real tokens fixed it.

---

## 4. Founder decisions LOCKED in this chat

- **Distilled single centered column**, textbook hierarchy: three "Parts" (The
  Text / The Teaching / The Practice) + Reference, eight numbered `§` sections,
  a callout family (key term, primary source, context, worth-knowing, Greek
  parallel, cross-reference, key insight), a running head, an "In this lesson" TOC.
  Each of the 12 modules maps to a typographic treatment, **not** a bordered box.
  Only ONE filled/bordered block remains in the read (the prayer).
- **Scripture leads** — the passage precedes the apparatus.
- **English leads the scripture block; Hebrew + transliteration follow** beneath
  a hairline as the supporting original (English largest, then Hebrew, then
  translit).
- **NO highlight/underline on scripture emphasis phrases** — the cobalt underline
  hurt readability. Scripture is set clean. (Removed in the series artifact;
  the single-day artifact still shows the old underline.)
- **Transliteration under every Hebrew AND Greek moment.**
- **Header image** above the column (container-width desktop, edge-to-edge mobile,
  re-cropped to 16:9 on phone). Plus **image and video media slots** in-body.
- **Mobile:** column edge-to-edge / images full-bleed to the device edge.
  **Desktop:** contained measure (~38rem), images contained with a hairline.
- Word-by-word gloss is **always visible** — not behind a `<details>` accordion
  (a textbook doesn't hide its apparatus).

Open toggle left in the artifact for the founder to answer:

- **Scripture UNDER title vs ABOVE title** — both built, toggle in the controls,
  **decision not yet made.**

---

## 5. OPEN DECISIONS — the real blockers before this can be built for real

1. **Days 6 & 7 are a CONTENT gap, not a layout one.**
   - The series has **6 days**, and **day 6 is NOT a recap** — it's a full
     12-module devotional on _zakhor_ ("remember your Creator") with its own word
     study, a profile of "Maria," six "remembrance rhythms," and a weekly
     challenge. The prototype's recap is assembled only from copy that already
     exists (each day's key insight + commitment + day 6's own scripture/prayer),
     which **discards ~67 written fields**. If day 6 becomes a recap, that writing
     is retired or repurposed — founder's call.
   - **Day 7 does not exist.** The prototype Sabbath page uses the **real Luke
     10:38-42 (BSB, read from `public/bibles/BSB/LUK.json`)** — which is the
     series' own declared framework (`framework: 'Luke 10:38-42 - Martha and
Mary'` in `src/data/series.ts`) — plus the series' own question. Both are
     real project data, but **the Sabbath devotional copy itself still has to be
     written.**
2. **What site chrome survives the redesign.** The live reader also has an **Audio
   Edition** player, a **"Day N of 6" pill**, a **folio strip**, and a
   **liturgical overline** ("7th week after Pentecost · Ordinary Time"), plus the
   2/3-image headline hero and sticky image rail. None are in the new column yet.
   Decide which return and where (a quiet toolbar was the proposed home).
3. **Imagery.** Placeholder art in the prototype is the reference mockup's Luke 10
   (Martha & Mary) scene — on-brief for the _series_ framework, but day 1's text
   is _Ecclesiastes_. Real per-day riso art (and the actual header/inline/video
   assets) must be produced per the locked imagery direction (luminous scenes on
   narrative surfaces; object plates for empty states only).
4. **Scripture under vs above title** (see §4).

---

## 6. Content-fidelity findings (generalize to all 175 devotionals)

Verifying the prototype against source JSON caught issues worth carrying forward:

- **Generate the column FROM the devotional JSON, never retype.** Hand-authoring
  led to 8 reworded author fields + a dropped question before this was caught.
  Generating from JSON made days 1-5 verify **100% verbatim** (68/82/79/86/84
  fields).
- **`insight.greekParallel` exists on days 2-6** (Greek script + transliteration +
  meaning, e.g. Χρόνος/chronos vs Καιρός/kairos; φόβος/phobos vs εὐλάβεια/eulabeia).
  **Day 1 has none**, which is why it was nearly missed. Any renderer must handle
  it — it IS the "Greek moments" transliteration requirement.
- **`totalWords` in the JSON double-counts.** Each module stores its prose twice
  (`body` AND `content`); day 1's `totalWords: 1307` vs ~943 unique display words.
  Dedupe `body`/`content` when counting or rendering.
- **`reflection.additionalQuestions` and `comprehension.forReflection` overlap**
  (at least one identical question). Boxed layout hid it; a single column exposes
  it. Prototype dedupes to show once — a real fix is a content pass across all 175.
- Fields I initially dropped and had to restore: `vocab.relatedWords`
  transliterations, `profile.keyQuote`. Render every leaf; verify with a
  punctuation-blind coverage diff.

---

## 7. Inputs (permanent, in-repo)

- Devotionals: `public/devotionals/too-busy-for-god-day-{1..6}.json`
- Bible corpus: `public/bibles/{BSB,ASV,WEB,KJV,YLT,DARBY,BBE}/<BOOK>.json`
  (shape: `{ chapter: { verse: "text" } }`)
- Series data: `src/data/series.ts` (`'too-busy-for-god'` — 6 days, question,
  framework)
- Real chrome/CSS: extract live per §3 (not committed; ~470KB stylesheet).

---

## 8. Where this fits process-wise

This is **reader-format / display** work — orthogonal to `/devo-go`, which builds
_new series content_. A future implementation would change the shared reader
component (`src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`, used by
both silos) and its module renderers — **not** the content pipeline. Because both
silos share that component, the format ships to WAKE UP and EUANGELION at once.

**Next session, to resume:** review the series artifact (§2), answer the four open
decisions (§5), then scope the component change. Recover exact prototype
markup/CSS by `WebFetch`-ing the series artifact URL if needed.
