# Changelog

All notable changes to Euangelion are documented here.
Format: Reverse chronological, grouped by sprint/date.

---

## Sprint 0 — Foundation

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
