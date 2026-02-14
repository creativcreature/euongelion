# Claude Skill System (Repository Standard)

Purpose: define how Euangelion skills are authored and maintained using Anthropic's skill-building guidance.

## Source Reference

- Anthropic guide: [The Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)

## Design Principles Applied Here

1. Focused scope per skill (avoid giant mixed-purpose skills).
2. Minimal `SKILL.md` with clear trigger and workflow.
3. Progressive disclosure through `references/` files.
4. Optional scripts under `scripts/` for repeatable deterministic steps.
5. Explicit guardrails and validation criteria.

## Euangelion Skill Inventory

1. `euangelion-platform`
   - API contracts, data models, Soul Audit, devotional assembly, policy.
2. `wokegod-brand`
   - typography, layout, color, motion, editorial UI execution.
3. `soul-audit-delivery`
   - staged audit flow contracts, curation quality, selection/resume behavior.
4. `release-readiness`
   - release gates, verification matrix, App Store submission readiness.
5. `docs-tracking-governance`
   - changelog/PRD/scorecard traceability and contract alignment.

## Agent Roster

Workflow-specific agents live in `.claude/agents/` with canonical sequence documented in:

- `.claude/agents/AGENT-ROSTER.md`

## Authoring Template

Each `SKILL.md` must include:

1. YAML frontmatter:
   - `name`
   - `description`
2. `When To Use`
3. `Required Inputs`
4. `Progressive Disclosure References`
5. `Implementation Workflow`
6. `Guardrails`
7. `Validation`

## Change Protocol

On every skill update:

1. Update the skill file(s).
2. Keep deep content in `references/`, not inline in `SKILL.md`.
3. Update `CHANGELOG.md` with scope and rationale.
4. Run at least:
   - `npm run type-check`
   - `npm run lint`

## Anti-Drift Rules

1. Do not add conflicting instructions between skills.
2. If behavior changes, update both affected skills.
3. If a new domain appears, create a new skill folder rather than overloading existing ones.
