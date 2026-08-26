---
name: euangelion-platform
description: Use this skill when implementing platform logic, data contracts, Soul Audit behavior, devotional plan assembly, scheduling, and API flows for Euangelion.
---

# Euangelion Platform Skill

## When To Use

Use for work touching:

- Soul Audit APIs and flow state
- Devotional plan generation/assembly
- Supabase schema and persistence contracts
- Scheduling/day unlock behavior
- Server-side guardrails and policy enforcement

If the task is primarily visual/brand styling, use `wokegod-brand` first.

## Required Inputs Before Editing

1. Target user flow and route(s) impacted.
2. Decision IDs and feature IDs tied to the change.
3. Current contract references:
   - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
   - `docs/production-decisions.yaml`
   - `docs/feature-prds/FEATURE-PRD-INDEX.md`

## Core Product Contracts

- Three pathways: `sleep`, `awake`, `shepherd`.
- Devotional arc: `A-B-C-B'-A'` over five days.
- Module system: curated-first, with strict guardrails from production decisions.
- Local corpus/reference volumes are grounding source; do not add external retrieval unless explicitly approved.

## Progressive Disclosure References

Read only what is needed for the task:

1. `references/user-flows.md` for route/interaction behavior.
2. `references/api-routes.md` for endpoint contracts and payload shape.
3. `references/database.md` for schema/storage changes.
4. `references/auth-security.md` for security/session requirements.
5. `references/content-structure.md` for module composition rules.
6. `references/architecture.md` for cross-cutting constraints.

## Build Workflow

1. Confirm behavior against production contracts and locked decisions.
2. Implement smallest complete increment (API + UI + state + tests as needed).
3. Verify with:
   - `npm run type-check`
   - `npm run lint`
   - `npm test`
   - contract/tracking checks required by hooks
4. Update tracking docs in same pass:
   - `CHANGELOG.md`
   - relevant `docs/feature-prds/F-###.md`

## Guardrails

- Never bypass fail-closed behavior for missing curated core inputs.
- Never move secrets to client bundles.
- Never claim completion without verification evidence.
- Keep changes aligned with decision IDs in `docs/production-decisions.yaml`.

## Deliverable Format

When reporting completion, include:

1. Behavior change summary
2. Files changed
3. Validation commands + pass/fail
4. Remaining risk/open questions (if any)
