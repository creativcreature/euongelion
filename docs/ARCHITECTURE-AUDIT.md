# ARCHITECTURE AUDIT — Phase 0 Ground Truth (Elevation Brief v3.0)

**Date:** 2026-06-10 · **Status:** Read-only audit, nothing modified · **Verdict gate:** present before Phase 1.

> **Headline:** The grounded-generation Soul Audit the brief wants to _build_ **already exists and is ~80% live.** The brief's "demolish the broken pipeline and build grounded generation" premise is **largely wrong** and would destroy working, hard-won infrastructure. The genuine problems are narrow and fixable: (1) a 25s wall-clock deadline colliding with a 6000-token (3000–4000 word) per-day generation, (2) no per-token spend ledger wired into the audit path, (3) `/devotional/[slug]` ships a client-only loading shell (no SSR body), and (4) dead legacy "match-to-series" modules that make the codebase _look_ canned when the live path is not.

---

## 1. The live pipeline (it is grounded generation)

`submit → ingredient-selector (RAG) → select (job) → status (drives) → generate-day (RAG compose) → read`

| Stage               | File                                                                     | What it does                                                                                                                                                                                                                                                               | LLM?    |
| ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **Understand**      | `src/lib/soul-audit/intent-parser.ts` (`parseAuditIntent`)               | Deterministic keyword/intent extraction from the reflection                                                                                                                                                                                                                | No      |
| **Gather**          | `src/lib/soul-audit/reference-retriever.ts`, `reference-index-loader.ts` | BM25 + RRF + diversity retrieval over a **5,114-chunk** reference index (verbatim Augustine/Calvin/Pascal/Luther/à Kempis/Chesterton/Spurgeon… prose); `THEMATIC_SCRIPTURE_EXPANSIONS` theme→passage maps (incl. the exact `anxiety → Phil 4:6-7` example the brief gives) | No      |
| **Compose options** | `src/lib/soul-audit/ingredient-selector.ts:552` (`generatePathsFromRag`) | Claude composes 3 bespoke option cards from `userInput + retrieved chunks` under a strict "no canned content" prompt; validates 3 distinct full-sentence titles + scripture diversity                                                                                      | **Yes** |
| **Select**          | `src/app/api/soul-audit/select/route.ts`                                 | Locks choice, archives prior plan, inserts plan + `soul_audit_jobs` row (`status:pending`), returns `{jobId, pollUrl}` (queue fallback — does NOT generate)                                                                                                                | No      |
| **Drive**           | `src/app/api/soul-audit/select/status/route.ts:139`                      | Per-poll fire-and-forget `fetch(generate-day)` (kept alive with `waitUntil` on Workers); stall detect 2min; lock 60s                                                                                                                                                       | No      |
| **Compose day**     | `src/app/api/soul-audit/generate-day/route.ts:447`                       | Loads index, BM25 top-8 chunks, builds chiastic/PaRDeS prompt, Claude composes the day (`maxOutputTokens: 6000`); Days 6/7 deterministic (recap + sabbath)                                                                                                                 | **Yes** |
| **Read**            | `src/app/api/devotional-plan/[token]/day/[n]/route.ts`                   | Reads saved `devotional_plan_days` (no generation)                                                                                                                                                                                                                         | No      |

**Per-reader, per-plan-token, generated once, never recycled across readers.** This is the brief's thesis, already implemented.

## 2. External LLM calls

All routed through `src/lib/brain/router.ts` (`generateWithBrain`). **Quirk:** the provider slot named `'openai'` calls **Anthropic** when the key is `sk-ant-` (`router.ts:862`). Effective model today = **`claude-sonnet-4-6`** (`router.ts:102`) for BOTH the options call (≤1800 out) and each day (≤6000 out).

- Configured-but-gated: `gpt-5-nano`, `gemini-2.0-flash-lite` (**deprecated/shut down 2026-06-01 — stale config**), `MiniMax-M2`, `moonshotai/kimi-k2` (BYO-key only).
- Retries: Anthropic 429/5xx ×3 w/ backoff. Timeout: **25s app-level deadline** (`LLM_ROUTE_DEADLINE_MS`, `api-security.ts:526`) under the Workers 30s cap. **No streaming.** Prompt-caching is plumbed but **not used** by the audit calls.

## 3. Forbidden-pattern hunt (brief's red lines)

| Pattern                                          | Live path                                     | Notes                                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) Output caching by theme/hash/token           | **ABSENT**                                    | Only per-plan-token idempotency ("don't regen Day 3 if it exists") — correct, not cross-reader recycling                                                                                                                                                                        |
| (b) Theme canonicalization reuse                 | **ABSENT**                                    | "theme" = `option.title`; exclusion lists push _away_ from reuse                                                                                                                                                                                                                |
| (c) Match-to-existing-series as the audit RESULT | **ABSENT in live path; PRESENT as DEAD code** | `composer.ts`, `reranker.ts`, `curated-builder.ts`, `metadata-plan-builder.ts`, `plan-orchestrator.ts`, `queue-producer.ts`, `curated-catalog.ts` have **0 importers**. `matching.ts` imported only for a string-trim util. These make the repo _look_ canned — safe to delete. |
| (d) Silent canned fallback                       | **MOSTLY ABSENT**                             | On timeout/parse/save fail → job `status:error` + 4xx/5xx, **no canned substitute**. One narrow exception: if _all_ providers are down, `submit` assembles RAG-derived deterministic option cards (still input+retrieval-grounded, not stock series).                           |

**Conclusion:** the live audit path does **not** violate the brief's architecture today. The brief is reacting largely to the _presence of dead legacy code_.

## 4. Cost controls present vs missing

- Present: `MAX_AUDITS_PER_CYCLE=3`, submit 12/min, select 30/min, token ceilings (1800/6000), 25s deadline, BYO-key gating for costly providers, `SOUL_AUDIT_ENABLED` kill switch, `platformMonthlyBudgetUsd` flag (default $100), 60s generation lock.
- **MISSING (the real "cost-uncontrolled" kernel):** `src/lib/brain/usage-ledger.ts` exists but is **only called by chat routes** — submit/select/generate-day have **no per-token $ ledger or monthly-budget enforcement.** This is a _missing call_, not a missing system.

## 5. Genuinely broken vs. wrongly-assumed-missing

**Broken/weak (the real work):**

1. **25s deadline vs 6000-token essay** — `generate-day` asks for a 3000–4000 word PaRDeS devotional but caps wall-clock at 25s (Workers headroom). Claude Sonnet routinely exceeds it → the live `"Day N generation took too long (25000ms deadline)"` 504. **This is the #1 failure.** (Also the cost driver — see cost model.)
2. **No spend ledger in the audit path** (§4).
3. **No streaming / no day-splitting** — large output blocks on one round-trip.
4. **`/devotional/[slug]` is a client-only loading shell** — server HTML has no body (see Bug 1, GROUNDING-CORPUS.md §B).
5. **Dead legacy modules** create the canned _illusion_.

**Already exists — DO NOT destroy:** Understand (`parseAuditIntent`), Gather (RAG retriever + theme maps + 5,114-chunk verbatim index), Compose (strict bespoke composition, per-plan-token, never recycled), the async `{jobId,status,pollUrl}` contract + stall/lock handling, and the C1 results→`GenerationProgress` handoff (fixed 2026-06-10).

## 6. Recommended re-scope of the brief (vs. demolition)

The right plan is **repair + tune + harden**, not rebuild:

- **R1 — Fix the day generation:** shrink output to the brief's own **600–900 words (~1500–2000 tokens)**, switch the compose model to **Haiku 4.5** (quality bar holds for short devotionals), add **streaming** for Day 1, and split/queue Days 2–7 via **Batch API**. This fixes the 25s timeout AND the cost in one move (see GENERATION-COST-MODEL.md).
- **R2 — Wire `usage-ledger`** into submit + generate-day; enforce the monthly budget cap with the brief's graceful-queue behaviour (never canned).
- **R3 — SSR the devotional body** (Bug 1; brief Phase 1.1) — resolves the "Preparing your devotional" shell + SEO.
- **R4 — Delete the dead legacy curated/composer modules** so the architecture stops looking canned.
- **R5 — Voice bank + PD Scripture:** grow `content/reference/SOURCE-BANK.md` from ~60 → ≥300 quotes; route rendered Scripture through the existing `getVerse` PD store (GROUNDING-CORPUS.md).

**No demolition of the RAG pipeline. No new determinism. No canned fallback added.**
