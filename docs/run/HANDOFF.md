# HANDOFF — resume here after any compaction/restart

_Overwritten after each completed item and before risky operations. If you are a fresh instance: read this, then CHECKLIST.md, then last 30 lines of CHANGELOG.md (docs/run/), then DECISIONS.md. Verify working state before continuing. Never redo [x] items._

## Current position

- **Task:** Task 0 (bootstrap) — finishing tracking files, about to commit them.
- **Exact next step:** Commit docs/run/ + audit doc, then launch Task 1 (OAuth research, background agent) and begin Task 2 Sprint A with A-0 (verify audit claims against code).

## Working state

- **Branch:** `elevation/soul-audit-rebuild` (46+ commits ahead of `main`; main is a strict ancestor — fast-forwardable)
- **Tree:** clean as of baseline commit `27c88829` (Bible-365 full-run rewrite, 360 files) except docs/run/ + audit doc being committed now
- **Last successful production deploy:** 2026-06-21T11:50Z (wrangler) — production is MISSING the July commits on this branch; first sprint deploy will carry them
- **Deploy pipeline:** Cloudflare Workers via OpenNext. `npm run deploy` from working tree. Local Workers runtime test: `npm run preview` (REQUIRED before deploy per Dev Rule #9). Verify: `npx wrangler deployments list` + curl live routes.
- **Cloudflare identity:** VERIFIED — API token for chrisparker21@gmail.com (account 15a3f83632fea316caa448503bb786f9), worker `euangelion`, routes euangelion.app/\* + www
- **GitHub push:** BLOCKED — no `gh` binary on machine, no stored/keychain credentials (see HUMAN_REQUIRED.md #1). Commits stay local; deploys unaffected.
- **Git email:** chrisparker21@gmail.com ✓

## Gotchas discovered

- Pre-commit runs type-check + 8 verify scripts + lint-staged on every commit (~1-2 min). commit-msg requires `SA-###` + `F-###` (with `docs/feature-prds/F-###.md` staged) ONLY when `src/**/*.ts(x)` is staged. Docs-only commits are exempt.
- CHANGELOG.md must be staged whenever any `.ts/.tsx` is staged.
- `main` = production by repo rule; strategy = work on this branch, fast-forward main at deploy points (see DECISIONS.md D-002).
- Shell PATH is minimal (`~/.local/node/bin` etc.) — no homebrew, no gh.
- Audit doc file:line anchors were written 2026-07-10 against this same tree — trust but verify (A-0).
