# Changelog

All notable changes to Euangelion are documented here.
Format: Reverse chronological, grouped by sprint/date.

---

## Current Status

**Sprint 1 — Wake-Up Magazine** (IN PROGRESS)

Goal: Working Wake-Up Magazine at `/wake-up` with all 35 devotionals.

- [x] 1.1 Coming soon landing page — brand landing at `/` with CTA to `/wake-up`
- [x] 1.2 Explore old code — read, understand, decide: copy/adapt/rewrite
- [x] 1.3 Core infrastructure — Navigation, dark mode toggle, design system, fonts, types
- [x] 1.4 Wake-Up Magazine page — 7 series cards at `/wake-up`
- [x] 1.5 Devotional viewer — `/wake-up/devotional/[slug]`, panel renderer, ScrollProgress
- [x] 1.6 Supporting utilities — progress.ts, bookmarks.ts, useProgress hook (all localStorage)
- [ ] 1.7 Visual polish — dark mode, fonts, mobile responsive, touch targets (max 2 days)
- [ ] 1.8 Testing — component renders, 35 JSON loads, nav flow, dark mode, mobile

Done when: `/wake-up` shows 7 series, day pages render, dark mode works, mobile responsive, build + tests pass.

---

## Sprint 1 — Wake-Up Magazine (IN PROGRESS)

### 2026-02-06

- **Core infrastructure migrated** — Navigation component (hamburger menu, dark mode toggle, slide-out panel), ScrollProgress, design system (globals.css with HSL colors, dark mode, animations, typography utilities), type definitions, Playfair Display + Inter fonts
- **Landing page** — Brand page at `/` with CTA to Wake-Up Magazine (dark, minimal, design-system typography)
- **Wake-Up Magazine page** — `/wake-up` with hero, problem statement, how-it-works, 7 series question cards with IntersectionObserver animations
- **Series detail page** — `/wake-up/series/[slug]` with introduction, context, chiastic structure info, 5-day list with locked/unlocked states, progress bar, lock modal
- **Devotional viewer** — `/wake-up/devotional/[slug]` loading JSON panels from `/public/devotionals/`, scroll progress bar, panel renderer (text, text-with-image, prayer), scripture detection, bold text parsing, mark-as-complete with reading time
- **Supporting utilities** — `progress.ts` (localStorage progress tracking with custom events), `bookmarks.ts` (localStorage bookmarks with toggle), `useProgress` hook (reactive state wrapper), `useReadingTime` hook
- **Shared data module** — `src/data/series.ts` with all 7 series metadata (SERIES_DATA, DEVOTIONAL_SERIES, SERIES_ORDER)
- **Routes:** `/`, `/wake-up`, `/wake-up/series/[slug]`, `/wake-up/devotional/[slug]`
- **Build, lint, tests all pass**

---

## Sprint 0 — Foundation (COMPLETE)

### 2026-02-06

- **Fresh project initialized** — New Next.js 16 app with TypeScript strict mode, Tailwind v4, App Router, src/ directory
- **Tooling configured** — Vitest + RTL, ESLint + Prettier, husky + lint-staged, GitHub Actions CI
- **Foundational files migrated** from old project:
  - `.claude/` agents (8) and skills (2) — updated all path references for new structure
  - `content/` — all content including 20 series-json, analytics, drafts, outlines, legal
  - `content/reference/` — 13GB reference library (symlinked from old project, gitignored)
  - `docs/` — 38 documentation files
  - `database/` — SQL migrations, seed data, types
  - `supabase/` — config, migrations
  - `design-system/` — tokens, typography, dark mode CSS
  - `scripts/` — sync/upload reference scripts
  - `public/devotionals/` — 42 devotional JSON files
  - `docs/design/` — reference images, project hub
- **Coming soon landing page** — Dark-first, minimal, at root `/`
- **Root error boundary** and 404 page
- **CLAUDE.md** written — concise project context with doc index
- **CHANGELOG.md** created — this file
- **.env.example** — environment variable template
- **Old project archived** — Timestamped tarball + .env backup
