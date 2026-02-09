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
- **Deploy:** Vercel (Hobby — max 12 serverless functions)
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
- **Fonts:** Space Grotesk (body/UI, closest free to Monument Grotesk), Cormorant Garamond (display/serif, closest free to Editorial New). SBL Hebrew for original language.

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
- **Vercel Hobby** — max 12 serverless functions
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

## Current Status

See `CHANGELOG.md` for full history and current sprint checklist.
See `docs/MASTER-LOG.md` for all founder decisions across sessions.

**Now:** Sprint 5 — Real MVP rebuild (26 series, inline audit, hybrid cinematic reader)
**Done:** Sprint 0 (foundation), Sprint 1 (Wake-Up Magazine), Sprint 2 (editorial redesign, SEO), Sprint 3 (Supabase, auth), Sprint 4 (initial MVP), Sprint 5 (real MVP)

## Deployment

**CRITICAL — read before any deployment action:**

- **Vercel account:** `wokegodx` on team `wokegodxs-projects`. NEVER deploy to any other team.
- **Git email:** Must be `wokegod3@gmail.com`. Vercel rejects commits from unrecognized emails.
- **Auto-deploy:** GitHub integration deploys on every push to `main`. No manual deploy needed.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` — set in Vercel project settings.
- **Before deploying:** Run `npx vercel whoami` and confirm it says `wokegodx`. If it says anything else, STOP.
- **Before committing:** Run `git config user.email` and confirm it says `wokegod3@gmail.com`. If not, STOP.

## Rules

1. **Update CHANGELOG.md** after every completed task
2. **Explore → Plan → Implement → Verify.** Read code before changing it.
3. **Use `/clear`** between unrelated tasks to keep context clean
4. **Pre-commit hooks** enforce lint + type-check on every commit
5. **Branch for non-trivial work.** `main` = production. Feature branches for larger changes.
6. **Don't over-engineer.** Build what's needed now, not what might be needed later.
7. **Surface assumptions.** State them before implementing. Ask if uncertain.
8. **Verify accounts before deploying.** Check `vercel whoami` and `git config user.email` before any deploy or push. Wrong account = broken deploys.

## Reference Library

Biblical reference materials in Supabase Storage bucket `reference-library`. Local copies in `content/reference/` (gitignored).

```bash
./scripts/sync-reference.sh              # Download from Supabase
./scripts/upload-reference.sh            # Upload to Supabase
./scripts/upload-reference.sh commentaries  # Upload specific folder
```
