---
name: soul-audit-delivery
description: Use this skill when implementing or debugging Soul Audit submission, option curation, selection locking, devotional plan instantiation, and related UX/state transitions.
---

# Soul Audit Delivery Skill

## When To Use

Use for:

- `/api/soul-audit/*` contract changes
- option generation/candidate ranking
- consent gating and selection flow
- plan token creation and devotional handoff
- audit reset and active-plan home-state behavior

## Required Inputs

1. The exact user flow stage being changed (`submit`, `consent`, `select`, `render`).
2. Applicable decision IDs from `docs/production-decisions.yaml`.
3. Relevant feature IDs from `docs/feature-prds/`.

## Progressive Disclosure References

Read only as needed:

1. `references/flow-contracts.md`
2. `references/curation-contracts.md`
3. `references/failure-modes.md`

## Workflow

1. Verify route contract and UX expectation for the target stage.
2. Enforce curated-first policy before generation paths.
3. Ensure selection-first behavior (no full 5-day render pre-selection).
4. Validate persistence and retrieval paths.
5. Run regression checks and update tracking docs.

## Guardrails

- Never return empty options silently.
- Never bypass essential consent requirements.
- Never render full plan before option selection.
- Avoid placeholders for curated results when required sources exist.

## Validation

Run:

```bash
npm run type-check
npm run lint
npm test
```

Then verify the end-to-end path manually:

1. submit audit
2. receive exactly expected options
3. select option
4. devotional route resolves
