# GENERATION COST MODEL — Phase 0 (Elevation Brief v3.0)

**Date:** 2026-06-10 · Live pricing pulled 2026-06-10. Target: a full bespoke 7-day edition at **$0.03–$0.10**.

## Live pricing (per 1M tokens, in / out)

| Model                              | Standard                                             | Batch (−50%)  | Notes                                                                             |
| ---------------------------------- | ---------------------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| **Claude Sonnet 4.6** (used today) | $3.00 / $15.00                                       | $1.50 / $7.50 | Current compose model — overkill + slow for short devotionals                     |
| **Claude Haiku 4.5**               | $1.00 / $5.00                                        | $0.50 / $2.50 | Recommended primary; caching −90% on input                                        |
| **Gemini 2.5 Flash-Lite**          | $0.10 / $0.40                                        | —             | Cheapest; good for Understand/Validate                                            |
| **Gemini 2.5 Flash**               | $0.30 / $2.50                                        | —             | Mid fallback                                                                      |
| **Cloudflare Workers AI**          | free tier (10k neurons/day), then ~$0.011/1k neurons | —             | Open models (Llama-class); lower quality bar for nuanced theology — fallback only |
| ~~Gemini 2.0 Flash-Lite~~          | —                                                    | —             | **Shut down 2026-06-01** — stale in `router.ts` config, remove                    |

## Token profile per stage

| Stage                     | Input                         | Output (current → proposed)                               |
| ------------------------- | ----------------------------- | --------------------------------------------------------- |
| Understand (intent)       | —                             | deterministic today = **$0** (keep; optional Haiku brief) |
| Options (3 cards)         | ~7k (prompt + trimmed chunks) | 1,800                                                     |
| Day compose               | ~6k (prompt + 8 chunks)       | **6,000 → ~1,800** (brief specifies 600–900 words)        |
| Validate (creedal rubric) | ~2k                           | ~200                                                      |

## Per-edition cost

### Current (Sonnet 4.6, 6,000-token days, no batch) — **and it times out**

- Options: $0.048 · Days 1–5 @ $0.108 = $0.540 · Days 6–7 deterministic $0 → **≈ $0.59/edition** (far over target, _and_ days routinely exceed the 25s deadline so editions don't even complete).

### Proposed (Haiku 4.5, ~1,800-token days, Batch for Days 2–5, lazy arc)

| Item                                                 | Cost                          |
| ---------------------------------------------------- | ----------------------------- |
| Options (Haiku, 7k/1.8k)                             | $0.016                        |
| Day 1 (Haiku sync, 6k/1.8k)                          | $0.015                        |
| Days 2–5 (Haiku **batch**, 4× @ $0.0075)             | $0.030                        |
| Days 6–7 (deterministic recap+sabbath)               | $0.000                        |
| Validation (5× Haiku rubric, 2k/200)                 | $0.015                        |
| **Total per full edition**                           | **≈ $0.076** ✅ within target |
| **Abandoned audit** (options + Day 1 only, lazy arc) | **≈ $0.031** ✅ pennies       |

Optional further savings: route Understand + Validate to **Gemini 2.5 Flash-Lite** ($0.10/$0.40) → trims ~$0.01–0.02; prompt-caching the static prompt scaffold (−90% input) trims more. Haiku-only keeps one provider and still hits target.

## Recommendation

- **Primary:** Claude **Haiku 4.5** for Options + Day compose. **Fallback:** Gemini 2.5 Flash-Lite (configured provider, outage failover); Workers AI only as last-resort (quality bar).
- **Cut day output to 600–900 words (~1,800 tokens).** This single change fixes BOTH the cost (~8× cheaper) AND the 25s timeout (Haiku + short output completes well under deadline) — the brief itself specifies this length.
- **Batch API for Days 2–7**, lazy arc (only Day 1 + options before the reader confirms the cover).
- **Wire `usage-ledger`** (already in repo, used by chat) into submit/generate-day; enforce `platformMonthlyBudgetUsd`; at 80% alert, at 100% graceful queue ("the presses are at capacity") — **never canned fallback.**
- Keep `MAX_AUDITS_PER_CYCLE`/rate limits; add per-device fresh-edition limit (~3/day).

**Per-audit cost ledger** to be tracked live in `docs/ELEVATION-LOG.md` once R1 ships and verified against real token counts (these figures are modeled from live unit pricing, to be confirmed against production telemetry).

## Sources

- [Anthropic pricing (Haiku 4.5 $1/$5, batch −50%)](https://platform.claude.com/docs/en/about-claude/pricing) · [Finout breakdown](https://www.finout.io/blog/anthropic-api-pricing)
- [Gemini API pricing (2.5 Flash-Lite $0.10/$0.40; 2.0 Flash-Lite shut down 2026-06-01)](https://ai.google.dev/gemini-api/docs/pricing) · [aicostcheck](https://aicostcheck.com/blog/google-gemini-pricing-guide-2026)
