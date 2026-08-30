# HANDOFF — resume here after any compaction/restart

_Fresh instance: read this, then CHECKLIST.md, docs/run/CHANGELOG.md (tail), DECISIONS.md. Verify git status + `npx wrangler deployments list` before continuing. Never redo [x]._

## Current position

- **DEPLOY 1 IS LIVE** (worker f16f2b80 = commit 26abb695): all Sprint A + tab-bar nav. Live battery 36/36. `main` fast-forwarded to 26abb695.
- **Wave 2 is BUILT + GREEN, NOT yet committed** (integration gate: type-check clean, 113 files / 1558 tests): B-11 Aa themes, B-12 library consolidation, B-13 Today band, C-14 reminders, C-15 global search, C-16 install prompt, C-17 settings restructure, imagery samples (step-1 inkwell + 2 empty states + /design/imagery-samples + shimmer CSS) + my DevotionalPageClient clippings-link fix.
- **Two agents still writing:** series-detail tabs (D-21: src/app/series/\*, wake-up series, globals.css append) and momentum hybrid (D-19/20: DevotionalPageClient, DailyBreadView, TodayReturningBand, settings/page.tsx, progress lib, DevotionalMilestoneReveal, globals.css append). Their files OVERLAP wave-2 files → **commit only after both report.**
- **Exact next step when both land:** (1) full gate (`npm run type-check` + `npx vitest run`); (2) ONE commit: stage everything code + CHANGELOG.md (wave-2 entry already written) + PRD files F-063..F-074 (outcome rows already written) + docs/run; message cites `SA-013, SA-023, SA-024, SA-025, F-066, F-067, F-068, F-069, F-070, F-071, F-072, F-073, F-074` (every cited F must be staged — hook); (3) roll deploy-worktree to new HEAD (`git -C <WT> checkout -q $(git rev-parse HEAD)`, `rm -rf .next .open-next`), `npm run preview`; (4) battery: `WAVE2=1 bash <scratchpad>/battery.sh http://localhost:8787` (36 base + wave-2 checks); manual browser spot-check tab bar/sheet/search at 375px via Claude-in-Chrome if available; (5) `npm run deploy` from worktree; (6) `WAVE2=1 battery https://euangelion.app`; fast-forward main; update tracking.
- Worktree: /private/tmp/claude-501/-Users-jamesparker-Documents-app-projects-external-euangelion/a6a97842-6eec-43a4-9a1b-aa518379246a/scratchpad/deploy-worktree (real node_modules, .env.local + .dev.vars copied).

## After deploy 2

- Sprint D remainder: D-18 remaining empty states + D-22 why-matched + D-23 motion/haptics/safe-area pass + D-24 skeleton sweep (launch 1-2 agents; D-23/D-24 are cross-cutting — run LAST).
- Task 7 LCP loop: docs/run/loop/{instructions.md,score.py} are LOCKED and ready; run against `npm run preview` in the worktree; log rounds to RESULTS_LOG.md; deploy winner.
- Task 8 full live smoke (incl. real generation on PROD, auth magic-link+Google via browser, mobile checks) → fix/redeploy → Task 9 package.
- S-3 full scorecard re-score at Task 8. Registry/scorecard/10-10 alignment check before "production ready" claims.

## Blockers / founder items (HUMAN_REQUIRED.md)

1. GitHub push credentials (commits local-only; deploys unaffected).
2. Reminders go-live (migration 017 + VAPID + edge deploy + pg_cron + safe first send) — autonomous DB apply DENIED by permission gate; VAPID keypair pre-generated at scratchpad/vapid.json. Do VAPID only together with 017.

## Gotchas (accumulated)

- Concurrent agents race the shared git index — `git reset` + tight re-staging before commit; never commit while an agent is writing overlapping files.
- Pre-commit repo-wide type-check blocks ANY commit if an agent's intermediate state is broken.
- commit-msg needs SA-### + staged F-###.md only when src/\*_/_.ts(x) is ACMR-staged (deletes don't count; next.config.ts isn't src/).
- `rm -rf .next` fixes stale-type + stale-CSS (Turbopack cache) issues.
- Preview from a worktree needs REAL node_modules (symlink → 500s).
- Battery greps must tolerate React comment nodes (`33<!-- --> plans`).
- opennextjs preview serves fast after build; the workerd on :8787 may be YOUR OWN — check provenance before killing.
