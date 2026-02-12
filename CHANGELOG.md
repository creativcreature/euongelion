# Changelog

All notable changes to Euangelion are documented here.
Format: Reverse chronological, grouped by sprint/date.

---

## Current Status

**Version:** 0.7.0
**Target:** Easter 2026 MVP launch
**Now:** Typography Masterclass complete — Instrument Serif + Inter, emphasis-based mixed headlines, sacred illumination, pull quotes, ornamental dividers, activated OpenType features
**Next:** Content generation (real images, additional module content), Supabase progress sync

### What's Built

- [x] Sprint 0 — Foundation (Next.js 16, tooling, content migration)
- [x] Sprint 1 — Wake-Up Magazine (7 series, 35 devotionals, panel viewer)
- [x] Design System Facelift — Tehom/Scroll/Gold tokens, semantic colors
- [x] Sprint 2 — Editorial redesign, SEO, illustration pipeline script
- [x] Sprint 3 — Supabase database, auth, sessions
- [x] Deployment — euangelion.app live on wokegodxs-projects
- [x] Sprint 4 — Initial MVP (landing page, Soul Audit, modules, series browse, settings, legal, AI pipeline)
- [x] Sprint 5 — Real MVP rebuild (26 series, fonts, inline audit, hybrid cinematic reader, navigation, SeriesHero)
- [x] Production Relaunch Phases 0-11 — Design system consolidation, typography craft, GSAP/Framer Motion animations, Zustand stores, AI research chat, PWA, accessibility, SEO, dead code cleanup
- [x] Fix What's Broken (Phases A-D) — Removed auth gate on devotionals, wired typography craft classes + motion components into all pages, animated gold shimmer + breathing prayer, TextReveal on homepage + devotional hero
- [x] v0.7.0 Typography Masterclass — Instrument Serif + Inter font swap, MixedHeadline system, PullQuote + OrnamentDivider components, sacred illumination scale, multi-column layouts, OpenType features activated

### What's NOT Built (Post-MVP)

- [ ] Progress tracking → Supabase (currently localStorage, Zustand stores ready)
- [ ] Real hero images (Gemini pipeline — CSS placeholders in place)
- [ ] Web Push notifications (VAPID keys needed)
- [ ] Additional module content (9 new module types built, need content in JSONs)

---

## Newspaper Rebuild v3 + Illustration Pipeline Scaffold (2026-02-12)

### What Changed

- Implemented reusable newspaper system components:
  - `src/components/newspaper/IllustrationFrame.tsx`
  - `src/components/newspaper/WordblockPanel.tsx`
  - `src/components/newspaper/PrintRail.tsx`
  - `src/components/newspaper/FaqHoverCard.tsx`
  - `src/components/newspaper/DevotionalMilestoneReveal.tsx`
- Reworked homepage composition in `src/app/page.tsx`:
  - Added print-style illustration slots in hero, flow, featured, FAQ, and CTA
  - Added “word as art” support panel treatment
  - Converted Featured Series to horizontal auto-rotating `PrintRail`
  - Converted FAQ to horizontal auto-rotating `PrintRail` with `FaqHoverCard` hover/focus reveal and tap toggle on mobile
  - Kept Soul Audit above fold and preserved existing submit/match logic
  - Added full-width bottom `EUANGELION` wordmark section
- Expanded print treatments and interaction styles in `src/app/globals.css`:
  - Added Industry font-face support and switched UI/meta stack to Industry
  - Added print effects: `effect-woodblock`, `effect-halftone`, `effect-dither`, `effect-ink`
  - Added illustration framing, rail controls, dots, and FAQ reveal motion
  - Maintained no-glow/rim-light treatment
- Added Industry font files and illustration assets:
  - `public/fonts/IndustryTest-Book.otf`
  - `public/fonts/IndustryTest-Demi.otf`
  - `public/fonts/IndustryTest-Bold.otf`
  - `public/images/illustrations/*` (from `user-references/illustrations`)
  - `public/images/illustrations/placeholder-ink-block.svg`
- Extended motion config in `src/lib/animation-config.ts`:
  - Added `editorialSubtle` and `devotionalCinematic` profiles
  - Added rail timing tokens
  - Removed hover glow effect fallback
- Added illustration generation service scaffold:
  - `src/lib/illustrations/provider.ts`
  - `src/lib/illustrations/prompt-presets.ts`
  - `src/lib/illustrations/nanobanana.ts`
  - `src/app/api/illustrations/generate/route.ts`
  - Supports validated prompt payloads, rate limiting, Nano-Banana provider calls, Supabase Storage upload, metadata insert, and fallback asset chain
- Added persistence schema for generated illustration metadata:
  - `supabase/migrations/20260212000001_create_generated_illustrations.sql`
  - `database/migrations/008_create_generated_illustrations.sql`
- Applied newspaper styling pass to key routes:
  - `src/app/wake-up/page.tsx`
  - `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
  - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
  - `src/app/series/page.tsx`
  - `src/app/soul-audit/page.tsx`
  - `src/app/soul-audit/results/page.tsx`
- Updated environment template in `.env.example` with Nano-Banana and Supabase server variables.
- Bumped service worker cache namespace from `euangelion-v19` -> `euangelion-v20` in `public/sw.js`.

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run build`

---

## Dark Newspaper UX Consolidation Pass (2026-02-11)

### What Changed

- Reworked newspaper dark mode to the selected visual direction in `src/app/globals.css`:
  - Dark paper base set to deep navy-black (`#0B1420`)
  - Primary ink switched to crisp off-white (`#E9EEF5`)
  - Accent switched to classic gold-ink replacement (`#C8A56A`)
  - Removed rim-light style gradients and blur-driven rail glow
  - Increased rule hierarchy to stronger newspaper lines (1px body rules + 2px section/divider rules)
  - Kept medium paper texture visibility without glow effects
- Standardized typography intent:
  - Main body remains Instrument Serif
  - UI labels/callouts/nav moved to secondary UI stack (`Space Grotesk` first in stack) in:
    - `src/app/globals.css`
    - `design-system/typography-craft.css`
- Added two interaction systems in `src/app/globals.css`:
  - `cta-major`: lined-box CTA with border-draw animation + subtle print-offset motion
  - Contextual small-link interactions:
    - `animated-underline` for nav/standard links (underline draw + slight lift)
    - `link-highlight` for editorial/key callouts (flat marker swipe, no glow)
- Applied interaction/style cleanup across homepage + devotional surfaces:
  - Homepage CTA/section/rule updates in `src/app/page.tsx`
  - Soul Audit page CTA + headline simplification updates in `src/app/soul-audit/page.tsx`
  - Soul Audit results link treatment updates in `src/app/soul-audit/results/page.tsx`
  - Devotional reading/nav/CTA/rule updates in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
  - Navigation rail/menu border treatment cleanup in `src/components/Navigation.tsx`
  - Removed glow-like shadows from reading-side overlays/controls in:
    - `src/components/DevotionalChat.tsx`
    - `src/components/TextHighlightTrigger.tsx`
    - `src/components/ShareButton.tsx` (underlined interaction pass)
- Updated PWA theme color in `src/app/layout.tsx` to match dark paper base.
- Bumped service worker cache namespace from `euangelion-v18` -> `euangelion-v19` in `public/sw.js` so styling changes propagate immediately.

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Soul Audit Full 5-Day Plan Generation (2026-02-11)

### What Changed

- Reworked Soul Audit generation to return a full temporary 5-day custom plan in `src/app/api/soul-audit/route.ts`:
  - Added `custom_plan` generation contract (5 structured days: scripture, reflection, prayer, next step, journal prompt)
  - Enforced chiastic day arc labeling (`A`, `B`, `C`, `B'`, `A'`) across day output
  - Added robust fallback generator that still produces a complete 5-day plan when AI is unavailable
  - Kept ranked series matches as secondary pathways
- Added new shared types in `src/types/soul-audit.ts`:
  - `CustomPlan`, `CustomPlanDay`, and `ChiasticPosition`
  - `SoulAuditResponse.customPlan` for first-class 5-day output
  - Backward compatibility maintained for legacy `customDevotional` payloads
- Updated homepage Soul Audit flow in `src/app/page.tsx`:
  - Normalizes + stores `customPlan` payload in session storage
  - Results block now shows Day 1 full devotional content plus a visible outline of all 5 generated days
  - Updated copy from single-day custom devotional language to custom 5-day plan language
- Updated dedicated Soul Audit route flow:
  - `src/app/soul-audit/page.tsx` now normalizes legacy and new payloads to `customPlan`
  - `src/app/soul-audit/results/page.tsx` now renders the full 5-day plan day-by-day (not just a single day)
- Made generated plans temporary by default in `src/stores/soulAuditStore.ts`:
  - Persisted store now keeps only `auditCount`
  - Generated plan content remains session-scoped instead of durable local persistence
- Bumped service worker cache namespace from `euangelion-v17` -> `euangelion-v18` in `public/sw.js` so clients pick up the new audit behavior immediately

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Homepage Header Flow + Scale Pass (2026-02-11)

### What Changed

- Reworked homepage header behavior in `src/app/page.tsx`:
  - Replaced `HOME EDITION` rail text with live current date/time
  - Replaced center rail copy with `DAILY DEVOTIONAL AND HONEST REFLECTION`
  - Replaced right rail slot with a dark-mode toggle button
  - Removed the subheading block: `A daily paper for your soul...`
  - Renamed `LEAD STORY` to `START HERE`
  - Increased hero lead typography (`Find your next faithful step today` + supporting copy)
- Added sticky/nav handoff behavior:
  - Top meta rail stays sticky
  - Masthead scrolls normally
  - Primary nav below masthead transitions out as scroll passes threshold
  - Meta rail center swaps from tagline to nav links (replacing the center text on scroll)
- Replaced hover-only masthead interaction with ticker-style masthead animation:
  - Continuous horizontal marquee: `EUANGELION • GOOD NEWS`
- Updated `src/components/Navigation.tsx` with `showThemeToggle` prop so homepage can own dark-mode control in the top rail
- Increased global typography utility scale in `src/app/globals.css` (`vw-heading-*`, `vw-body*`, `vw-small`) for larger text across the site
- Restored dark-mode behavior for the newspaper theme by adding `.dark .newspaper-home` token overrides and dark card treatment
- Bumped service worker cache namespace from `euangelion-v7` -> `euangelion-v8` in `public/sw.js` so clients pick up interaction and sticky/navigation fixes immediately

### Interaction Stability Follow-up (2026-02-11)

- Moved sticky meta rail outside the animated header block in `src/app/page.tsx` to restore reliable sticky behavior
- Hardened clickable behavior for top rail nav/theme controls in `src/app/globals.css`:
  - Raised sticky rail z-index to top layer
  - Enforced pointer-events on nav links and dark-mode control
  - Added explicit sticky fallback (`position: -webkit-sticky`)
- Added explicit `type="button"` on the top dark-mode control to avoid accidental form semantics

### Above-the-Fold Soul Audit Pass (2026-02-11)

- Compressed homepage hero vertical stack in `src/app/page.tsx` so the full Soul Audit block fits above the fold on desktop:
  - Reduced masthead height footprint and nav spacing
  - Tightened top section padding/gaps
  - Reduced lead-story copy block vertical rhythm
  - Compacted Soul Audit card (padding, heading size, textarea rows, CTA height)
- Bumped service worker cache namespace from `euangelion-v8` -> `euangelion-v9` in `public/sw.js` so fold/layout updates are immediately visible

### Newspaper System Expansion + Ticker Rebuild (2026-02-11)

- Rebuilt homepage masthead animation as a ticker-strip system in `src/app/page.tsx` + `src/app/globals.css`:
  - Segment-based marquee track with repeated items (`EUANGELION`, `GOOD NEWS`, `DAILY BREAD`)
  - Ticker-chip visual treatment to match modern headline-ticker style
  - Reduced mobile masthead size to fit viewport width more reliably
- Expanded newspaper feel site-wide:
  - Added global newsprint surface treatment to `<body>` via `newsprint-site` class in `src/app/layout.tsx`
  - Added cross-site paper grain/fiber background layering in `src/app/globals.css`
- Improved dark mode palette consistency across the app:
  - Updated global `.dark` semantic tokens to align with the successful Wake-Up dark palette direction
  - Aligned `.dark .newspaper-home` tokens to the same tonal family
- Fixed light-mode mobile navigation usability in `src/components/Navigation.tsx`:
  - Replaced hard-coded dark drawer (`bg-tehom`) with semantic page surface
  - Improved close/button/link color contrast in light mode
- Desktop devotional layout pass in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`:
  - Centered hero/content/navigation/footer containers
  - Increased readable content width while keeping prose constrained
  - Added `newspaper-reading` wrapper and associated typography/layout refinements
  - Preserved mobile devotional flow while improving desktop reading balance
- Overflow/viewport hardening in `src/app/globals.css`:
  - Added `overflow-x: hidden` + width constraints on `html`/`body`
  - Prevented horizontal side scrolling from ticker/layout overflow
- Bumped service worker cache namespace from `euangelion-v10` -> `euangelion-v11` in `public/sw.js` so latest interaction updates are immediately visible

### Innovation UX Pass (2026-02-11)

- Added high-leverage Soul Audit interaction improvements in `src/app/page.tsx`:
  - Rotating intelligent prompt text for quicker first sentence momentum
  - Keyboard shortcut `/` to jump focus to Soul Audit input
  - Keyboard shortcut `Cmd/Ctrl + Enter` to submit the audit
  - Live word count + readiness meter to guide completion without extra friction
- Upgraded ticker polish in `src/app/globals.css`:
  - Added edge mask fade, reduced-motion fallback, and chip-styled ticker units
  - Improved marquee smoothness with track-level animation + will-change optimization

### Split-Flap Ticker Correction (2026-02-11)

- Replaced marquee-style masthead with airport-board split-flap behavior to match requested header motion reference:
  - Added `src/components/FlipTicker.tsx` (character-cell ticker with per-slot vertical tick transitions)
  - Updated homepage masthead in `src/app/page.tsx` to use `FlipTicker` with `EUANGELION` <-> `GOOD NEWS`
  - Replaced old marquee CSS in `src/app/globals.css` with split-flap board styles (`flip-cell`, `flip-track`, `flip-char`)
- Bumped service worker cache namespace from `euangelion-v11` -> `euangelion-v12` in `public/sw.js` so ticker correction is immediately visible

### Airport Board Ticker Behavior Refinement (2026-02-11)

- Refined the masthead ticker to behave like a true split-flap airport board (not a horizontal sports ticker):
  - Rebuilt `src/components/FlipTicker.tsx` animation logic so each character cell advances in stepped ticks toward the next message
  - Added per-cell split-panel flip choreography (top + bottom flap timing) for mechanical board motion
  - Tuned message cadence/stagger for `EUANGELION` <-> `GOOD NEWS` to read as header display text rather than marquee crawl
- Reworked split-flap visuals in `src/app/globals.css`:
  - Added half-panel layering, seam line, depth/ink shading, and dark-mode plate tuning for newspaper look
  - Replaced previous vertical-track glyph-roll styling (`flip-track`, `flip-char`) with dynamic flap states (`flip-static`, `flip-dynamic`)
- Bumped service worker cache namespace from `euangelion-v12` -> `euangelion-v13` in `public/sw.js` so the refined ticker behavior is immediately visible

### Masthead Simplification (2026-02-11)

- Removed masthead ticker/effects and restored a static wordmark:
  - Updated `src/app/page.tsx` masthead to render plain `EUANGELION` text
  - Removed ticker component usage and deleted `src/components/FlipTicker.tsx`
  - Removed split-flap ticker CSS from `src/app/globals.css`
- Bumped service worker cache namespace from `euangelion-v13` -> `euangelion-v14` in `public/sw.js` so the static masthead is immediately visible

### Blue Ink Newspaper Refinement (2026-02-11)

- Shifted homepage + devotional visual language to blue-ink editorial treatment in `src/app/globals.css`:
  - Updated accent from warm glow to blue-ink (`--color-gold` now blue-ink in newspaper contexts)
  - Added darker section rules and stronger border contrast for newspaper structure
  - Added dedicated `newspaper-reading` tokens so devotional pages match homepage editorial tone
- Removed glow/shimmer effects to keep print-like flat ink rendering:
  - Replaced animated `gold-shimmer` styling with static ink color
  - Disabled prayer text pulsing (`breathe-prayer`) to reduce visual noise during long-form reading
  - Simplified `src/components/motion/GoldHighlight.tsx` to flat text accent (no gradient reveal animation)
- Reworked homepage editorial blocks in `src/app/page.tsx`:
  - Converted `THE FLOW` from card grid to ruled newspaper step list
  - Converted `HELP DESK` from cards to ruled Q&A column layout
  - Flattened closing CTA treatment into ruled editorial block (less app-like card chrome)
- Reworked devotional reading layout in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`:
  - Removed mixed headline treatment and restored single-voice title composition
  - Reduced hero height so reading content appears sooner
  - Switched to newspaper navigation variant for cleaner article framing
  - Removed staggered module reveal wrappers for steadier long-form reading flow
  - Added framed reading column treatment via `newspaper-reading-main` + `reading-flow` rule edges
- Bumped service worker cache namespace from `euangelion-v14` -> `euangelion-v15` in `public/sw.js` so this style pass is immediately visible

### Update Delivery Reliability Fix (2026-02-11)

- Hardened production service worker update behavior in `src/components/ServiceWorkerRegistration.tsx`:
  - Added immediate `registration.update()` check on load
  - Added waiting-worker promotion via `postMessage({ type: 'SKIP_WAITING' })`
  - Added `controllerchange` listener to auto-reload once new worker takes control
- Added message handler in `public/sw.js` to honor `SKIP_WAITING` and activate updated worker immediately
- Bumped service worker cache namespace from `euangelion-v15` -> `euangelion-v16` in `public/sw.js` to prevent partial stale/updated style mixes

### Soul Audit Custom Devotional Generation + Full-Width Masthead (2026-02-11)

- Reworked Soul Audit API from series-only matching to custom devotional generation in `src/app/api/soul-audit/route.ts`:
  - Added AI response contract to return both `custom_devotional` and ranked `matches`
  - Added robust JSON parsing + match enrichment + fallback devotional construction
  - Added grounded day-one context extraction from devotional source files for better personalized output
  - Preserved crisis response handling with resource-first output
- Added shared Soul Audit response types in `src/types/soul-audit.ts` and updated store typing in `src/stores/soulAuditStore.ts`
- Updated homepage Soul Audit experience in `src/app/page.tsx`:
  - Result section now leads with a generated custom devotional (scripture, reflection, prayer, next step, journal prompt)
  - Series cards are now secondary follow-up pathways
  - Updated Soul Audit value copy to reflect custom devotional generation
- Updated dedicated Soul Audit flow:
  - `src/app/soul-audit/page.tsx` now normalizes/stores the richer response payload
  - `src/app/soul-audit/results/page.tsx` now renders the generated custom devotional as primary output
- Made masthead wordmark span full width across the top in `src/app/page.tsx` + `src/app/globals.css` via `masthead-fullwidth` letter layout
- Bumped service worker cache namespace from `euangelion-v16` -> `euangelion-v17` in `public/sw.js` so API/UI behavior updates are immediately visible

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Edge Runtime Warning Removal (2026-02-11)

### What Changed

- Updated Open Graph image routes to use Node runtime instead of Edge:
  - `src/app/opengraph-image.tsx`
  - `src/app/wake-up/devotional/[slug]/opengraph-image.tsx`
- Goal: eliminate the build warning about Edge runtime disabling static generation

### Validation

- `npm run build` passes
- Warning `Using edge runtime on a page currently disables static generation for that page` no longer appears

---

## Next.js Proxy Migration (2026-02-11)

### What Changed

- Migrated route interception entrypoint from `src/middleware.ts` to `src/proxy.ts`
- Renamed exported handler from `middleware` to `proxy` to match Next.js 16+ convention
- Kept existing auth/session logic and matcher config intact

### Validation

- `npm run build` passes
- Build warning `The "middleware" file convention is deprecated` no longer appears

---

## Newsprint Texture Pass (2026-02-11)

### Scope

- Shifted the homepage from "clean editorial" to explicit newsprint material feel
- Targeted ink-on-paper atmosphere using layered texture treatment (no font-family changes)

### What Changed

- **Paper texture foundation** (`src/app/globals.css`):
  - Enhanced `.newspaper-home` background with multi-layered paper grain, fiber lines, and subtle ink wash variation
  - Added fixed pseudo-element overlays (`::before`, `::after`) for page-wide grain and print noise
  - Added stacking isolation and z-index handling so texture stays behind content while covering the full page
- **Printed surface treatment** (`src/app/globals.css`):
  - Updated `.newspaper-card` with textured paper layering to look like ink printed on stock rather than flat UI cards
- **Client cache refresh** (`public/sw.js`):
  - Bumped service worker cache namespace from `euangelion-v4` -> `euangelion-v5` so browsers pull the new texture assets/styles immediately

### Validation

- `npm run build` passes

### Visibility Follow-up (2026-02-11)

- Added non-production cache reset behavior in `src/components/ServiceWorkerRegistration.tsx`:
  - In production: keep normal SW registration
  - In non-production (local/dev): automatically unregister existing service workers and clear `euangelion-*` caches
- Purpose: prevent stale cached homepage assets from masking style updates during iterative design passes

---

## Homepage Newspaper System Pass (2026-02-11)

### Scope

- Applied a full homepage visual overhaul to align with a newspaper-style editorial layout inspired by the requested reference
- Kept existing font family setup intact (no typography family swap in this pass)
- Focused changes on hierarchy, conversion flow, layout balance, and section consistency

### What Changed

- **Unified homepage treatment** (`src/app/page.tsx`):
  - Root now uses `newspaper-home` for page-wide newspaper tokens/background
  - All major sections moved to a consistent editorial system:
    - masthead + edition strip
    - nav rail directly under masthead
    - lead story + above-fold Soul Audit
    - results rail
    - flow section
    - featured section
    - FAQ rail
    - final conversion panel
  - Removed mixed visual language (gradients/dot pattern-heavy style) in favor of consistent rails, rules, and cards
  - Preserved masthead hover interaction (`EUANGELION` -> `GOOD NEWS`)
- **Newspaper token tuning** (`src/app/globals.css`):
  - Refined `newspaper-home` palette for warmer paper + stronger editorial contrast
  - Kept accent treatment consistent through tokenized `--color-gold`
  - Standardized newspaper card rendering via `newspaper-card`
- **Cache bust for client refresh** (`public/sw.js`):
  - Bumped service worker cache namespace from `euangelion-v3` -> `euangelion-v4` so clients pick up the new homepage CSS/markup

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Hotfix — Serif Font Rendering (2026-02-11)

### Root Cause

- `next/font` variable classes were mounted on `<body>` while canonical typography tokens (`--font-family-*`) were resolved from `:root` (`<html>`), creating a scope mismatch for `--font-instrument-serif`
- `--font-family-serif` used `var(--font-instrument-serif), ...` without inline fallback, so if the variable was unavailable the declaration became invalid and serif styles inherited sans

### Fixes Applied

- **Layout scope fix** (`src/app/layout.tsx`) — moved `inter.variable` and `instrumentSerif.variable` class injection from `<body>` to `<html>`
- **Font token hardening** (`src/app/globals.css`) — changed font-family tokens to `var(..., fallback-list)` form:
  - `--font-family-display: var(--font-inter, 'Inter', 'Helvetica Neue', Arial, sans-serif);`
  - `--font-family-body: var(--font-inter, 'Inter', 'Helvetica Neue', Arial, sans-serif);`
  - `--font-family-serif: var(--font-instrument-serif, 'Instrument Serif', Georgia, serif);`
- Updated comments in `globals.css` to reflect runtime font variables now sourced from `<html>`

### Validation

- `npm run lint` passes with no new lint errors

### Render Outage Follow-up (2026-02-11)

- Replaced `next/font/google` usage in `src/app/layout.tsx` with local `GeistSans` import (`geist/font/sans`) to remove hard dependency on Google Fonts network availability during builds
- Added explicit source font variables in `src/app/globals.css`:
  - `--font-inter` now resolves from `--font-geist-sans` with fallback stack
  - `--font-instrument-serif` now has a resilient serif fallback stack (`Instrument Serif`, `Georgia`, `Times New Roman`, `serif`)
- Verified production build succeeds using webpack (`npx next build --webpack`)

### Instrument Serif Cleanup Pass (2026-02-11)

- Removed remaining Geist wiring from `src/app/layout.tsx` and kept `<html className="dark">` only
- Imported Instrument Serif directly in `src/app/globals.css`:
  - `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');`
- Unified all canonical font tokens to a single serif source in `src/app/globals.css`:
  - `--font-family-display`, `--font-family-body`, and `--font-family-serif` now all resolve from `--font-family` → `--font-instrument-serif`
- Replaced lingering `var(--font-family-display)` inline style usage with `var(--font-family-serif)` in:
  - `src/components/PullQuote.tsx`
  - `src/components/modules/InteractiveModule.tsx`
  - `src/app/wake-up/page.tsx`
  - `src/app/offline/page.tsx`
- Updated stale typography comments in:
  - `src/components/MixedHeadline.tsx`
  - `design-system/typography-craft.css`

### Validation (Second Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Instrument Serif Local Asset Pass (2026-02-11)

- Root issue remained: browser/runtime could still fall back when external Google Fonts requests were blocked or delayed
- Added local Instrument Serif assets in `public/fonts/`:
  - `InstrumentSerif-Regular.ttf`
  - `InstrumentSerif-Italic.ttf`
- Replaced remote font import with local `@font-face` declarations in `src/app/globals.css`:
  - `src: url('/fonts/InstrumentSerif-Regular.ttf') format('truetype')`
  - `src: url('/fonts/InstrumentSerif-Italic.ttf') format('truetype')`
- Kept canonical font tokens mapped to Instrument Serif (`--font-family-display`, `--font-family-body`, `--font-family-serif`) so all typography utilities resolve to the same local family
- Removed temporary `next/font/google` dependency in `src/app/layout.tsx` so builds no longer require `fonts.googleapis.com`

### Validation (Local Asset Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes without external font fetches

### Homepage Conversion Flow Refactor (2026-02-11)

- Reworked `/` into a conversion-first funnel in `src/app/page.tsx` with a clearer sequence:
  - Above-the-fold value proposition + primary CTA
  - Low-friction "Start Here" soul-audit section
  - Matched results reveal
  - How-it-works clarity block
  - Featured series proof section
  - Objection-handling FAQ
  - Final CTA close
- Reduced visual imbalance by removing mixed-headline composition from the homepage and using simpler, consistent serif hierarchy for readability and scan speed
- Improved CTA hierarchy:
  - Primary: `Start 2-Minute Soul Audit`
  - Secondary: `Browse Series Library`
- Added trust and friction-reduction signals near the top of the page (`No account required`, time expectation, biblical grounding)
- Kept existing soul-audit behavior, limits, and matching logic intact while clarifying copy and outcome framing

### Validation (Homepage Conversion Refactor)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Color Uplift Pass (2026-02-11)

- Replaced drab brown-forward palette with a brighter, more life-giving core:
  - Deep blue base (`--color-tehom`)
  - Warm cream text/surfaces (`--color-scroll`)
  - More luminous sun-gold accent (`--color-gold`)
- Updated semantic dark/light tokens in `src/app/globals.css` for richer contrast and brighter surfaces (`--color-surface`, `--color-surface-raised`, borders, overlays, hover/active states)
- Refined global shadow and glow tokens for warmer visual energy (`--shadow-glow`, focus ring/shadow scales)
- Enhanced homepage visual atmosphere in `src/app/page.tsx`:
  - Luminous hero gradients
  - Gold-first primary CTA treatment
  - Elevated audit card with glow and subtle color wash
  - Added warm/cool gradient lifts to major informational sections

### Validation (Color Uplift Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Client Cache Refresh (2026-02-11)

- Bumped service worker cache namespace from `euangelion-v1` to `euangelion-v2` in `public/sw.js` so clients pick up latest homepage/style changes instead of stale cached assets

### Newspaper Hero + Masthead Hover (2026-02-11)

- Updated homepage hero composition in `src/app/page.tsx` to feel more newspaper-like:
  - Added dateline/edition strip with horizontal rules
  - Reframed left column as `LEAD STORY`
  - Kept Soul Audit as right-column front-page action above the fold
- Added interactive masthead behavior:
  - `EUANGELION` now animates to `GOOD NEWS` on mouse hover with vertical slide/fade transition
- Updated trust points to render as inline editorial bullets instead of card/button-like blocks

### Validation (Newspaper Hero Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Font Flash + Cache Update (2026-02-11)

- Reduced masthead font flash by upgrading Instrument Serif loading:
  - Added local `.woff2` files in `public/fonts/`
  - Updated `@font-face` in `src/app/globals.css` to prefer `.woff2` with `.ttf` fallback
  - Switched `font-display` from `swap` to `block` for the Instrument Serif faces
  - Added font preloads in `src/app/layout.tsx` for regular + italic Instrument Serif (`rel="preload" as="font"`)
- Bumped service worker cache key from `euangelion-v2` to `euangelion-v3` in `public/sw.js` to force fresh asset pickup

### Validation (Font Flash Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Navigation Newspaper Integration (2026-02-11)

- Added navigation variants in `src/components/Navigation.tsx`:
  - `default` (existing behavior for non-home routes)
  - `newspaper` (logo-free, section-rail style, centered links)
- Homepage now mounts navigation directly below the large masthead in `src/app/page.tsx`:
  - Removed top-level standalone nav placement above the hero
  - Inserted `Navigation` in newspaper mode under `EUANGELION`/`GOOD NEWS`
- Removed the small `EUANGELION` wordmark from the homepage nav rail to keep the masthead as the single brand headline

### Validation (Navigation Integration)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## v0.7.0 — Typography Masterclass (2026-02-10)

### Font Swap

- **Instrument Serif** replaces Cormorant Garamond — condensed display serif, visibly serifed at all sizes
- **Inter** replaces Space Grotesk — clean workhorse sans, 300-700 weight range
- EUANGELION wordmark now renders in Instrument Serif (serifs VISIBLE)

### New Components

- **MixedHeadline** (`src/components/MixedHeadline.tsx`) — emphasis-based mixed sans/serif headlines with `<Sans>` and `<Serif>` sub-components. KEY words in serif italic, STRUCTURAL words in sans caps
- **PullQuote** (`src/components/PullQuote.tsx`) — hanging gold oversized quote mark, thin gold rules above/below, centered attribution
- **OrnamentDivider** (`src/components/OrnamentDivider.tsx`) — gold rules with centered ornament character between modules

### Sacred Illumination CSS

- `type-mega` (4-10rem serif display), `type-micro` (0.6-0.75rem sans labels), `type-day-ornament` (6-14rem gold ghost number)
- `headline-sans` / `headline-serif` / `headline-mixed` — mixed headline utility classes
- `ornament-divider` — gold rule + ornament between sections
- `oldstyle-nums` — old-style numeral utility for casual numbers

### Page Typography Overhauls

- **Homepage:** MixedHeadline tagline ("DAILY _bread_ FOR THE _cluttered, hungry_ SOUL"), mixed section headers, Instrument Serif numbers (01/02/03), ghost Scripture text in visual break, gold ornament footer, gold rules on featured series cards
- **Devotional reader:** Massive `.type-day-ornament` behind title, MixedHeadline day header ("DAY 1 — _title_"), ornamental dividers between all modules, `type-prose` + `baseline-grid` on reading flow
- **Series browse:** MixedHeadline page title ("ALL _Series_"), section labels ("WAKE-UP _Magazine_", "DEEP _Dives_"), gold rules on cards, old-style numerals
- **Series detail:** Large Instrument Serif italic question, `type-micro` labels, Instrument Serif day numbers, `columns-prose` on long introductions
- **Soul Audit:** MixedHeadline question ("WHAT ARE YOU _wrestling with_ TODAY?")

### Activated Typography Features

- `type-prose` (ligatures, old-style nums, hanging punct) on all body text
- Drop caps (Instrument Serif gold) on Teaching and Story module openings
- Multi-column layouts (`columns-prose`) on long Teaching content
- PullQuote on TeachingModule `keyInsight`, InsightModule `fascinatingFact`, ProfileModule `keyQuote`, BridgeModule `connectionPoint`
- Old-style numerals on day counts, Strong's numbers, progress counters, copyright

### Version

- `package.json` bumped from `0.1.0` → `0.7.0`

---

## Fix What's Broken — Wire Infrastructure to UI

### 2026-02-09

- **Phase A: Remove auth gate** — Emptied `AUTH_REQUIRED_ROUTES` in middleware.ts. Devotionals now freely accessible without sign-in. Settings still requires auth.
- **Phase B: Homepage typography overhaul** — Imported GoldHighlight, DropCap, TextReveal into homepage. EUANGELION wordmark uses TextReveal (word-by-word GSAP reveal). "bread" wrapped in GoldHighlight (animated gold gradient on scroll). Invitation text uses DropCap component. Applied type-caption, type-display, type-data, type-prose, type-serif-flow across all homepage sections.
- **Phase C: Devotional module animations** — Animated gold-shimmer CSS (3s infinite sweep, reduced-motion safe). Added breathing prayer animation (6s subtle scale pulse). Wired GoldHighlight into VocabModule. Wired DropCap into TeachingModule. Wrapped PrayerModule in FadeIn. Added type-prose to all module body text (Story, Insight, Bridge, Reflection, Takeaway). Increased stagger timing (0.05 → 0.1s, capped at 0.5s).
- **Phase D: Site-wide polish** — TextReveal on devotional hero (non-image). type-display + type-prose on series browse, individual series, and Soul Audit pages. type-caption on Soul Audit label. type-serif-flow on series introductions and card questions.

---

## Production Relaunch — Phases 0-11

### 2026-02-09

- **Phase 0: Design system consolidation** — Imported design-system/ tokens into globals.css, created typography-craft.css (optical sizing, hanging punctuation, ligatures, baseline grid, multi-column utilities), created typographer.ts (smart quotes, em-dashes), built animation infrastructure (GSAP registry, Lenis provider, FadeIn/StaggerGrid/TextReveal/ParallaxLayer/GoldHighlight/DropCap motion components), installed gsap, framer-motion, lenis, zustand, @vercel/analytics
- **Phase 1: Zustand stores** — Created 6 stores (auth, progress, ui, settings, soulAudit, offline) with persist middleware, auth sign-in page, day-gating utility
- **Phase 2: Day-gating + Share + Analytics** — Day-gating at 7AM user timezone, ShareButton (Web Share API + clipboard fallback), Toast component, Vercel Analytics
- **Phase 3: Loading + Error + 404** — Brand-aligned error.tsx, not-found.tsx, loading skeletons per route, Skeleton UI component
- **Phase 4: Devotional reader prototype** — Scripture poster variants, typographer integration, content audit script
- **Phase 5: All modules enhanced** — Applied typographer() + GSAP animations to all 12 existing module components, built 9 additional module types (Chronology, Geography, Visual, Art, Voice, Interactive, Match, Order, Reveal)
- **Phase 6: Landing + Soul Audit visual** — Replaced IntersectionObserver with FadeIn/StaggerGrid across landing page and Soul Audit, mixed-font typography
- **Phase 7: Series + Navigation + micro-interactions** — Series pages migrated to motion components, Navigation aria attributes (aria-hidden on SVGs, role=dialog on mobile menu), z-index tokens replacing hardcoded values, .animated-underline + .btn-hover utilities
- **Phase 8: AI Research Chat** — DevotionalChat modal (Framer Motion slide-up), TextHighlightTrigger (text selection → "Ask about this"), ChatMessage component (favorite + color-code), two-tier API (BYOK + free with daily limit), chatStore (Zustand persist), Settings page API key input + chat history management
- **Phase 9: PWA** — manifest.json, service worker (cache-first static, network-first pages, offline fallback), offline page, PWA icons (192/512/maskable), ServiceWorkerRegistration component
- **Phase 10: Accessibility + SEO + Legal** — aria-live on Soul Audit results, JSON-LD BreadcrumbList on series + devotional pages, sitemap expanded to all 26 series + all pages, .prose-legal CSS class, print stylesheet enhanced (@page rules, EUANGELION branding header)
- **Phase 11: Cleanup** — Removed ~70 lines dead CSS (observe-fade, gentle-rise, stagger-\*, landing-reveal, fade-in-delay), removed dead functions from progress.ts, 0 lint warnings, 160 pages built
- **Deploy fix** — Added missing Skeleton.tsx, AnimationProvider.tsx, LenisProvider.tsx (created in Phases 0/3 but not staged in initial commit)

---

## Sprint 5 — Real MVP Rebuild

### 2026-02-09

- **Lumen-inspired continuous article redesign** — Removed all card backgrounds, borders, and box treatments from all 12 module components. Devotional content now flows as a continuous long-form article with only typography, whitespace, and gold accents for visual hierarchy. Hero uses full-bleed images (50-60vh) with gradient overlay (Lumen Art Space reference). Added `.reading-flow` CSS container (max-width 900px). Removed `isFullWidthModule` breakout system. Generous vertical spacing (my-16 md:my-24) between modules. Scripture keeps gold left-border blockquote; teaching keyInsight rendered as gold serif italic; fascintaing facts use subtle gold accent strip. No cards, no surfaces, no box borders — just headings, text, and whitespace.
- **Unified typography hierarchy across all modules** — Created CSS utility classes (`module-accent`, `module-callout`, `module-card`, `module-card-gold`, `module-surface`, `module-sublabel`) to replace inline styles. Standardized all 12 module components to consistent hierarchy: gold labels (`text-label vw-small text-gold`) for module type, `text-display vw-heading-md` for headings, `text-serif-italic vw-body-lg` for featured/sacred text (scripture, prayer, reflection prompts, key quotes), `vw-body text-secondary` for standard reading text, `module-sublabel` for sub-section labels, `vw-small text-muted` for metadata. Removed all inline `fontSize` overrides. VocabModule word now uses `.pull-quote` class instead of inline style.
- **Content pipeline rebuilt to preserve all original Substack data** — Rewrote `prepare-substack.ts` with spread-and-rename approach. All rich fields now preserved: pronunciation, wordByWord, Strong's numbers, keyInsight, historicalContext, fascinatingFact, leavingAtCross/receivingFromCross, forReflection, forAccountabilityPartners, connectionToTheme, ancientTruth, modernApplication, etc. 81 devotional JSONs regenerated.
- **ModuleRenderer simplified** — Replaced 120-line manual field mapper with 60-line spread-and-rename normalizer matching the pipeline approach. All fields pass through; only 7 critical renames applied.
- **All 12 module components upgraded** — ScriptureModule (+emphasis chips, Hebrew/Greek originals, scripture context), VocabModule (+pronunciation, Strong's badge, word-by-word table, related words, usage note), TeachingModule (+keyInsight callout), StoryModule (+connectionToTheme), InsightModule (+historicalContext, fascinatingFact), BridgeModule (structured Ancient Truth / Modern Application layout, connection point, NT echo), ReflectionModule (+additionalQuestions, invitationType label), PrayerModule (+posture label, prayer type), TakeawayModule (+commitment text, leavingAtCross/receivingFromCross lists), ComprehensionModule (dual-mode: quiz OR reflection), ProfileModule (+description, keyQuote pull-quote, lessonForUs), ResourceModule (+relatedScriptures, forDeeperStudy, greekVocabulary, weeklyChallenge). All components now have null guards.
- **Module type expanded** — Added ~40 optional fields to `Module` interface in `src/types/index.ts` covering all rich Substack data.
- **Test coverage** — New test asserting rich field preservation (vocab pronunciation/strongsNumber/wordByWord, takeaway commitment/leavingAtCross, comprehension forReflection, teaching keyInsight, bridge ancientTruth). 16 tests pass.

### 2026-02-08

- **113 Substack devotional images downloaded** — Extracted topImage URLs from all 117 HTML source files, downloaded to `public/images/devotionals/`. Created `src/data/devotional-images.ts` with full slug→image mapping (106 devotionals + 9 series intros). Helper functions `getDevotionalImage()` and `getSeriesHeroImage()`.
- **Devotional reader shows real images** — `DevotionalPageClient` displays devotional-specific hero image at top via `next/image` with dark overlay for readability. Falls back to gradient for series without images (Wake-Up 7).
- **Wake-Up added to navigation** — "Wake-Up" link added to desktop sticky bar and mobile slide-out menu, linking to existing `/wake-up` landing page.
- **All 19 Substack series have hero images** — Every Substack series in `series.ts` now has a `heroImage` field pointing to a locally-served photograph. Uses deepdive/intro images where available, day-1 images as fallback. `SeriesInfo` interface extended with optional `heroImage` field. `SeriesHero` component shows real image via `next/image` with gradient fallback for Wake-Up 7. Darker overlay for text readability on photos.
- **How It Works repositioned** — Moved directly under fold (after hero + audit results) for immediate clarity. Added SVG icons (compass, book, heart) to each step.
- **Paper.design-inspired visuals** — Dot-pattern background utility (`dot-pattern`, `dot-pattern-lg`). Applied to How It Works and What This Is sections. Editorial break upgraded with dot overlay, radial gold glow, and minimal cross motif.
- **Day-gating disabled** — `canReadDevotional()` always returns `{ canRead: true }`. All content freely accessible.
- **Fonts replaced** — Playfair Display → Cormorant Garamond (display/serif). Geist Sans → Space Grotesk (body/UI). Updated layout.tsx + globals.css.
- **19 Substack series wired up** — `scripts/prepare-substack.ts` converts 19 Substack JSONs (3+ format variants) into 81 individual devotional files in `public/devotionals/`. All 26 series now in `src/data/series.ts` with pathway + keywords metadata.
- **Module format normalization** — `ModuleRenderer.tsx` `normalizeModule()` handles flat, `content`-nested, and `data`-nested Substack formats. Maps field names (text→passage, body→content, meaning→definition, etc.).
- **SeriesHero component** — CSS gradient backgrounds per series/pathway. Three visual directions: radial (Sacred Chiaroscuro), wave (Textured Minimalism), grid (Risograph). Supports hero/card/thumbnail sizes.
- **Navigation rebuild** — Desktop: sticky persistent top bar with logo, nav links (Soul Audit, Series, Settings), dark mode toggle. Mobile: hamburger → right slide-out panel. Auto-closes on route change.
- **Landing page rebuild** — EUANGELION massive edge-to-edge wordmark. Inline Soul Audit textarea (no page navigation). Results appear as 3 equal cards with SeriesHero. Full-bleed editorial placeholder. Featured Series (4 curated). How It Works grid. Footer with legal links.
- **Soul Audit overhaul** — API now uses all 26 series in Claude prompt + keyword fallback. Returns 3 matches with reasoning + Day 1 previews (anchor verse + teaching paragraph). Results page: 3 equal visual cards with SeriesHero backgrounds.
- **Series browse rewrite** — Shows all 26 series grouped: Wake-Up Magazine (7) + Deep Dives (19). Visual cards with SeriesHero thumbnails, dynamic day counts, progress bars.
- **Series detail enhanced** — SeriesHero at top. Dynamic day count (not hardcoded 5). Chiastic structure description only for 5-day series.
- **Devotional reader — hybrid cinematic layout** — Full-width treatment (distinct background + borders) for Scripture, Vocab, Prayer, Comprehension. Continuous column for Teaching, Story, Insight, Bridge, etc. SeriesHero card at top. Series slug extraction from devotional slug.
- **Master Decisions Log** — `docs/MASTER-LOG.md` with 21 Sprint 5 decisions + 6 prior decisions.

**26 Series (7 Wake-Up + 19 Substack):**
identity, peace, community, kingdom, provision, truth, hope, too-busy-for-god, hearing-god-in-the-noise, abiding-in-his-presence, surrender-to-gods-will, in-the-beginning-week-1, what-is-the-gospel, why-jesus, what-does-it-mean-to-believe, what-is-carrying-a-cross, once-saved-always-saved, what-happens-when-you-repeatedly-sin, the-nature-of-belief, the-work-of-god, the-word-before-words, genesis-two-stories-of-creation, the-blueprint-of-community, signs-boldness-opposition-integrity, from-jerusalem-to-the-nations, witness-under-pressure-expansion

---

## Sprint 4 — Full MVP Build

### 2026-02-08

- **Landing page redesign** — ironhill.au-inspired: full-viewport hero with massive serif italic typography, scroll-reveal sections, invitation copy from PUBLIC-FACING-LANGUAGE.md, Soul Audit CTA, 7 questions, how-it-works grid
- **Brand copy fix** — Removed unapproved "VENERATE THE MIRACLE. DISMANTLE THE HAVEL." from 3 files, replaced with approved tagline "SOMETHING TO HOLD ONTO."
- **Navigation overhaul** — Added Home, Soul Audit, All Series, Settings links to slide-out menu
- **Soul Audit** — Full flow: `/soul-audit` question UI → `/api/soul-audit` Claude API matching with keyword fallback → `/soul-audit/results` with primary match + alternatives. Crisis detection protocol (988, Crisis Text Line). Soft validation.
- **Module Renderer** — 12 MVP module components: Scripture, Teaching, Vocab, Story, Insight, Prayer, Takeaway, Reflection, Bridge, Comprehension, Profile, Resource. ModuleRenderer switch component.
- **Day-gating** — 7 AM timezone unlock. Series start tracking in localStorage. Days unlock sequentially + time-gated.
- **Devotional viewer enhanced** — Now supports both legacy panel format and new module format. Auto-starts series tracking on first visit.
- **Series Browse** — `/series` page with card grid, progress indicators, Soul Audit CTA
- **Magic link auth API** — `/api/auth/magic-link` route using existing Supabase auth
- **Settings page** — `/settings` with theme (dark/light/system), Sabbath day, Bible translation preferences
- **Legal pages** — `/privacy` and `/terms` rendering markdown from content/legal/
- **Print stylesheet** — Force light mode, hide nav/buttons, page-break rules, show URLs
- **AI Content Pipeline** — `scripts/generate-devotionals.ts` using Claude API with chiastic structure (A-B-C-B'-A'), PaRDeS interpretation, 12 module types, Nicene Creed orthodoxy baseline. Outputs both module + legacy panel format.
- **Tracking system** — Pre-commit hook enforcing CHANGELOG updates, MEMORY.md full project state, CLAUDE.md corrections
- **Tests updated** — Smoke test updated for new landing page, all 10 tests passing

**Routes:**

- `/` — Landing page (redesigned)
- `/soul-audit` — Soul Audit question
- `/soul-audit/results` — Match results
- `/series` — All series browse
- `/settings` — User preferences
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/api/soul-audit` — Claude API matching
- `/api/auth/magic-link` — Send magic link

**Files created:** 20+ new files across src/app/, src/components/modules/, scripts/

---

## Deployment Fixes

### 2026-02-08

- **Domain transfer** (1f0fb0b) — euangelion.app moved to wokegodxs-projects, deleted duplicate euangelion-reio project
- **Deployment guardrails** (f5f60e8) — Added `scripts/check-deploy.sh`, deployment rules in CLAUDE.md, .gitignore fix for .env\*.local
- **Middleware fix** (60c520d) — Handle missing Supabase env vars gracefully in middleware, preventing 500 errors

---

## Illustration Pipeline

### 2026-02-07

- **Multi-backend illustration pipeline** (0ca5e67) — Expanded image generation to support Gemini + LegNext backends with 5 visual directions (Sacred Chiaroscuro, Textured Minimalism, Risograph Sacred, Bold Digital Collage, HOLOGRAPHIK Swiss). Series-to-direction mapping, day-3 chiastic overrides, brand palette integration. 2 test cover images generated.

---

## Sprint 3 — Supabase Database, Auth, Sessions (COMPLETE)

### 2026-02-07

- **Supabase integration** (862a9a9) — Typed clients (browser, server, admin), anonymous session management via httpOnly cookies, magic link auth flow callback
- **Middleware** — Route protection for /daily-bread and /settings
- **Database migrations** — user_sessions table, pathway/modules columns, devotional_slug unique constraint
- **Seed script** — Loads all 19 Substack + 7 Wake Up series (30 series, 85 devotionals) into Supabase
- **Files:** `src/lib/supabase/`, `src/lib/session.ts`, `src/lib/auth.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts`, `scripts/seed-series.ts`, `database/types.ts`

---

## Sprint 2 — Editorial Visual Redesign, SEO Foundation (COMPLETE)

### 2026-02-06

- **Editorial redesign** (61e26dc) — Transformed Wake-Up from generic layouts into publication-quality editorial experience with dramatic typography, breathing whitespace, scroll-driven reveals
- **Client components** — DevotionalPageClient.tsx, SeriesPageClient.tsx (extracted for client interactivity)
- **SEO** — Sitemap (`src/app/sitemap.ts`), robots.txt (`src/app/robots.ts`), OG images (root + devotional + series), JSON-LD structured data
- **Illustration pipeline** — `scripts/generate-illustrations.ts` for 42 devotional covers via LegNext Midjourney API
- **CSS** — Additional editorial typography classes, section transitions

---

## Design System Facelift (COMPLETE)

### 2026-02-06

- **Token system** (c3fb5a8) — Replaced placeholder styling with documented design system
- **Colors:** Exact hex values (#1A1612 Tehom, #F7F3ED Scroll, #C19A6B Gold) with semantic token system that auto-flips for dark/light mode
- **Typography:** Geist Sans replaces Impact+Inter; Playfair Display for masthead/serif; fluid base size clamp(15px, 1vw+14px, 17px)
- **Spacing:** 4px-base semantic scale, 680px reading column, 44px touch targets
- **Animation:** "gentle rise" pattern (fade+24px translateY), documented easing curves, 60ms stagger, prefers-reduced-motion support
- **Components:** All pages updated to semantic tokens, ScrollProgress fades after inactivity, Navigation uses Tehom background

---

## Sprint 1 — Wake-Up Magazine (COMPLETE)

### 2026-02-06

- **Core infrastructure** — Navigation component (hamburger menu, dark mode toggle, slide-out panel), ScrollProgress, design system (globals.css with HSL colors, dark mode, animations, typography utilities), type definitions, Playfair Display + Inter fonts
- **Landing page** — Brand page at `/` with CTA to Wake-Up Magazine
- **Wake-Up Magazine page** — `/wake-up` with hero, problem statement, how-it-works, 7 series question cards with IntersectionObserver animations
- **Series detail page** — `/wake-up/series/[slug]` with introduction, context, chiastic structure info, 5-day list with locked/unlocked states, progress bar, lock modal
- **Devotional viewer** — `/wake-up/devotional/[slug]` loading JSON panels from `/public/devotionals/`, scroll progress bar, panel renderer (text, text-with-image, prayer), scripture detection, bold text parsing, mark-as-complete with reading time
- **Supporting utilities** — `progress.ts` (localStorage progress tracking), `bookmarks.ts` (localStorage bookmarks), `useProgress` hook, `useReadingTime` hook
- **Shared data module** — `src/data/series.ts` with all 7 series metadata
- **Routes:** `/`, `/wake-up`, `/wake-up/series/[slug]`, `/wake-up/devotional/[slug]`
- **Build, lint, tests all pass**

---

## Sprint 0 — Foundation (COMPLETE)

### 2026-02-06

- **Fresh project initialized** — New Next.js 16 app with TypeScript strict mode, Tailwind v4, App Router, src/ directory
- **Tooling configured** — Vitest + RTL, ESLint + Prettier, husky + lint-staged, GitHub Actions CI
- **Foundational files migrated** from old project:
  - `.claude/` agents (8) and skills (2)
  - `content/` — all content including 20 series-json, analytics, drafts, outlines, legal
  - `content/reference/` — 13GB reference library (gitignored)
  - `docs/` — 38 documentation files
  - `database/` — SQL migrations, seed data, types
  - `design-system/` — tokens, typography, dark mode CSS
  - `scripts/` — sync/upload reference scripts
  - `public/devotionals/` — 42 devotional JSON files
- **Coming soon landing page** — Dark-first, minimal
- **Root error boundary** and 404 page
- **CLAUDE.md**, **CHANGELOG.md**, **.env.example**
