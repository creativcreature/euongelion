# Overnight Blockers — 2026-05-04

Things that were skipped after a 3-strike attempt, ran into a decision wall, or hit a constraint that the founder must resolve.

Format per entry:

- **Phase + sub-task**
- **What blocked it**
- **Recommended next step for founder**

---

## Phase 10A — 47 lines of commented-out code: not present in branch

**Phase + sub-task:** Phase 10A — delete the multi-line commented-out
`// const x = …` blocks the master plan said live in
`src/lib/soul-audit/matching.ts` and `src/app/api/*` routes.

**What blocked it:** the blocks don't exist on `cloudflare-migration`.
A grep across all of `src/` for `^\s*//\s*(const|let|var|if|return|export|import|await|function)`
returned **zero matches**. SA-037 (commit 8c4b1e5) explicitly notes
"dead code removed" and likely cleaned this in an earlier sprint. The
master plan's reference is stale.

**Recommended next step for founder:** none — already cleaned up.
The Phase 10A budget instead went to the analysis-only sub-task
(dual-auth and dual-consent), captured in `docs/overnight-followups.md`.

## Phase 10B — 5 pre-existing test failures on cloudflare-migration baseline

**Phase + sub-task:** noted while running regression tests during Phase 10B
prompt-cache verification.

**What blocked it:** the following 5 tests fail with
`PLAN_CREATE_FAILED` / 500 errors:

- `__tests__/soul-audit-curation.test.ts`: "selecting the first AI
  option returns a devotional plan route"
- `__tests__/soul-audit-flow.test.ts`: "AI option path returns plan
  token after inline consent + selection"
- `__tests__/soul-audit-flow.test.ts`: "selected devotional can be
  loaded from the plan day endpoint"
- `__tests__/soul-audit-edge-cases.test.ts`: "reset endpoint clears
  current selection state for session"
- `__tests__/soul-audit-edge-cases.test.ts`: "reset clears current
  selection state"

Verified via `git stash` of Phase 10B changes that **these failures are
pre-existing on the `cloudflare-migration` HEAD** — not regressions
from any overnight work. They likely require live Supabase / env-var
setup that isn't present in the local environment.

**Recommended next step for founder:** investigate whether these tests
should run only in CI with full Supabase credentials, OR be re-mocked
to not require live infrastructure. Either way, the full local test
suite cannot currently green at baseline; this should be tracked
separately from any overnight work.
