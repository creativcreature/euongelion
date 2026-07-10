# HANDOFF — resume here after any compaction/restart

_If you are a fresh instance: read this, then CHECKLIST.md, then last 30 lines of docs/run/CHANGELOG.md, then DECISIONS.md. Verify working state before continuing. Never redo [x] items._

## Current position

- **Task:** Task 2 / Sprint A — integration phase. My chunks (A-4/A-7/A-9) committed. Two background agents still out: (1) soul-audit results reveal/cards/skeleton/title (files: soul-audit/results/\*, OptionCard, current+select routes, types) — its in-flight edits currently break type-check (PlanThemeCarrier TS2559 in current/route.ts, expected to resolve before it reports); (2) reader SSR re-enable (files: wake-up devotional page + client, normalization lib) — resumed after an API drop, working in a worktree at 3d0eb2ac, must land results in the MAIN tree. Agent for routing/canonical (A-5/A-6) COMPLETED green (uncommitted in tree: plan-reader redirect, SavedList silo routing, sitemap canonical purge, archive/manage routes, test updates + 2 new test files).
- **Exact next step:** When both agents report → run full gate (type-check, lint, npm test), commit A-1..A-3 (cite SA-020/F-064, stage F-064.md + CHANGELOG), commit A-5/A-6 (SA-023/F-068 or F-064; stage PRD), commit A-8 (SA-004/F-067), then A-V preview verification (curls below), then A-D deploy.
- **Staged but uncommitted (docs spine):** production-decisions.yaml (SA-024/SA-025), F-063..F-074 PRDs, PRD index rows, MASTER-LOG appendix, RESEARCH_OAUTH.md — commit blocked only by agent-1's transient type-check break; retry once repo is green (docs-only message, no SA/F needed).

## A-V preview verification plan (run in `npm run preview`)

- `/` 200 + "33 plans"; `/soul-audit` shows GET MATCHED; `/how-we-write` "33 series" + composes-not-searches copy; `/about` + `/pricing` computed counts.
- `curl -sI /soul-audit/plan/any-token` → 307 → `/daily-bread` (also with `?day=3`).
- `/api/soul-audit/archive` + `/api/soul-audit/manage` → every route field `/daily-bread`.
- `/sitemap.xml` → 0 × `wake-up/devotional`, ≥175 × `/devotional/`.
- `/wake-up/devotional/identity-day-1` canonical → `https://euangelion.app/devotional/identity-day-1`.
- SSR: `curl /devotional/too-busy-for-god-day-6` shows server-rendered content (no loader flash) + 2-3 other slugs (bible-365 modules + wake-up panels).
- Soul Audit end-to-end generation in preview if secrets available (.dev.vars), else verify live post-deploy.

## Working state

- **Branch:** `elevation/soul-audit-rebuild`; new commits this run: 27c88829 (bible-365 baseline), docs/run bootstrap, Sprint A tranche 1 (copy/orphans/cookie).
- **Deploy:** `npm run deploy` (wrangler verified, chrisparker21@gmail.com). Fast-forward main at deploy points (D-002). GitHub push BLOCKED (HUMAN_REQUIRED #1).
- **Sprint B prep done:** reconciliation read — APP-VS-WEB-APP (Jan draft, PWA web-first) is compatible with SA-024 (tab bar strengthens PWA-as-app); M04 canonical-nav list is stale → append SA-024 addendum when Sprint B lands. Shell header: 728-line client component `EuangelionShellHeader.tsx`, NAV_ITEMS at top, mounted per-page (tab bar should mount in root layout instead).

## Gotchas discovered

- Pre-commit runs repo-wide type-check — an in-flight agent's broken intermediate state blocks ANY commit (docs-only included). Sequence commits after agents land.
- check-feature-prd-integrity.mjs hardcodes registry count 54 — new PRDs go to INDEX only (D-004).
- `/api/daily-bread/active-days` still returns `/soul-audit/results?planToken=…` day routes; consumers were the retired reader — harmless now, revisit in Sprint B library work.
- Agent 3 works in a worktree — confirm its files land in the main tree before gating.
