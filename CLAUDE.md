# Euangelion

**Christian devotional PWA** — ancient wisdom, modern design. Spiritual formation over engagement metrics.

- **URL:** euangelion.app
- **Brand:** Euangelion (Greek: "Good News")
- **GitHub:** wokegodX/euangelion (private)
- **Vercel:** wokegodxs-projects/euangelion (ONLY this team — never james-projects)

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript (strict)
- **Styling:** Tailwind CSS v4, dark-first
- **Database:** Supabase (PostgreSQL + RLS + Auth)
- **Testing:** Vitest + React Testing Library
- **Deploy:** Vercel (Pro for launch capacity)
- **CI:** GitHub Actions (build + lint + type-check + test)

## Commands

```bash
npm run dev          # Dev server on port 3333
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # Run tests
npm run format       # Prettier format
```

## Project Structure

```
src/
├── app/
│   ├── (wake-up)/        # Wake-Up Magazine route group
│   ├── api/              # API routes (max 12)
│   ├── error.tsx         # Root error boundary
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── components/           # React components
├── hooks/                # Custom hooks
├── lib/                  # Utilities
└── types/                # TypeScript types
public/devotionals/       # 42 devotional JSON files
content/                  # Source content + strategy docs
  └── reference/          # 13GB reference library (gitignored)
docs/                     # Project documentation (38 files)
database/                 # SQL migrations + seed data
design-system/            # Design tokens, typography, dark mode
.claude/agents/           # 8 specialized agents
.claude/skills/           # euangelion-platform, wokegod-brand
```

## Code Patterns

- **Components:** `'use client'` only when needed. PascalCase files.
- **Naming:** Components PascalCase, utilities camelCase, routes kebab-case
- **Styling:** Tailwind utility classes. Order: layout → position → size → spacing → typography → visual → interactive
- **State:** React hooks + localStorage (no external state lib yet)
- **Dark mode:** Dark-first (`html.dark`). HSL color system.
- **Fonts:** Instrument Serif (body + display reading copy), Industry (UI/meta/nav labels), SBL Hebrew for original language.

## Design Philosophy

- Sacred minimalism — content over decoration
- Dark mode first
- Typography forward — Scripture should be beautiful
- Mobile first (test at 375px, 768px, 1024px)
- Touch targets ≥ 44px

## Visual Directions

Three visual directions proposed (founder decision pending):

1. **Sacred Chiaroscuro** — light breaking into darkness (Caravaggio, Tehom+Gold)
2. **Textured Minimalism** — quiet presence, earned emptiness (Kinfolk, earth tones)
3. **Risograph Sacred** — ancient texts through xerox (bold, limited palette)
   Recommended: Hybrid (all 3 contextually). See: `docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md`

## Constraints

- **Port 3333** — ports 3000-3005 are occupied
- **Vercel route count** — current API surface exceeds Hobby limits; Pro is required pre-launch
- **Reference library** — 13GB in `content/reference/`, always gitignored
- **WCAG 2.1 AA** minimum accessibility
- **Performance:** LCP < 2.5s, FID < 100ms, CLS < 0.1

## Key Docs

| Area          | File                                                               |
| ------------- | ------------------------------------------------------------------ |
| Vision        | `docs/VISION.md`, `docs/PHILOSOPHY.md`                             |
| Audience      | `docs/AUDIENCE.md`, `docs/PUBLIC-FACING-LANGUAGE.md`               |
| Architecture  | `docs/ARCHITECTURE.md`, `docs/technical/`                          |
| Content       | `content/SERIES-DESCRIPTIONS.md`, `content/DEVOTIONAL-STRATEGY.md` |
| AI guardrails | `docs/AI-CONTENT-CONSTRAINTS.md`                                   |
| Design        | `docs/DARK-MODE-SPECIFICATION.md`, `design-system/`                |
| Visual dirs   | `docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md`                     |
| MVP scope     | `docs/MVP-SCOPE.md`, `docs/SPRINT-PLAN.md`                         |
| Database      | `database/COMBINED_MIGRATION.sql`, `database/seed-data.sql`        |
| Legal         | `content/legal/`, `docs/legal/`                                    |
| Progress      | `CHANGELOG.md` — current sprint status + full history              |

## Production Tracking Spine (Read First)

These are mandatory every session and are the continuity backbone after context compaction:

1. `docs/PRODUCTION-SOURCE-OF-TRUTH.md` — human canonical product intent.
2. `docs/production-decisions.yaml` — machine contracts and decision ids.
3. `docs/PRODUCTION-FEATURE-SCORECARD.md` — current feature-by-feature quality rating.
4. `docs/PRODUCTION-10-10-PLAN.md` — gap-to-10 execution plan with acceptance criteria.
5. `docs/PRODUCTION-COMPACTION-HANDOFF.md` — resume protocol and handoff checklist.
6. `CHANGELOG.md` — historical log of shipped changes.
7. `docs/feature-prds/FEATURE-PRD-INDEX.md` — canonical feature PRD list.
8. `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml` — machine-readable feature registry.
9. `docs/methodology/M00-EUANGELION-UNIFIED-METHODOLOGY.md` — canonical IA/navigation UX method.
10. `docs/appstore/APP-STORE-RELEASE-GATE.md` — release gate requirements.
11. `docs/REFERENCE-FOLDERS-INDEX.md` — frozen reference folder policy.

## Product Alignment Docs (Required For UX Decisions)

When changing user-facing behavior, these must be consulted in addition to the tracking spine:

1. `docs/AUDIENCE.md` — who this is for and what they expect emotionally.
2. `docs/PUBLIC-FACING-LANGUAGE.md` — approved tone/copy patterns.
3. `docs/UX-FLOW-MAPS.md` — intended journey sequencing and decision points.
4. `docs/SUCCESS-METRICS.md` — what “good flow” should optimize for.

## Operating Playbooks

1. `docs/runbooks/NEXT-SESSION-OPERATING-RUNBOOK.md` — exact protocol for continuing work in the next terminal session with no contract drift.
2. `docs/process/FUTURE-APP-ENVIRONMENT-PLAYBOOK.md` — reusable environment bootstrap and governance model for future app projects.
3. `docs/process/CLAUDE-SKILL-SYSTEM.md` — skill architecture standard aligned to Anthropic skill guidance.

## Skill + Agent System

- Skill index: `.claude/skills/README.md`
- Workflow agent roster: `.claude/agents/AGENT-ROSTER.md`
- Canonical specialist agents:
  - `.claude/agents/PRODUCT-MANAGER.md`
  - `.claude/agents/SOUL-AUDIT-ENGINEER.md`
  - `.claude/agents/BACKEND-PLATFORM-ENGINEER.md`
  - `.claude/agents/FRONTEND-DEVELOPER.md`
  - `.claude/agents/DEVOTIONAL-WRITER.md`
  - `.claude/agents/DEVOTIONAL-EDITOR.md`
  - `.claude/agents/QA-TEST-ENGINEER.md`
  - `.claude/agents/RELEASE-MANAGER.md`

Before commit/PR (full guide: `docs/runbooks/COMMIT-AND-DEPLOY-GUIDE.md`):

```bash
npm run type-check
npm run verify:production-contracts
npm run verify:tracking
npm run lint
npm test
```

Release-quality verification (required before “production ready” claims):

```bash
npm run verify:ios-readiness
npm run build
```

## Current Status

See `CHANGELOG.md` for full history and current sprint checklist.
See `docs/MASTER-LOG.md` for all founder decisions across sessions.

**Now:** Sprint 5 — Real MVP rebuild (26 series, inline audit, hybrid cinematic reader)
**Done:** Sprint 0 (foundation), Sprint 1 (Wake-Up Magazine), Sprint 2 (editorial redesign, SEO), Sprint 3 (Supabase, auth), Sprint 4 (initial MVP), Sprint 5 (real MVP)

## Deployment

**CRITICAL — read before any deployment action:**

- **GitHub account:** `creativcreature`. This machine has multiple gh accounts — MUST switch first.
- **GitHub repo:** `creativcreature/euongelion`
- **Vercel team:** `james-projects-5d824c1e/euongelion`
- **Git email:** Must be `chrisparker21@gmail.com`.
- **Production URL:** `https://euangelion.app`
- **Auto-deploy:** GitHub integration deploys on every push to `main`. No manual deploy needed.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` — set in Vercel project settings.

**Before ANY push or deploy, run ALL of these:**

```bash
gh auth switch --user creativcreature  # This machine has multiple gh accounts — MUST switch first
gh auth status                          # Confirm active account is creativcreature
git config user.email                   # Confirm it says chrisparker21@gmail.com
```

If any check fails, **STOP**. Do not push or deploy.

**Full commit/deploy walkthrough:** `docs/runbooks/COMMIT-AND-DEPLOY-GUIDE.md`

## Rules

1. **Update CHANGELOG.md** after every completed task
2. **Explore → Plan → Implement → Verify.** Read code before changing it.
3. **Use `/clear`** between unrelated tasks to keep context clean
4. **Pre-commit hooks** enforce lint + type-check on every commit
5. **Branch for non-trivial work.** `main` = production. Feature branches for larger changes.
6. **Don't over-engineer.** Build what's needed now, not what might be needed later.
7. **Surface assumptions.** State them before implementing. Ask if uncertain.
8. **Verify accounts before deploying.** Check `vercel whoami` and `git config user.email` before any deploy or push. Wrong account = broken deploys.
9. **Never ship doc/contract drift.** `docs/PRODUCTION-SOURCE-OF-TRUTH.md`, `docs/production-decisions.yaml`, `docs/PRODUCTION-FEATURE-SCORECARD.md`, `docs/PRODUCTION-10-10-PLAN.md`, `docs/PRODUCTION-COMPACTION-HANDOFF.md`, and `CHANGELOG.md` must remain aligned.
10. **No partial launch.** Do not ship degraded MVP/auth/content pathways. Release only when full launch gate passes.

## Reference Library

Biblical reference materials in Supabase Storage bucket `reference-library`. Local copies in `content/reference/` (gitignored).

```bash
./scripts/sync-reference.sh              # Download from Supabase
./scripts/upload-reference.sh            # Upload to Supabase
./scripts/upload-reference.sh commentaries  # Upload specific folder
```
