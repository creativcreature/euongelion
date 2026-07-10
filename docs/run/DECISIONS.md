# DECISIONS — judgment calls made during the run

Format: id · date · decision · options considered · reasoning · real-world anchor (where applicable).

## D-001 (2026-07-10) — Commit prior session's uncommitted Bible-365 rewrite as run baseline

- **Options:** (a) commit as-is after validation; (b) stash; (c) leave dirty.
- **Choice:** (a). Validated first: 365/365 JSON-parse, 365 modules-format, 0 stubs. A 358-file dirty tree is a hazard across a multi-day autonomous run (accidental loss, ambiguous diffs). Committed as `27c88829` citing SA-020/F-051 to match the pilot commit convention (a39c5cae).
- **Anchor:** n/a (process decision).

## D-002 (2026-07-10) — Branch/deploy strategy: stay on `elevation/soul-audit-rebuild`, fast-forward `main` at deploy points

- **Options:** (a) merge to main per sprint + deploy from main; (b) deploy from branch, merge at Task 9; (c) work directly on main.
- **Choice:** (a), via fast-forward (main is a strict ancestor, so no merge commits and no hook complications). Keeps the repo rule "main = production" true, and production deploys have historically come from this branch lineage anyway (last deploy 2026-06-21 predates only the July commits).
- **Anchor:** n/a (process decision).

## D-003 (2026-07-10) — GitHub push deferred to founder; deploys proceed via wrangler

- **Options:** (a) block the run on push credentials; (b) proceed local-only + deploy via verified wrangler token; log push as HUMAN_REQUIRED.
- **Choice:** (b). The DEPLOY-BEFORE-GATE rule is about the live site; wrangler deploys from the working tree and its token is verified. No gh binary or GitHub credential exists on this machine — exhausted: gh in PATH/homebrew/mdfind, ~/.config/gh/hosts.yml, git credential store, osxkeychain.
- **Anchor:** n/a (process decision).
