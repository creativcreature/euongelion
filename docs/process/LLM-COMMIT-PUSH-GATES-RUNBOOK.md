# LLM Commit + Push Gates Runbook

This is the canonical procedure for any LLM agent committing and pushing code in this repo.

## 1) Non-negotiable rules

1. Never push unverified code.
2. If `src/**/*.ts(x)` changes, `CHANGELOG.md` must be staged.
3. If `src/**/*.ts(x)` changes, commit message must include at least one `SA-xxx` and one `F-xxx` id.
4. If commit message includes `F-xxx`, matching `docs/feature-prds/F-xxx.md` must be staged.
5. Do not bypass hooks except emergency hotfixes approved by owner.

## 2) Required command sequence

Run from repo root:

```bash
# 0) Inspect state
git status --short

# 1) Optional focused verification before commit (recommended)
npm run type-check
npm run test -- --run <targeted-tests>

# 2) Stage
git add <files>

# 3) Commit (feature example)
git --no-optional-locks commit -m "SA-030 F-050: concise change summary"

# 4) Push
git -C /Users/meltmac/Documents/app-projects/external/euangelion --no-optional-locks push --porcelain origin main
```

## 3) What hooks enforce automatically

### commit-msg hook

Runs:

```bash
node scripts/check-decision-reference.mjs "$1"
```

Enforces for commits that stage `src/**/*.ts` or `src/**/*.tsx`:

- commit message contains `SA-\d{3}`
- commit message contains at least one `F-\d{3}`
- each referenced `F-xxx` has matching staged file `docs/feature-prds/F-xxx.md`

### pre-commit hook

Runs in this order:

1. `lint-staged` (for staged `src/**/*.{ts,tsx}`, `__tests__/**/*.{ts,tsx}`, `*.{css,json,md}`)
2. `npm run type-check`
3. `npm run verify:production-contracts`
4. `npm run verify:tracking`
5. `npm run verify:feature-prds`
6. `npm run verify:feature-prd-link`
7. `npm run verify:governance-alignment`
8. `npm run verify:methodology-traceability`
9. `npm run verify:folder-structure`
10. `npm run verify:appstore-gate`
11. CHANGELOG enforcement: if staged code includes `.ts/.tsx`, `CHANGELOG.md` must be staged.

## 4) Gate failure recovery

### Error: missing SA id

Use message format:

```bash
git commit -m "SA-031 F-028: <summary>"
```

### Error: missing F id

Add one or more feature ids:

```bash
git commit -m "SA-031 F-028: <summary>"
```

### Error: referenced F file not staged

Stage the matching PRD file(s):

```bash
git add docs/feature-prds/F-028.md
```

### Error: `feature-prd-update-link` fails

If feature code is staged, ensure at least one matching `docs/feature-prds/F-xxx.md` is staged and referenced in commit message.

### Error: `CHANGELOG.md not staged but code files changed`

Update and stage changelog:

```bash
git add CHANGELOG.md
```

### Lint/test/type errors from hook

Fix files, re-stage, re-commit. Do not force push broken gates.

## 5) Commit message templates

### Feature code change

```text
SA-0XX F-0YY: <imperative summary>
```

Example:

```text
SA-030 SA-031 F-028 F-050: Add post-signup onboarding and deepen AI devotional curation
```

### Docs-only change (no src ts/tsx staged)

No SA/F required by hook, but preferred format:

```text
docs: update commit/push gate runbook for LLM handoff
```

## 6) Pre-push checklist (human + LLM)

1. `git status --short` is clean except intended files.
2. Hook gates pass on commit.
3. Commit message includes correct IDs when required.
4. PRD/changelog updates are included when feature code changed.
5. Push target is correct branch/repo.

## 7) Emergency bypass policy

Only if explicitly approved by owner:

```bash
git commit --no-verify -m "..."
```

If bypass is used, immediately run full gates manually and create a follow-up commit to restore compliance.

## 8) Handoff block for the next LLM

Include this in transfer notes:

```text
Last commit: <sha>
Branch: main
Push status: pushed/not pushed
Changed files: <list>
Gates run: type-check, targeted tests, pre-commit verifies
Outstanding manual checks: <list>
Rollback: git revert <sha>
```
