# Brand Bible Workstream — Session Handoff

> **Generated:** 2026-05-04 by Claude Code, mid-Gate 3, due to context compaction.
> **Read this first** when resuming the workstream in a new session. This document is self-contained — you should not need the prior conversation to continue.

---

## 1. Where we are RIGHT NOW

**Status:** Gate 3 (mockup + pipeline test) generated 5 mockups successfully. Pipeline validated, prompt scaffolds proven repeatable, cost projection sustainable. **One open decision before Phase 3 launches:** regenerate Mockup 5 (wheatpaste poster) with a stronger anchor visual (Lamb full-body OR bread loaf), or keep the oil lamp.

**Last action:** Mockups moved from `.playwright-mcp/` to `docs/brand/gate-3-mockups/`. Asked user to choose Mockup 5 anchor (Lamb / bread / keep oil lamp).

**Awaiting user input:**

1. Mockup 5 anchor choice (Lamb full-body / bread loaf / keep oil lamp)
2. Phase 3 go-ahead

---

## 2. Completed Work

### 2.1 Gate 0 — Current State Ledger

**File:** `docs/portfolio/CURRENT-STATE-LEDGER.md`
Tactical foundation for the bible. Captures every shipped fact about typography, color, grid, imagery, motion, voice, hosting, deploy, content pipeline. Cited by every chapter of the Brand Bible.

### 2.2 Spelling Migration (1,282 corrections)

**Scope:** EUONGELION → EUANGELION across 219 files.
**Files renamed:** 11 onboarding draft files in `content/drafts/onboarding/welcome-to-euangelion-day-*.md`
**Regex updated:** `src/lib/soul-audit/reference-utils.ts:143` widened to `/^#\s+eu[oa]ngelion/im` for transition.
**Intentional preservations (32):** cookie keys (`euongelion_session`, `euongelion_admin`), GitHub repo path (`creativcreature/euongelion`), migration documentation in Brand Guidelines/PROJECT-LEDGER. See `BIBLE-LICENSING/README.md` for full inventory.

### 2.3 Gate 1 — Opening Interview (6 questions answered)

| Q                       | Answer                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| Q1 — Decision authority | A — Recommend & Approve (founder approves every load-bearing decision)     |
| Q2 — Comparison scope   | D — All 11 visitor-facing routes                                           |
| Q3 — Print formats      | 11 locked + 10 parking lot (anchored on Mini Gospel Magazine)              |
| Q4 — Image budget       | Standard ~100–150 images / $40 ceiling / 2-week soft window                |
| Q5 — Church credibility | A — Cross-denominational + dechurched + seekers (tribe-agnostic semiotics) |
| Q6 — Hard No's          | All 30+ baseline locked                                                    |

### 2.4 Phase 1 — Visual + Structural Analysis

**File:** `docs/portfolio/PHASE-1-VISUAL-ANALYSIS.md`
Source-site teardown (week.wild.plus/athens-26 via Playwright) + Euangelion teardown (11 routes via Claude Preview) + reference image language codification (13 user posters + 24 designer references in `docs/design/reference-images/`) + departure map ranked 10 gaps + 14 open questions for Gate 2.

### 2.5 Gate 2 — All 13 Sections Locked

**Section A — Brand Foundation**

- Tagline / essence: **"Good News for you, daily."**
- Atmospheric line: **"Daily bread for the hungry soul."**
- Audit prompt: **"What are you wrestling with today?"**
- Archetype: **Hybrid** (Honest Friend default · Old Preacher gospel · Rabbi teaching)
- Audience: The Drifted · Skeptical Seeker · Stuck Believer · Weary Shepherd

**Section B — Verbal Identity**

- 6 voice rules verbatim from Wake Up Outreach + 8 verbal no's
- Structural toolkit: Chiastic + PaRDeS + 5R + Greek/Hebrew etymology + Comfort 5-step
- Translation primary: **Berean Standard Bible (BSB)** — public domain
- Translation teaching: **NET Bible** (Ministry First license)
- Originals: Hebrew Masoretic + Greek Nestle-Aland (always available for etymology)
- Wake Up = sub-brand, Euangelion = parent

**Section C — Logo & Wordmark**

- Wordmark: **7-variant rotation** (6 hand-generated SVGs + Industry constant)
- 6 variant directions: heavy condensed display sans · vintage retro serif w/ swashes · heavy rounded display serif · funky 70s script · retro geo-sans chunky · sacred Roman carved
- Production: AI-generated → traced to clean SVG
- Greek anchor: **εὐαγγέλιον in Poppins** (free, native Greek glyphs)
- Lamb mark: **Seven-eyed Lamb of Revelation 5:6**, 7 treatments, full-body + head-only versions, **NOT in site header**
- 7 treatments: photocopied · etched line · stamped · brushed · riso · wax seal · linocut

**Section D — Color System**
Production-true Cobalt Triad (per `docs/portfolio/assets/specimens/specimens.html`):

- Light: Newspaper Cream `#F0ECE6` + Navy Ink `#11182A` + Cobalt `#1F2A8D`
- Dark: Deep Navy `#0A1320` + Cream Ink `#EFE5D8` + Cobalt Lifted `#2236A2`
- Sacred Accents (rare): Burgundy `#8E3F3F` · Olive `#6F8F4F` · Shalom `#4D9FB0`
- Legacy Warm Triad documented as historical only (CSS variable `--color-gold` is a misnomer — its production value is cobalt blue)

**Section E — Typography**

- Display + body + scripture: **Instrument Serif** (with italic for emphasis + scripture)
- UI / nav / labels / wordmark masthead: **Industry**
- Greek anchor: **Poppins**
- Mobile-first; type-as-art directive (poetry on the page, intrigue and drama)

**Sections F–M — consolidated from prior decisions + production state**
Grid (8px baseline + spacing tokens), Imagery (handmade folk-modern, Old Masters retired), Motion (GSAP + Framer + Lenis), Web Voice (anonymous = magazine homepage with daily devotional + Soul Audit at end; signed-in = redirect to /daily-bread), Print (11 formats anchored on Mini Gospel Magazine), Social (restrained, brand-voice-consistent, no engagement bait), Application Library (12+ Claude prompt templates), Governance (pricing tiers + cookie banner cleanup TODO + editorial cadence).

### 2.6 Bible Licensing Folder

**Files:**

- `BIBLE-LICENSING/README.md` — strategy + decisions + action items
- `BIBLE-LICENSING/drafts/letter-HCCP.md` — refined permission letter ready for IP attorney review
- `BIBLE-LICENSING/status-log.md` — running log

**Strategy:** BSB primary (public domain) + NET secondary (Ministry First) + originals + comparative fair-use of HCCP/Crossway/Holman/Tyndale translations under publisher Gratis Use thresholds. Standalone artifacts (stickers, scripture cards, t-shirts, posters) use **public-domain text only** — never copyrighted translations.

### 2.7 Phase 2 — Brand Bible v1.0

**File:** `docs/brand/BRAND-BIBLE.md`
16 chapters, ~25,000 words, fully cited. Each chapter: Overview + Detail + How to Apply (Claude prompt template) + Sources. The canonical operating reference.

### 2.8 Asset Manifest

**File:** `docs/brand/ASSET-MANIFEST.md`
Priority-ordered ~140-asset production list. Drives Phase 3.

### 2.9 Process Documentation

- `docs/portfolio/BRAND-BIBLE-PROCESS.md` — methodology + chronology + decisions ledger + lessons learned
- `docs/portfolio/BRAND-BIBLE-CASE-STUDY.md` — narrative case study for portfolio use

### 2.10 CHANGELOG entry

`CHANGELOG.md` has a `BRAND-001` entry summarizing the workstream.

### 2.11 Gate 3 — Mockup + Pipeline Test

**Specs:** `docs/brand/GATE-3-MOCKUP-SPECS.md`
**Outputs:** `docs/brand/gate-3-mockups/` (5 PNGs)
**Tool:** `mcp__nanobanana-mcp__gemini_generate_image` (Gemini 3 Pro image preview)
**Cost:** ~$0.20 actual

| Mockup                         | File                                     | Result                                                                                                |
| ------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1 — Wordmark heavy condensed   | `gate-3-01-wordmark-heavy-condensed.png` | ✅ STRONG PASS                                                                                        |
| 2 — Lamb head linocut          | `gate-3-02-lamb-head-linocut.png`        | ✅ PASS (8 eyes vs 7 — minor iter needed)                                                             |
| 3 — Series hero identity       | `gate-3-03-series-hero-identity.png`     | ✅ STRONG PASS (added embedded title — iter prompt for "no text")                                     |
| 4 — Mini Gospel Magazine cover | `gate-3-04-minimag-cover.png`            | ✅ STRONG PASS                                                                                        |
| 5 — Wheatpaste poster          | `gate-3-05-wheatpaste-poster.png`        | ✅ PASS (oil lamp anchor — user questioned; awaiting decision to regenerate with Lamb / bread / keep) |

---

## 3. Pending User Decisions

### 3.1 Mockup 5 anchor visual

User questioned the oil lamp on the wheatpaste poster. Three paths offered:

- **(a) Regenerate with full-body Lamb** — anchors poster on brand's own canonical mark; also validates large-scale full-body Lamb (a Phase 3 production category we haven't tested)
- **(b) Regenerate with bread loaf** — ties poster directly to "Daily bread for the hungry soul" tagline
- **(c) Keep oil lamp** — original mockup stands

**Recommendation:** (a) — Lamb full-body. Strongest brand positioning + extra Phase 3 validation.

### 3.2 Phase 3 go-ahead

After Mockup 5 decision, user commits to Phase 3 (full ~140-asset batch) or pauses for further review.

---

## 4. Phase 3 — Production Plan (when approved)

### 4.1 Two prompt-scaffold refinements to apply

1. **Lock 7 eyes exactly** in Lamb prompts:
   > "with EXACTLY seven stylized eyes — count them: seven — arranged in a halo cluster around the upper face."
2. **No embedded text** in pure illustration prompts:
   > "DO NOT include any text, headlines, captions, or labels in the illustration. The image is illustration-only; titles will be rendered separately."

### 4.2 Asset batch sequencing (per `docs/brand/ASSET-MANIFEST.md`)

**Priority 1 — Critical for launch (~35 assets)**

- 7 wordmark variants (6 hand-generated SVGs + Industry already shipping)
- 14 Lamb mark assets (7 treatments × 2 poses: full-body + head-only)
- 7 favicon / app icon sizes (derived from Lamb head-only linocut)
- 1 color tokens spec file (`design-system/tokens-final.json` + `.css`)
- ~6 Mini Gospel Magazine production templates (master 8-panel + 10 variant covers + inside panels + back panel)

**Priority 2 — Web brand assets (~50 assets)**

- 32 series hero illustrations (one per series in `src/data/series.ts`)
- 5 `/good-news` page act illustrations (Question, Mirror, Verdict, Worth, Hope)
- 1 `/about` page hero
- ~12 inline devotional art replacements (anchor pages first)
- Soul Audit visual treatment

**Priority 3 — Print formats (~35 assets)**

- 6–10 die-cut stickers (single-icon biblical motifs)
- 3 wheatpaste poster designs
- 3 postcard / handout designs
- 7 scripture card deck (one per card)
- 3 bookmark + tear-off scripture card designs
- 2 table tent / café card designs
- 1 pull-up banner
- 1 tabletop Soul Audit sign
- 3 t-shirt graphic designs
- 2 patch designs
- 1 tote bag

**Priority 4 — Social system templates (~9 assets)**

- 5 Instagram templates (square, story, carousel, issue announcement, drop announcement)
- 1 Substack newsletter template
- 1 Twitter/X thread template
- 1 YouTube thumbnail template
- 1 TikTok / Reels frame template

**Total: ~140 assets**
**Cost projection: $15–20 realistic for full batch with iteration**
**Time: ~2 weeks soft, no hard deadline (Gate 1 lock)**

### 4.3 Production paths (per Asset Manifest)

- Wordmarks: `public/logo/wordmark-XX-{style}.svg`
- Lamb marks: `public/logo/lamb-{full|head}-XX-{treatment}.svg`
- Favicons: `public/favicon.ico` + `public/icons/`
- Color tokens: `design-system/tokens-final.json` + `.css`
- Mini Gospel Magazine: `public/print/mini-gospel-magazine/`
- Series heroes: `public/images/series-heroes/{slug}.svg`
- /good-news: `public/images/good-news/act-{N}-{theme}.svg`
- /about: `public/images/about/hero.svg`
- Devotional inline: `public/images/devotional-inline/{slug}-{N}.svg`
- Print formats: `public/print/{stickers,posters,postcards,...}/`
- Social: `public/social/{instagram,substack,twitter,youtube,tiktok}/`

### 4.4 Mid-batch review checkpoints

Every 25 assets, full-batch review with founder. Adjust prompt scaffolds before continuing.

---

## 5. How to Resume in Next Session

### 5.1 First, read these files (in order)

1. **This handoff** (`docs/brand/HANDOFF.md`) — you're reading it
2. **The Brand Bible** (`docs/brand/BRAND-BIBLE.md`) — the canonical reference
3. **The Asset Manifest** (`docs/brand/ASSET-MANIFEST.md`) — production sequence
4. **Gate 3 Specs** (`docs/brand/GATE-3-MOCKUP-SPECS.md`) — prompt scaffolds + iteration rules
5. **Current State Ledger** (`docs/portfolio/CURRENT-STATE-LEDGER.md`) — production-true facts
6. **Phase 1 Brief** (`docs/portfolio/PHASE-1-VISUAL-ANALYSIS.md`) — visual analysis foundation
7. **Process Doc** (`docs/portfolio/BRAND-BIBLE-PROCESS.md`) — methodology
8. **Bible Licensing README** (`BIBLE-LICENSING/README.md`) — translation strategy

### 5.2 Resume from where the user is

**If user says "Lamb" / "bread" / "keep oil lamp" for Mockup 5:**

1. Use `mcp__nanobanana-mcp__gemini_generate_image` with conversation_id `euangelion-gate-3`
2. Set aspect_ratio to `2:3` for the wheatpaste poster
3. Use the prompt scaffold in `GATE-3-MOCKUP-SPECS.md` Mockup 5 section, swapping the anchor visual
4. Save output to `docs/brand/gate-3-mockups/gate-3-05-wheatpaste-poster-v2.png`
5. Self-evaluate; present to user for Phase 3 approval

**If user says "Phase 3 go":**

1. Apply the two prompt-scaffold refinements (lock 7 eyes + no embedded text)
2. Begin Priority 1 batch generation
3. Save outputs directly to canonical production paths (per Asset Manifest §4.3) — NOT to `.playwright-mcp/` or temporary folders
4. Mid-batch review every 25 assets
5. Track cost (target: ~$15–20 total)

**If user says "Pause" or wants to review:**

1. Brand Bible v1.0 is complete and saved
2. Asset Manifest is complete and saved
3. Process docs are complete and saved
4. Resume Phase 3 when ready

### 5.3 Tools available

**Loaded in prior session (may need re-loading):**

- `mcp__nanobanana-mcp__gemini_generate_image` — image generation (Gemini Pro)
- `mcp__nanobanana-mcp__set_aspect_ratio` — aspect ratio per session
- `mcp__nanobanana-mcp__set_model` — model selection (use "pro")
- `mcp__nanobanana-mcp__clear_conversation` — clear session if needed
- `mcp__playwright__*` — browser automation (used for source-site recon, HCCP page fetch)
- `mcp__Claude_Preview__*` — local dev server (port 3333) for product UI verification
- `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep` — standard file ops
- `WebFetch` — for reachable URLs (failed for HCCP — used Playwright instead)

**To re-load in new session:** use `ToolSearch` with `query: "select:<tool_name>,<tool_name>"`

### 5.4 Conversation ID for image continuity

`euangelion-gate-3` — currently has 5 images in history. For Phase 3, recommend starting a new conversation_id per category (e.g., `euangelion-wordmarks`, `euangelion-lambs`, `euangelion-series-heroes`, `euangelion-print`, `euangelion-social`) for organized session management.

---

## 6. Critical Constraints / Reminders

### 6.1 Brand voice (don't deviate)

- **6 Wake Up rules** are non-negotiable (see Bible Ch. 2.1)
- **8 verbal no's** beyond Hard No's (see Bible Ch. 2.7)
- **Translation:** BSB primary, never copyrighted on standalone artifacts
- **Spelling:** EUANGELION / Euangelion / euangelion only

### 6.2 Visual no's

- ❌ Stock photography of any kind
- ❌ Old Master oil paintings (legacy 643 prints retired)
- ❌ Generic Christian symbols (cross-on-mountain, hands-raised silhouettes, light-rays-through-clouds)
- ❌ Sacred Heart / Eastern Orthodox / saint-card iconography
- ❌ Cartoon-cute / kids-Bible register
- ❌ AI-detectable artifacts (six fingers, plastic skin, melted text)
- ❌ Multi-color (single ink + cream discipline)
- ❌ Drop shadows, gradients, glows, lens flares
- ❌ QR codes on poster covers / mini-mag covers (QR lives on Panel 8 back of mini-mag, never on cover or wheatpaste poster)

### 6.3 Production paths (canonical only)

Phase 3 outputs save DIRECTLY to canonical production paths — never to `.playwright-mcp/`, `~/Documents/`, or other temporary locations. Production paths are documented in Asset Manifest §4.3 above and in the Asset Manifest doc itself.

### 6.4 Image content rules

- Single ink (cobalt `#1F2A8D` default) on cream (`#F0ECE6` default)
- Sacred accent inks (burgundy / olive / shalom / warm amber) substitute for thematic context only
- Hand-feel preferred over digital-clean
- Iconic over illustrative — one subject, one shape per piece
- Generous negative space

---

## 7. Pending TODOs (post-launch / parallel to Phase 3)

From Brand Bible Ch. 15:

**Pre-launch:**

- [ ] Replace `src/` references to ESV with BSB
- [ ] Update `wakeup-mag/OUTREACH-HANDOUTS-V1.md` voice rule "ESV for NT" → "BSB primary"
- [ ] Hire IP attorney for wokeGod LLC; file Euangelion trademark
- [ ] Verify NET Bible Ministry First license terms with bible.org
- [ ] Replace cookie banner modal with dismissible footer strip
- [ ] Verify exact series count (32 vs. 40 slug-grep)

**30–90 days:**

- [ ] Send formal permission inquiries to HCCP, Crossway, Holman, Tyndale
- [ ] Build the 5 Comfort-shaped standalone devotionals
- [ ] Build `/good-news` polished gospel-proclamation page

**6+ months:**

- [ ] Coordinate cookie key migration `euongelion_session` → `euangelion_session` (production-breaking; needs deprecation window)
- [ ] Coordinate GitHub repo rename `creativcreature/euongelion` → `creativcreature/euangelion`
- [ ] Update memory: replace stale Vercel / Inter / 369-prints entries

---

## 8. File Inventory

### Brand

- `docs/brand/BRAND-BIBLE.md` — 16-chapter operating bible
- `docs/brand/ASSET-MANIFEST.md` — ~140-asset production list
- `docs/brand/GATE-3-MOCKUP-SPECS.md` — Gate 3 prompt scaffolds + iteration rules
- `docs/brand/HANDOFF.md` — this file
- `docs/brand/gate-3-mockups/` — 5 PNG validation outputs

### Portfolio (process + analysis)

- `docs/portfolio/CURRENT-STATE-LEDGER.md` — production-true tactical foundation (Gate 0)
- `docs/portfolio/PHASE-1-VISUAL-ANALYSIS.md` — source-site teardown + Euangelion comparison + reference image language
- `docs/portfolio/BRAND-BIBLE-PROCESS.md` — methodology + chronology + decisions
- `docs/portfolio/BRAND-BIBLE-CASE-STUDY.md` — narrative for portfolio use
- `docs/portfolio/PROJECT-LEDGER.md` — pre-existing chronological project ledger (not produced this workstream)
- `docs/portfolio/assets/specimens/specimens.html` — production-true color/type specimens (pre-existing, source for Section D color decisions)

### Licensing

- `BIBLE-LICENSING/README.md` — translation strategy
- `BIBLE-LICENSING/drafts/letter-HCCP.md` — permission letter draft
- `BIBLE-LICENSING/status-log.md` — running log

### Reference

- `docs/design/reference-images/` — 24 designer/illustrator style anchors
- `Brand Guidelines/EUANGELION-COMPREHENSIVE-BRAND-GUIDELINES.md` — pre-existing April 2026 brand synthesis (superseded in places by this Bible)
- `wakeup-mag/OUTREACH-HANDOUTS-V1.md` — source for Wake Up 6 voice rules + Mini Gospel Magazine spec
- `wakeup-mag/README.md` — sub-brand context

### Code (read-only for brand reference)

- `src/app/globals.css` — production color/type tokens (canonical)
- `src/data/series.ts` — 32 series with slugs
- `src/middleware.ts` — auth gates
- `src/components/motion/` — motion system components
- `src/lib/animation-config.ts` — motion tokens
- `src/lib/typographer.ts` — typography enforcement
- `src/components/MixedHeadline.tsx`, `PullQuote.tsx`, `OrnamentDivider.tsx`, `SeriesHero.tsx` — brand-relevant components

### CHANGELOG

- `CHANGELOG.md` — `BRAND-001` entry at top summarizes the workstream

---

## 9. The Single Most Important Thing

**The Brand Bible is the canonical reference.** When the next session disagrees with a prior decision, the bible wins. When the bible disagrees with live code, code wins (and bible gets updated). When live code disagrees with founder intent, founder wins (and code + bible get updated).

**Mode A authority architecture:** the founder retains decision authority on every load-bearing call. Recommendations are paired with alternatives + rationales. Don't unilaterally override locked decisions.

**Citation discipline:** every claim about current state cites a file path + line, a Ledger section, or an interview answer ID. Don't hallucinate facts. Verify before quoting.

---

_End of handoff. Resume from §1 "Where we are RIGHT NOW" and §3 "Pending User Decisions."_
