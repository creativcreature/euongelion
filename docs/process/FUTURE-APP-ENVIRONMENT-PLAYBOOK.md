# Future App Environment Playbook

Purpose: reusable process for standing up future app development environments with production-grade governance from day one.

## 1) Principles

1. One source of truth for product intent.
2. Machine-enforced contracts for non-negotiable behavior.
3. Feature-level PRDs and incremental score tracking.
4. Verification gates on every commit and in CI.
5. Explicit handoff protocol for continuity after context loss.

## 2) Baseline Repository Scaffold

Create this minimum structure before feature work:

```text
/docs
  /feature-prds
  /methodology
  /runbooks
  /appstore              # if mobile release is in scope
/src
/scripts
/.husky
/.github/workflows
CHANGELOG.md
CLAUDE.md                # or AGENTS.md equivalent
```

Required control docs:

- `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
- `docs/production-decisions.yaml`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`
- `docs/PRODUCTION-10-10-PLAN.md`
- `docs/PRODUCTION-COMPACTION-HANDOFF.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`
- `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`
- `CHANGELOG.md`

## 3) Toolchain Bootstrap

1. Lock runtime versions.

- `.nvmrc`
- `engines` in `package.json`

2. Install quality tooling.

- Type checks
- Lint
- Test runner
- Formatter

3. Add scripts.

```json
{
  "scripts": {
    "type-check": "...",
    "lint": "...",
    "test": "...",
    "verify:production-contracts": "...",
    "verify:tracking": "..."
  }
}
```

4. Add pre-commit and commit-msg hooks.

- Block commits when required docs are not updated.
- Require decision IDs and feature IDs in feature commits.

5. Add CI workflow.

- Run the same checks as local hooks.
- Fail closed on contract drift.

## 4) Governance Model

Use a 3-layer governance system:

1. Human canonical doc

- `PRODUCTION-SOURCE-OF-TRUTH.md`

2. Machine contract doc

- `production-decisions.yaml`

3. History log

- `CHANGELOG.md`

Rule: no code merge without all 3 aligned.

## 5) Feature Management Model

1. One PRD per feature (`F-###`).
2. Every feature PRD contains:

- 10/10 definition
- Device contracts (desktop/mobile)
- Acceptance criteria
- Test matrix
- Incremental outcomes log

3. Each implementation pass must update:

- Feature PRD outcomes row
- Changelog entry
- Scorecard if score changed

## 6) Standard Delivery Cycle

Use this cycle for each increment:

1. Discover

- Read source-of-truth and decision contracts.
- Confirm target feature ID and decision IDs.

2. Plan

- Define one atomic increment.
- Define test evidence before coding.

3. Implement

- Keep scope constrained.
- Preserve backward compatibility unless explicitly changed.

4. Verify

```bash
npm run type-check
npm run lint
npm test
npm run verify:production-contracts
npm run verify:tracking
```

5. Track

- Update changelog and PRD.
- Capture residual gaps clearly.

6. Ship

- Commit with IDs when applicable.
- Push with clean tree.

## 7) Commit and Traceability Contract

For source changes, enforce commit message structure:

```text
SA-### SA-### F-###: short imperative summary
```

Traceability rules:

1. Every `F-###` in commit message must have corresponding staged PRD file.
2. Changelog must be staged for code commits.
3. Verification output should be reproducible from scripts.

## 8) Environment and Secret Management

1. Use `.env.example` as canonical variable list.
2. Keep secrets out of git and changelog.
3. Separate local, staging, production credentials.
4. Validate required env vars at startup.

## 9) Security and Compliance Baseline

1. Input validation for all write endpoints.
2. Rate limiting on public write endpoints.
3. Least-privilege service keys.
4. Privacy disclosures for tracking/data collection.
5. If mobile: App Store privacy manifest and permissions text.

## 10) Multi-Platform Release Readiness (Optional)

If iOS/Android is in scope, add release gates early:

1. Build/version discipline (semver + build number).
2. Store asset tracker.
3. Review-notes template.
4. Physical-device sanity checklist.

## 11) Handoff and Continuity Standard

At end of each session, publish:

1. What changed.
2. What was verified.
3. What remains and risks.
4. Exact next step.
5. Commit hash and push status.

Store continuity notes in a durable handoff document (for example `PRODUCTION-COMPACTION-HANDOFF.md`).

## 12) Anti-Drift Checklist

Before merge, all must be true:

1. Contracts pass.
2. Tracking pass.
3. Feature PRD updated.
4. Changelog updated.
5. CI green.
6. No unresolved blocker hidden in summary.

## 13) Quick-Start Command Block

```bash
npm ci
npm run type-check
npm run lint
npm test
npm run verify:production-contracts
npm run verify:tracking
```

If all pass, environment is ready for the first feature increment.
