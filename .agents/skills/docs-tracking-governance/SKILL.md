---
name: docs-tracking-governance
description: Use this skill when updating changelog, feature PRDs, decision traceability, and repository tracking contracts to prevent process drift.
---

# Docs Tracking Governance Skill

## When To Use

Use for:

- changelog updates tied to code edits
- feature PRD/registry consistency updates
- production scorecard/plan updates
- documentation alignment after behavior changes

## Required Inputs

1. What changed in behavior and where.
2. Associated decision IDs and feature IDs.
3. Validation evidence for claims.

## Progressive Disclosure References

1. `references/update-order.md`
2. `references/traceability-rules.md`
3. `references/common-failures.md`

## Workflow

1. Map code changes to feature IDs and decision IDs.
2. Update `CHANGELOG.md` in same pass.
3. Update impacted PRD files and scorecard entries.
4. Run verification scripts and fix drift failures.
5. Summarize evidence in handoff notes.

## Guardrails

- Never leave behavior changes undocumented.
- Never claim quality upgrades without tests/checks.
- Keep file references and dates explicit.

## Validation

```bash
npm run verify:tracking
npm run verify:feature-prds
npm run verify:feature-prd-link
npm run verify:methodology-traceability
```
