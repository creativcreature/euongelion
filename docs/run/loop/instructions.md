# Optimization Loop — Instructions (LOCKED)

_This file is edited only by the founder. The loop operator (Claude) may not change it, may not change `score.py`, and may not redefine "better."_

## Goal

Minimize production-shaped LCP for the two load-bearing surfaces: the homepage (`/`) and the devotional reader (`/devotional/too-busy-for-god-day-6`). The score is the WORSE of the two pages (max of medians) — both must be fast; optimizing one while the other regresses does not count.

## The measuring stick

`score.py` (sibling file, LOCKED): Lighthouse 13, headless Chrome, default mobile emulation + simulated throttling (the Web-Vitals-comparable configuration), 3 runs per page, median per page, score = max(medians), milliseconds. Run it against the local Cloudflare Workers preview (`npm run preview`) — the runtime production uses.

## FIT CHECK (verified before round 1)

- (a) Objectively scored: Lighthouse numericValue, no judgment calls. ✓
- (b) Fast feedback: build + preview + score ≈ 3–5 min/round. ✓
- (c) Direct asset access: the operator edits the app source directly. ✓

## The ASSET

Everything in `src/`, `public/`, `next.config.*`, `wrangler.jsonc`, and font/asset files. NOT: `score.py`, this file, test files (tests must stay green but aren't the asset), tracking docs.

## Rules

1. ONE hypothesis, ONE change per round. No batching.
2. Score via `score.py` ONLY. No eyeballing, no DevTools numbers.
3. Beats baseline → keep, new baseline. Ties or loses → revert fully.
4. Every round logged to `docs/run/RESULTS_LOG.md`: round #, change, before → after, kept/reverted, tier.
5. A kept change must not break `npm run type-check` or the test suite; a keep that breaks either is reverted regardless of score.
6. No quality sacrifices disguised as performance: content, fonts (brand typography), and images may be optimized in delivery (compression, preload, priority) but not removed or visibly degraded.

## Termination ladder (Web-Vitals-anchored)

- Tier 1: score < 4000 ms (out of "poor")
- Tier 2: score < 2500 ms ("good" — the launch bar)
- Tier 3: score < 1800 ms (excellent)
- Tier 4: score < 1200 ms (world-class)

Stop at whichever comes first: (a) Tier 4 reached; (b) Tier 2 reached AND 10 consecutive rounds without improvement; (c) 100 total rounds. On stop: record final tier, write the summary into RESULTS_LOG.md, deploy the winning baseline.
