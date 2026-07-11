# RESULTS_LOG — optimization loop (Task 7)

Metric: LCP in milliseconds (homepage + reader), measured by `score.py` (LOCKED once written — never edited, never redefined).

Termination ladder (Web Vitals-anchored; adjust to measured baseline at L-3):

- Tier 1: LCP < 4.0s (out of "poor")
- Tier 2: LCP < 2.5s ("good" — the launch bar)
- Tier 3: LCP < 1.8s (excellent)
- Tier 4: LCP < 1.2s (world-class)

Stop conditions (whichever first): Tier 4 · Tier 2 + 10 consecutive stale rounds · 100 rounds.

## Status

RUNNING (started 2026-07-10). **Baseline (round 0): home 8412ms · reader 7040ms → SCORE 8412ms · Tier 0** — measured against the deployed wave-2 build in the local Workers preview (Lighthouse 13, headless Chrome, simulated mobile throttling, 3-run medians). Loop iterates in the isolated deploy-worktree; winning changes port back as commits.

## Rounds

| Round | Change (one hypothesis)                                                                                                                                                                                               | Before → After (ms)                   | Kept?                                                              | Tier                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| 1     | suppressHydrationWarning on <html> (theme script mismatch suspected of re-noding the hero → LCP chained to JS)                                                                                                        | 8412 → 8023 (home 8023 / reader 6676) | KEPT (beats baseline; margin may be variance — mechanism persists) | 0                                   |
| 2     | SW controllerchange reload gated on pre-existing controller — first-install clients.claim() was RELOADING THE PAGE MID-FIRST-LOAD for every new visitor (found via trace: doc parsed twice, all images fetched twice) | 8023 → 4472 (home 3507 / reader 4472) | KEPT — also fixes a real first-visit double-load in production     | 0 (reader-bound, 472ms from Tier 1) |
