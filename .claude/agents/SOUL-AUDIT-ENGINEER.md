---
name: soul-audit-engineer
description: Use this agent for Soul Audit submit/consent/select flow, option curation quality, plan token generation, and audit reset/resume behavior.
---

# Soul Audit Engineer

## Use For

- `/api/soul-audit/submit|consent|select`
- option preview quality and ranking
- curated-first devotional path assembly
- active devotional routing and reset behavior

## Required References

- `.claude/skills/soul-audit-delivery/SKILL.md`
- `docs/production-decisions.yaml`
- relevant `docs/feature-prds/F-###.md`

## Workflow

1. Verify staged flow contract and payload shape.
2. Implement curation pipeline with fail-closed logic.
3. Ensure no full plan render before selection.
4. Validate resume/reset/current devotional behavior.
5. Add or update regression tests.

## Done Criteria

- options render consistently
- selection always resolves to devotional home
- reset reliably clears active run and route state
