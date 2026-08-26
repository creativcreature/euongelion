# Euangelion

**Christian devotional PWA** — ancient wisdom, modern design. Spiritual formation over engagement metrics.

- **URL:** euangelion.app
- **Brand:** Euangelion (Greek: "Good News")
- **GitHub:** creativcreature/euongelion (private)
- **Hosting:** Cloudflare Workers (migrated from Vercel)
- **Cloudflare account:** chrisparker21@gmail.com (Account ID: 15a3f83632fea316caa448503bb786f9)

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript (strict)
- **Styling:** Tailwind CSS v4, dark-first
- **Database:** Supabase (PostgreSQL + RLS + Auth)
- **Testing:** Vitest + React Testing Library
- **Deploy:** Cloudflare Workers via OpenNext (`npm run deploy`)
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
public/devotionals/       # 175 devotional JSON files (32 series)
content/                  # Source content + strategy docs
  └── reference/          # 13GB reference library (gitignored)
docs/                     # Project documentation (38 files)
database/                 # SQL migrations + seed data
design-system/            # Design tokens, typography, dark mode
.Codex/agents/           # 8 specialized agents
.Codex/skills/           # euangelion-platform, wokegod-brand
```

## Code Patterns

- **Components:** `'use client'` only when needed. PascalCase files.
- **Naming:** Components PascalCase, utilities camelCase, routes kebab-case
- **Styling:** Tailwind utility classes. Order: layout → position → size → spacing → typography → visual → interactive
- **State:** React hooks + localStorage (no external state lib yet)
- **Dark mode:** Dark-first (`html.dark`). HSL color system.
- **Fonts:** Instrument Serif (body + display reading copy), Industry (UI/meta/nav labels), SBL Hebrew for original language.
- **Middleware:** Next.js 16 uses `proxy.ts` (NOT `middleware.ts`). Do not create `middleware.ts`.

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
- **Cloudflare Workers free plan** — 10ms CPU time, 30s wall-clock per request. LLM-heavy routes may need paid plan ($5/mo) or architecture changes.
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
4. `docs/SUCCESS-METRICS.md` — what "good flow" should optimize for.

## Operating Playbooks

1. `docs/runbooks/NEXT-SESSION-OPERATING-RUNBOOK.md` — exact protocol for continuing work in the next terminal session with no contract drift.
2. `docs/process/FUTURE-APP-ENVIRONMENT-PLAYBOOK.md` — reusable environment bootstrap and governance model for future app projects.
3. `docs/process/Codex-SKILL-SYSTEM.md` — skill architecture standard aligned to Anthropic skill guidance.

## Skill + Agent System

- Skill index: `.Codex/skills/README.md`
- Workflow agent roster: `.Codex/agents/AGENT-ROSTER.md`
- Canonical specialist agents:
  - `.Codex/agents/PRODUCT-MANAGER.md`
  - `.Codex/agents/SOUL-AUDIT-ENGINEER.md`
  - `.Codex/agents/BACKEND-PLATFORM-ENGINEER.md`
  - `.Codex/agents/FRONTEND-DEVELOPER.md`
  - `.Codex/agents/DEVOTIONAL-WRITER.md`
  - `.Codex/agents/DEVOTIONAL-EDITOR.md`
  - `.Codex/agents/QA-TEST-ENGINEER.md`
  - `.Codex/agents/RELEASE-MANAGER.md`

Before commit/PR (full guide: `COMMIT-AND-DEPLOY-GUIDE.md`):

```bash
npm run type-check
npm run verify:production-contracts
npm run verify:tracking
npm run lint
npm test
```

Release-quality verification (required before "production ready" claims):

```bash
npm run verify:ios-readiness
npm run build
```

## Image Library — Always Check First (NON-NEGOTIABLE)

This project has ~8,500 generated images already on disk. **Always check the library before generating a new image.** Generation is the last resort.

**Inventory (as of 2026-05-13):**

| Path                                         | Files | Purpose                                                      |
| -------------------------------------------- | ----- | ------------------------------------------------------------ |
| `public/images/library/`                     | 1,405 | Canonical curated set, 6 surfaces (see below)                |
| `public/images/library/poster/`              | 602   | **Riso/halftone duotone, blue-majority — the brand style**   |
| `public/images/library/devotional/`          | ~250  | Inline devotional art (painterly, religious, varied periods) |
| `public/images/library/hero/`                | ~100  | Wide hero banners                                            |
| `public/images/library/chapter-header/`      | ~150  | Section / chapter headers                                    |
| `public/images/library/decorative/`          | ~150  | Borders, ornaments, decorative inserts                       |
| `public/images/library/logo/`                | ~150  | Logo variants                                                |
| `public/images/generated-2026-05-04/`        | 803   | Raw outputs from the May 4 batch (canonical originals)       |
| `public/images/generated-2026-05-04-vertex/` | 4,368 | Vertex AI batch from May 4 (multiple regions / models)       |
| `archive/devotional-prints/`                 | 1,923 | Historical print-style artwork archive (643 dirs)            |

**Canonical manifest:** `docs/image-library-catalog-2026-05-08.json` (1.7 MB, 1,404 entries with keywords + surface tags). When picking an image, search this manifest by keyword first.

**Rules (HARD):**

1. **No arbitrary image use.** Every image must have a clear contextual reason for being in its slot. If you can't justify the choice in one sentence, find a different image or leave the slot empty.
2. **Manifest first, generation last.** Before generating any new image: grep `docs/image-library-catalog-2026-05-08.json` for relevant keywords; render the top 3-5 candidates; pick the best fit. Only generate when zero candidates fit.
3. **Style spec (current brand direction, 2026-05-13):** Two-color risograph / screen-print aesthetic with heavy Ben-Day halftone dots visible across all tones. Strict duotone — deep cobalt / ultramarine blue + cream / off-white paper, with one spot color accent (crimson red) used sparingly. Slight misregistration, paper grain, ink saturation variance. High horizon, negative space, single subject off-center. **No grays — every shadow is dot density.** **No text** on images (Hebrew / Greek script is allowed because it is content, not decoration). The `library/poster/` subdir is the gold standard for this style.
4. **Real photographs are forbidden** on user-facing surfaces. Strip any photograph the moment it's identified.
5. **When you reassign an image,** update the catalog entry's `assignedTo` field (or add it if missing) so future sessions know which library images are already in use vs available. Re-running `npm run generate:artwork-manifest` should NEVER overwrite manual assignments — confirm the script preserves them or update the script first.

When in doubt about an image choice, surface it to the founder before shipping ("Using X for slot Y because Z — better fit available?").

## Current Status

See `CHANGELOG.md` for full history and current sprint checklist.
See `docs/MASTER-LOG.md` for all founder decisions across sessions.

**Now:** Sprint 5 — Real MVP rebuild (32 series, 175 devotionals, Apple TV browse, inline audit)
**Done:** Sprint 0 (foundation), Sprint 1 (Wake-Up Magazine), Sprint 2 (editorial redesign, SEO), Sprint 3 (Supabase, auth), Sprint 4 (initial MVP), Sprint 5 (real MVP)

## Deployment

**CRITICAL — read before any deployment action:**

- **GitHub account:** `creativcreature`. This machine has multiple gh accounts — MUST switch first.
- **GitHub repo:** `creativcreature/euongelion`
- **Git email:** Must be `chrisparker21@gmail.com`.
- **Production URL:** `https://euangelion.app`
- **Auto-deploy:** GitHub integration deploys on every push to `main`. No manual deploy needed.

**Cloudflare Workers (current hosting):**

- **Cloudflare account:** `chrisparker21@gmail.com`
- **Account ID:** `15a3f83632fea316caa448503bb786f9`
- **Worker name:** `euangelion`
- **Usage model:** `standard` (free tier — 10ms CPU, 30s wall-clock per request)
- **Config:** `wrangler.jsonc`
- **Deploy command:** `npm run deploy` (runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`)
- **Routes:** `euangelion.app/*` and `www.euangelion.app/*`
- **Secrets set:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`
- **Slim reference index:** `public/reference-index-slim.json` (3.2 MB, used on Workers instead of full 15 MB index)

**Before ANY push or deploy, run ALL of these:**

```bash
gh auth switch --user creativcreature  # This machine has multiple gh accounts — MUST switch first
gh auth status                          # Confirm active account is creativcreature
git config user.email                   # Confirm it says chrisparker21@gmail.com
npx wrangler whoami                     # Confirm Cloudflare account is chrisparker21@gmail.com
```

If any check fails, **STOP**. Do not push or deploy.

**Full commit/deploy walkthrough:** `COMMIT-AND-DEPLOY-GUIDE.md`

## Rules

1. **Update CHANGELOG.md** after every completed task
2. **Explore → Plan → Implement → Verify.** Read code before changing it.
3. **Use `/clear`** between unrelated tasks to keep context clean
4. **Pre-commit hooks** enforce lint + type-check on every commit
5. **Branch for non-trivial work.** `main` = production. Feature branches for larger changes.
6. **Don't over-engineer.** Build what's needed now, not what might be needed later.
7. **Surface assumptions.** State them before implementing. Ask if uncertain.
8. **Verify accounts before deploying.** Check `gh auth status` and `git config user.email` before any deploy or push. Wrong account = broken deploys.
9. **Never ship doc/contract drift.** `docs/PRODUCTION-SOURCE-OF-TRUTH.md`, `docs/production-decisions.yaml`, `docs/PRODUCTION-FEATURE-SCORECARD.md`, `docs/PRODUCTION-10-10-PLAN.md`, `docs/PRODUCTION-COMPACTION-HANDOFF.md`, and `CHANGELOG.md` must remain aligned.
10. **No partial launch.** Do not ship degraded MVP/auth/content pathways. Release only when full launch gate passes.

## Reference Library

Biblical reference materials in Supabase Storage bucket `reference-library`. Local copies in `content/reference/` (gitignored).

```bash
./scripts/sync-reference.sh              # Download from Supabase
./scripts/upload-reference.sh            # Upload to Supabase
./scripts/upload-reference.sh commentaries  # Upload specific folder
```

## Development Rules — Non-Negotiable

1. **NO SILENT FALLBACKS.** If a feature fails, surface the error. Do not wrap it in try/catch and return empty data. Do not create "degraded mode" unless I explicitly ask for one. A broken feature should look broken, not silently missing.
2. **NO SHORTCUTS ON CONTENT QUALITY.** The reference library, LLM composition, and scripture grounding are the product. Never truncate, skip, or stub these to save time or avoid errors. Fix the actual problem.
3. **PRESENT TRADEOFFS, DON'T MAKE DECISIONS.** When there's a choice between cost/speed and quality, show me both options with what each gives up. Do not pick for me.
4. **NO DEPLOY UNTIL VERIFIED LOCALLY.** Never push to production to "test if it works." Run locally, verify the output, then deploy.
5. **WHEN SOMETHING BREAKS, DIAGNOSE FIRST.** Do not immediately start fixing. Show me what's wrong, why it's wrong, and what the fix options are. Then wait for my decision.
6. **NEVER SET PLACEHOLDER VALUES.** No "missing" strings, no TODO stubs in production code, no empty implementations that look like they work. Either implement it fully or leave it out and tell me.
7. **ASK BEFORE CREATING NEW FILES/INDEXES/WORKAROUNDS.** If the fix involves creating a new slimmed version, a new fallback path, or a new intermediate file — stop and ask me first. The "quick fix" usually becomes permanent technical debt.
8. **FULL CONTENT, FULL QUALITY, FULL IMPLEMENTATION.** This is a devotional product grounded in real theology. Every devotional must use complete source text, real scripture, and polished LLM composition. There is no acceptable "lite" version.
9. **TESTING MEANS TESTING IN THE WORKERS RUNTIME.** "npm run build" succeeding is NOT a test. Before ANY deploy: run `npm run preview`, hit every affected route with curl in the local Workers preview and confirm the actual response body is correct. If the feature involves AI generation, actually trigger a generation and show me the output. Show me the curl commands and their full responses. Only after I confirm the responses look correct do you deploy.
10. **NEVER SAY "IT WORKS" BASED ON BUILD OUTPUT ALONE.** "It works" means you hit the endpoint, got the expected response, and showed it to me. Anything less is a guess.
