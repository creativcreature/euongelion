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

## Red letter in generated plans (SA-051, mandatory)

A Soul Audit plan emits scripture modules at generation time, so it attributes
Christ's words at generation time too — there is no later migration:

```ts
import { withRedLetter, resolveRedLetter } from '@/lib/red-letter-resolve'
```

Already wired in `curated-builder.ts`, `curated-catalog.ts` and
`onboarding-day-to-reader.ts`. If you add a fourth place that emits a
`type: 'scripture'` module, wire it there too — otherwise that surface silently
loses red letter while every other one keeps it.

`red-letter-resolve` is SERVER/BUILD ONLY. The dataset is 239 KB raw; never
import it into a client component. Resolution happens where the module is
built and only the resulting spans travel to the reader.

Never infer attribution from quotation marks — see the devo-go verification
standards for why (Luke 10:33-37 defeats it).
