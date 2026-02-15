# Soul Audit Documentation Index

All documentation related to the Soul Audit feature, gathered from across the Euangelion project. These are **copies** — originals remain in their source locations.

---

## design-decisions/ (2 files)

Core design rationale and decision history.

| File                 | Source            | Description                                                                                                              |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| SOUL-AUDIT-DESIGN.md | `docs/decisions/` | Master design doc: question format, matching logic, series matrix, edge cases, crisis protocol, implementation checklist |
| MASTER-DECISIONS.md  | `docs/decisions/` | Cross-feature decisions including Soul Audit design choices                                                              |

---

## feature-prds/ (9 files)

Feature-level requirements and acceptance criteria.

| File                      | Source               | Description                                     |
| ------------------------- | -------------------- | ----------------------------------------------- |
| F-019.md                  | `docs/feature-prds/` | Soul Audit: Submit contract (options-only)      |
| F-020.md                  | `docs/feature-prds/` | Soul Audit: Consent gate                        |
| F-021.md                  | `docs/feature-prds/` | Soul Audit: 3 AI + 2 prefab split               |
| F-022.md                  | `docs/feature-prds/` | Soul Audit: Selection locking                   |
| F-023.md                  | `docs/feature-prds/` | Soul Audit: Curated curation quality            |
| F-024.md                  | `docs/feature-prds/` | Soul Audit: Crisis path                         |
| F-025.md                  | `docs/feature-prds/` | Soul Audit: Related feature                     |
| FEATURE-PRD-INDEX.md      | `docs/feature-prds/` | Full PRD index with soul audit entries          |
| FEATURE-PRD-REGISTRY.yaml | `docs/feature-prds/` | Machine-readable registry (F-019 through F-024) |

---

## production-governance/ (6 files)

Production tracking spine and decision contracts.

| File                             | Source  | Description                                                                                                                       |
| -------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| PRODUCTION-SOURCE-OF-TRUTH.md    | `docs/` | Locked product decisions: curated-first, selection-first, 3 AI + 2 prefab, consent gating, crisis flow, audit limit (3 per cycle) |
| production-decisions.yaml        | `docs/` | Machine-readable contracts for Soul Audit API endpoints and flow stages                                                           |
| PRODUCTION-10-10-PLAN.md         | `docs/` | Execution plan: onboarding pass, curation reliability pass, plan assembly coherence                                               |
| PRODUCTION-COMPACTION-HANDOFF.md | `docs/` | Session continuity protocol for soul-audit work                                                                                   |
| PRODUCTION-FEATURE-SCORECARD.md  | `docs/` | Feature-by-feature quality ratings including Soul Audit                                                                           |
| MASTER-LOG.md                    | `docs/` | All founder decisions: inline audit (D3), 3 equal cards (D5), matching to existing series (D21)                                   |

---

## ux-and-flow/ (9 files)

User experience, journey maps, personas, and copy.

| File                      | Source           | Description                                                                                                    |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| UX-FLOW-MAPS.md           | `docs/`          | Soul Audit flow: inline audit on homepage, option presentation, selection, plan instantiation, returning users |
| SUCCESS-METRICS.md        | `docs/`          | Soul Audit completion rates, match quality metrics                                                             |
| PUBLIC-FACING-LANGUAGE.md | `docs/`          | Approved tone and copy patterns for Soul Audit UI                                                              |
| MVP-SCOPE.md              | `docs/`          | Soul Audit scope within MVP definition                                                                         |
| SPRINT-PLAN.md            | `docs/`          | Sprint breakdown including Soul Audit work                                                                     |
| ARCHITECTURE.md           | `docs/`          | System architecture with Soul Audit data flow                                                                  |
| LOADING-PATTERNS.md       | `docs/design/`   | Loading states and skeleton patterns for Soul Audit                                                            |
| UI-MESSAGING.md           | `docs/copy/`     | Error messages, empty states, confirmation copy for Soul Audit                                                 |
| USER-PERSONAS-REFINED.md  | `docs/research/` | User personas and how they interact with Soul Audit                                                            |

---

## technical/ (9 files)

API contracts, database schema, state management, testing.

| File                     | Source            | Description                                                         |
| ------------------------ | ----------------- | ------------------------------------------------------------------- |
| api-routes.md            | `docs/technical/` | POST `/api/soul-audit` endpoint docs with request/response examples |
| state-management.md      | `docs/technical/` | Soul Audit Zustand store architecture and persistence               |
| database-schema.md       | `docs/technical/` | Database tables for audit runs, sessions, plans                     |
| authentication.md        | `docs/technical/` | Auth flow interaction with Soul Audit (anonymous vs authenticated)  |
| SECURITY-CHECKLIST.md    | `docs/technical/` | Security considerations for audit data handling                     |
| ENVIRONMENT-VARIABLES.md | `docs/technical/` | Env vars needed for Soul Audit API (Anthropic key, Supabase)        |
| ANALYTICS-TAXONOMY.md    | `docs/technical/` | Analytics events for Soul Audit funnel tracking                     |
| testing.md               | `docs/technical/` | Test coverage for Soul Audit flow, curation, edge cases             |
| PERFORMANCE-BUDGET.md    | `docs/technical/` | Performance targets for Soul Audit response times                   |

---

## agents-and-skills/ (13 files)

Claude agent definitions and skill references for Soul Audit implementation.

| File                         | Source                                                        | Description                                                              |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| SOUL-AUDIT-ENGINEER.md       | `.claude/agents/`                                             | Specialized agent for soul-audit flow engineering                        |
| AGENT-ROSTER.md              | `.claude/agents/`                                             | Full agent roster with Soul Audit engineer profile                       |
| SOUL-AUDIT-DELIVERY-SKILL.md | `.claude/skills/soul-audit-delivery/SKILL.md`                 | Skill doc: when to use, workflow, guardrails, validation                 |
| flow-contracts.md            | `.claude/skills/soul-audit-delivery/references/`              | 3-stage flow contracts: submit, consent, select                          |
| curation-contracts.md        | `.claude/skills/soul-audit-delivery/references/`              | Curated-first composition rules, source priority, 3 AI + 2 prefab output |
| failure-modes.md             | `.claude/skills/soul-audit-delivery/references/`              | Common breakpoints and recovery: no options, mismatch, state drift       |
| openai.yaml                  | `.claude/skills/soul-audit-delivery/agents/`                  | OpenAI agent config for Soul Audit                                       |
| EUANGELION-PLATFORM-SKILL.md | `.claude/skills/euangelion-platform/SKILL.md`                 | Platform skill with Soul Audit behavior section                          |
| user-flows.md                | `.claude/skills/euangelion-platform/references/`              | User flow definitions including Soul Audit journey                       |
| platform-api-routes.md       | `.claude/skills/euangelion-platform/references/api-routes.md` | Platform API routes including all soul-audit endpoints                   |
| auth-security.md             | `.claude/skills/euangelion-platform/references/`              | Auth/security patterns for Soul Audit sessions                           |

---

## content-strategy/ (7 files)

Series matching, content pipeline, and devotional structure.

| File                        | Source                 | Description                                                 |
| --------------------------- | ---------------------- | ----------------------------------------------------------- |
| MODULE-MAPPING.md           | `content/`             | Soul audit keyword mapping for series matching              |
| DEVOTIONAL-STRATEGY.md      | `content/`             | Devotional content strategy and Soul Audit integration      |
| CONTENT-PITCHES.md          | `content/`             | Content pitches referencing Soul Audit onboarding           |
| CONTENT-DEVELOPMENT-PLAN.md | `content/`             | Development plan for content that feeds Soul Audit matching |
| SERIES-IDEAS.md             | `content/devotionals/` | Series inventory used for Soul Audit series matching        |
| SERIES-INDEX.md             | `content/series-json/` | Series JSON index for audit matching                        |
| APOLOGETICS-FRAMEWORK.md    | `content/`             | Apologetics framework informing Soul Audit question design  |

---

## types-and-contracts/ (2 files)

TypeScript interfaces and state store definitions.

| File              | Source        | Description                                                                                                                                                                |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| soul-audit.ts     | `src/types/`  | All TS interfaces: AuditMatch, AuditOptionKind, SoulAuditSubmitResponseV2, ConsentRequest/Response, SelectRequest/Response, PlanOnboardingMeta, CustomPlan, CrisisResource |
| soulAuditStore.ts | `src/stores/` | Zustand store: auditCount, lastResults, MAX_AUDITS (3), persistence middleware                                                                                             |

---

## marketing-and-launch/ (6 files)

Launch planning, monitoring, and legal docs referencing Soul Audit.

| File                      | Source            | Description                                              |
| ------------------------- | ----------------- | -------------------------------------------------------- |
| FIRST-MONTH-CALENDAR.md   | `docs/marketing/` | First month plan with Soul Audit launch milestones       |
| EMAIL-LAUNCH-SEQUENCE.md  | `docs/marketing/` | Email sequences referencing Soul Audit onboarding        |
| LAUNCH-CHECKLIST.md       | `docs/process/`   | Launch checklist including Soul Audit verification gates |
| POST-LAUNCH-MONITORING.md | `docs/process/`   | Post-launch monitoring for Soul Audit funnel health      |
| PRIVACY-POLICY.md         | `docs/legal/`     | Privacy policy covering Soul Audit data handling         |
| TERMS-OF-SERVICE.md       | `docs/legal/`     | Terms covering Soul Audit usage                          |

---

## Not Copied (Source Code — Reference Only)

The following source code files implement Soul Audit but are not documentation. They remain in their original locations:

### API Routes (`src/app/api/soul-audit/`)

- `route.ts` — Main endpoint
- `submit/route.ts` — Submit audit, returns options
- `consent/route.ts` — Consent gating
- `select/route.ts` — Selection locking and plan instantiation
- `current/route.ts` — Get current audit/plan state
- `reset/route.ts` — Reset audit run
- `archive/route.ts` — Archive completed paths

### Pages (`src/app/soul-audit/`)

- `page.tsx` — Audit input form
- `results/page.tsx` — Results with option previews
- `error.tsx` — Error boundary

### Library (`src/lib/soul-audit/`)

- `matching.ts` — Semantic matching and keyword fallback
- `curated-builder.ts` — Curated devotional assembly
- `curation-engine.ts` — Option generation engine
- `repository.ts` — Data persistence
- `session.ts` — Session and audit run state
- `run-token.ts` — Audit run token management
- `consent-token.ts` — Consent token management
- `schedule.ts` — Onboarding scheduling and timing
- `crisis.ts` — Crisis detection and response
- `constants.ts` — Constants, limits, keywords
- `curated-catalog.ts` — Curated content catalog
- `reference-volumes.ts` — Reference volume integration

---

**Total: 63 files copied across 9 categories**
**Generated: 2026-02-14**
