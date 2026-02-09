# Changelog

All notable changes to Euangelion are documented here.
Format: Reverse chronological, grouped by sprint/date.

---

## Current Status

**Target:** Easter 2026 MVP launch
**Now:** Sprint 5 complete — Real MVP with 26 series, inline audit, hybrid cinematic reader
**Next:** Generate real images (Gemini pipeline), analytics, share flow

### What's Built

- [x] Sprint 0 — Foundation (Next.js 16, tooling, content migration)
- [x] Sprint 1 — Wake-Up Magazine (7 series, 35 devotionals, panel viewer)
- [x] Design System Facelift — Tehom/Scroll/Gold tokens, semantic colors
- [x] Sprint 2 — Editorial redesign, SEO, illustration pipeline script
- [x] Sprint 3 — Supabase database, auth, sessions
- [x] Deployment — euangelion.app live on wokegodxs-projects
- [x] Sprint 4 — Initial MVP (landing page, Soul Audit, modules, series browse, settings, legal, AI pipeline)
- [x] Sprint 5 — Real MVP rebuild (26 series, fonts, inline audit, hybrid cinematic reader, navigation, SeriesHero)

### What's NOT Built (Post-MVP)

- [ ] Progress tracking → Supabase (currently localStorage)
- [ ] Analytics (Plausible)
- [ ] Real hero images (Gemini pipeline — CSS placeholders in place)
- [ ] Share flow (Web Share API)

---

## Sprint 5 — Real MVP Rebuild

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
