# Next Session Operating Runbook (Euangelion)

Purpose: hand this to the next terminal session so it can continue work with zero drift.

## 1) Session Start (Do This First)

1. Confirm repository and branch state.

```bash
git status --short
git branch --show-current
```

2. Read the production tracking spine in this exact order.

- `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
- `docs/production-decisions.yaml`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`
- `docs/PRODUCTION-10-10-PLAN.md`
- `docs/PRODUCTION-COMPACTION-HANDOFF.md`
- `CHANGELOG.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`
- `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`
- `docs/methodology/M00-EUANGELION-UNIFIED-METHODOLOGY.md`
- `docs/appstore/APP-STORE-RELEASE-GATE.md`
- `docs/REFERENCE-FOLDERS-INDEX.md`

3. Verify local environment before changing code.

```bash
npm run type-check
npm run verify:production-contracts
npm run verify:tracking
npm run lint
npm test
```

## 2) Work Loop (Use For Every Feature Pass)

1. Identify feature IDs and decision IDs before edits.

- Feature IDs from `docs/feature-prds/`
- Decision IDs from `docs/production-decisions.yaml`

2. Implement one coherent increment.

- Keep scope tight to a single feature outcome.
- Preserve frozen reference folders listed in `docs/REFERENCE-FOLDERS-INDEX.md`.

3. Verify after edits.

```bash
npm run type-check
npm run lint
npm test
npm run verify:production-contracts
npm run verify:tracking
npm run verify:feature-prds
npm run verify:feature-prd-link
npm run verify:methodology-traceability
npm run verify:folder-structure
npm run verify:appstore-gate
```

4. Update tracking docs in the same pass.

- `CHANGELOG.md`
- Relevant feature PRD file(s) under `docs/feature-prds/`
- If quality score moved: `docs/PRODUCTION-FEATURE-SCORECARD.md`
- If plan shifted: `docs/PRODUCTION-10-10-PLAN.md`
- If session continuity changed materially: `docs/PRODUCTION-COMPACTION-HANDOFF.md`

## 3) Commit Rules (Hooks Enforced)

1. If staged files include `src/**/*.ts` or `src/**/*.tsx`, commit message must include:

- At least one production decision ID: `SA-###`
- At least one feature PRD ID: `F-###`

2. If commit message includes `F-###`, matching PRD file must be staged:

- Example: `F-029` requires staging `docs/feature-prds/F-029.md`

3. If code files are staged, `CHANGELOG.md` must be staged.

4. Example passing commit message format:

```bash
git --no-optional-locks commit -m "SA-013 SA-014 SA-015 F-029: Align wake-up routes to home shell"
```

## 4) Push/Deploy Safety

Before push/deploy, verify account context.

```bash
gh auth switch --user wokegodX
gh auth status
npx vercel whoami
git config user.email
```

Expected:

- GitHub user: `wokegodX`
- Vercel account: `wokegodx`
- Git email: `wokegod3@gmail.com`

Push:

```bash
git -C /Users/meltmac/Documents/app-projects/external/euangelion --no-optional-locks push --porcelain origin main
```

## 5) Handoff Output Template (End Of Session)

Use this exact structure in terminal handoff notes.

1. Scope completed

- Feature IDs and decision IDs delivered
- Files changed

2. Verification evidence

- Command list run
- Pass/fail summary

3. State

- Current branch
- Last commit hash
- Push status
- Dirty/clean tree

4. Residual risks/open items

- Explicitly list unresolved issues
- Include exact file paths

5. Next concrete step

- One atomic next increment

## 6) Fast Failure Recovery

1. Commit-msg hook failure for missing IDs

- Re-run commit with `SA-###` and `F-###` in message.

2. Pre-commit failure for changelog

- Stage `CHANGELOG.md` with code changes.

3. `repository not found` on push

- Check `gh auth status`, remote URL, and account context.

4. Build issues on Node 25 (`WasmHash`)

- Use project-supported Node range from `.nvmrc`/`package.json` engines.

## 7) Definition Of Done (Per Increment)

An increment is done only when all are true:

1. Behavior implemented and verified.
2. Tracking docs updated.
3. Hooks and verification suite pass.
4. Commit created with required IDs when applicable.
5. Push completed and hash shared.
