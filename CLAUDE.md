# Euangelion

**Christian devotional PWA** — ancient wisdom, modern design. Spiritual formation over engagement metrics.

- **URL:** euangelion.app (pending)
- **Brand:** Euangelion (Greek: "Good News")
- **GitHub:** wokegodX/euangelion (private)
- **Vercel:** wokegodxs-projects

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
- **Fonts:** Impact (display), Playfair Display (serif), Inter (body)

## Design Philosophy

- Sacred minimalism — content over decoration
- Dark mode first
- Typography forward — Scripture should be beautiful
- Mobile first (test at 375px, 768px, 1024px)
- Touch targets ≥ 44px

## Visual Directions

Five contextual art directions: Risograph, Limited Palette, Contemplative Sacred, Bold Digital Collage, HOLOGRAPHIK Swiss.
See: `docs/decisions/VISUAL-DIRECTIONS-PROPOSAL.md`
Mood board: https://creativcreature.github.io/EUONGELION-Project-HUB/project-hub.html

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

## Rules

1. **Update CHANGELOG.md** after every completed task
2. **Explore → Plan → Implement → Verify.** Read code before changing it.
3. **Use `/clear`** between unrelated tasks to keep context clean
4. **Pre-commit hooks** enforce lint + type-check on every commit
5. **Branch for non-trivial work.** `main` = production. Feature branches for larger changes.
6. **Don't over-engineer.** Build what's needed now, not what might be needed later.
7. **Surface assumptions.** State them before implementing. Ask if uncertain.

## Reference Library

Biblical reference materials in Supabase Storage bucket `reference-library`. Local copies in `content/reference/` (gitignored).

```bash
./scripts/sync-reference.sh              # Download from Supabase
./scripts/upload-reference.sh            # Upload to Supabase
./scripts/upload-reference.sh commentaries  # Upload specific folder
```
