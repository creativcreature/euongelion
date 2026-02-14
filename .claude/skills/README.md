# Claude Skills Organization (Anthropic-Aligned)

This repository organizes skills to follow Anthropic's recommended pattern for Claude skills:

1. One focused task domain per skill.
2. Required YAML frontmatter in each `SKILL.md`:
   - `name`
   - `description`
3. Progressive disclosure:
   - `SKILL.md` stays concise.
   - deep details live in `references/`.
   - scripts/tools live in `scripts/`.
4. Skills define:
   - when to use
   - required inputs
   - implementation workflow
   - guardrails
   - verification expectations

## Current Skills

- `.claude/skills/euangelion-platform/SKILL.md`
  - Platform logic, APIs, contracts, data and scheduling behavior.
- `.claude/skills/wokegod-brand/SKILL.md`
  - Visual system, typography, layout, motion, and asset treatment.
- `.claude/skills/soul-audit-delivery/SKILL.md`
  - Soul Audit staged flow, curation quality, selection and handoff behavior.
- `.claude/skills/release-readiness/SKILL.md`
  - Release gates, regression matrix, App Store and launch checks.
- `.claude/skills/docs-tracking-governance/SKILL.md`
  - Changelog/PRD/decision traceability and anti-drift documentation updates.

## Skill Folder Contract

```text
.claude/skills/<skill-name>/
├── SKILL.md
├── references/
│   └── <topic>.md
└── scripts/
    └── <optional helper scripts>
```

## Update Protocol

When changing a skill:

1. Keep `SKILL.md` short and operational.
2. Move detailed specs/examples into `references/`.
3. Keep deterministic steps explicit.
4. Include validation instructions.
5. Update `CHANGELOG.md` in same pass.

## Fast Checklist

- [ ] Frontmatter exists (`name`, `description`).
- [ ] Trigger scope is explicit ("When To Use").
- [ ] Progressive disclosure references are listed.
- [ ] Guardrails are explicit and testable.
- [ ] Validation commands are present.
