---
name: release-readiness
description: Use this skill when preparing, verifying, and packaging Euangelion web/iOS releases including quality gates, App Store readiness, and production risk checks.
---

# Release Readiness Skill

## When To Use

Use for:

- pre-release hardening passes
- production readiness scoring and gap closure
- iOS/App Store Connect checklist execution
- regression and edge-case validation before launch claims

## Required Inputs

1. Release target (`web`, `ios`, or `both`).
2. Version/build scope and deadline.
3. Feature set included in this release.

## Progressive Disclosure References

1. `references/gate-checklist.md`
2. `references/verification-matrix.md`
3. `references/app-store-ops.md`

## Workflow

1. Run baseline validation commands.
2. Execute gate checklist item by item.
3. Capture fails as blocking/non-blocking.
4. Patch blockers and re-run full matrix.
5. Publish evidence summary and residual risk.

## Guardrails

- Do not claim production-ready with failing blockers.
- Keep a clear pass/fail artifact for each gate.
- Verify mobile behavior separately from desktop.

## Validation Commands

```bash
npm run type-check
npm run lint
npm test
npm run verify:production-contracts
npm run verify:tracking
npm run verify:appstore-gate
npm run verify:ios-readiness
npm run build
```
