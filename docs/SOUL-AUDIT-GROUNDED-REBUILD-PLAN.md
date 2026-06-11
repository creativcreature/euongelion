# Soul Audit — Grounded Generation Rebuild Plan

**Status:** Grounded generation CORE **built + verified** (2026-06-11). Delivery infra (background job, deep-dive tier, Workers perf) scoped with constraints below. Founder: "finish the big build."

## BUILT + VERIFIED this session (the core)

- **`src/lib/soul-audit/lexicon.ts`** — grounded Hebrew/Greek word studies from real lexica (BDB, Strong's, Abbott-Smith, morphHB, STEPBible). `getWordStudyByStrong` + `getWordStudiesForVerse`. Verified: Psalm 34:18 → _shabar_/_dakka_; John 1:1 → _logos_/_theos_.
- **`src/lib/soul-audit/chunk-retrieval.ts`** — shared BM25 retrieval + `attributionFromChunk`.
- **`src/lib/soul-audit/grounded-weave.ts`** — `generateGroundedDay({mode:'reading'|'deepdive'})`: injects verbatim Scripture (`getVerse`), retrieves real attributed quotes (BM25), grounds word studies (lexicon), weaves via **Sonnet** in a **delimiter format** (killed the malformed-JSON failure), runs a **verification pass** that rejects ungrounded authors/etymology. Returns `DayContent` (woven body in `textB`, grounded metadata).
- **`generate-day/route.ts`** — now calls `generateGroundedDay` (legacy 19-field prompt/parser deleted) with a grounding gate that re-rolls any unverified day.
- **`DailyBreadView.tsx`** — renders the woven `textB`, skips empty legacy chiastic fields, shows the lexicon word-study card.

**Verified end-to-end (dev, Sonnet):** an audit → "Day 1 grounded: 905w · 6 sources · 2 word studies · verified"; the day API serves the full 5,112-char grounded body (verbatim Psalm 34:18, word study _dakkâʼ_, Pascal/Luther quoted + attributed, Christ-centered). Standalone prototype (`/tmp/proto-weave.md`): `verification.ok: true`.

## REMAINING (delivery infra — real Workers constraints, not yet built)

1. **Free background generation + Day-1-first.** A Sonnet day is ~38s; the Workers free plan kills any single invocation (request + waitUntil) at ~30s wall-clock. So generation MUST move off the request path to a **Durable Object** (free-tier, CPU-bounded so the I/O wait is free) or a Cron Trigger. `/status` should return the read route as soon as Day 1 is saved; Days 2-7 continue in the DO (date-gated → ample slack). Verify in `npm run preview` (workerd supports DOs locally) before deploy.
2. **Workers lexicon performance.** `lexicon.ts` parses ~27MB of WLC XML on first call — fine in Node/dev, too heavy for the free 10ms-CPU Workers limit. Needs a **build step** that precomputes a compact verse→word-study index (JSON) for runtime.
3. **Deep Dive tier UI.** `generateGroundedDay({mode:'deepdive'})` already produces the ~3,500w body + `tier3Extended`; needs a "Go Deeper" generation endpoint + reader rendering.
4. **Pre-warn copy** on the Build button.

This is the original \"do-it-right\" plan; the prior version of this section still describes it in full below.

**Owner decision date:** 2026-06-10. **Branch:** `elevation/soul-audit-rebuild`.

---

## The decision (founder-locked)

Rebuild Soul Audit day generation as a **closed, grounded RAG weave** — _curated, not freely generated_ — to limit hallucination and "bad sources," matching the founder's quality bar (the wokeGod "Genesis: Two Stories of Creation" deep dive) while being **more rigorous** than that example.

| Axis                | Decision                                                                                                                                                                                 | Why                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Content model**   | Closed grounded **weave** of real retrieved materials; the LLM connects, never invents                                                                                                   | Founder: "intended to be a RAG system that curated, not generated… a closed system to limit hallucinations and bad resources"     |
| **Format**          | Loosen the rigid **19-field JSON** envelope → flowing prose with the elements **woven in** (Scripture, word study, historic voice, Christ-link, prayer, reflection)                      | Founder: "loosen the 19 thing but those items still need to be woven together"                                                    |
| **Depth (tiering)** | **Tiered**: ~1,000-word grounded daily **reading** per day + optional ~3,500-word **Deep Dive** expansion (full PaRDeS, multiple word studies, cross-refs, voices, modern illustrations) | Founder selected "Tiered: reading + deep dive"                                                                                    |
| **Model**           | **Sonnet 4.6** for the weave (Haiku too clumsy with source material; Opus = ceiling but ~6× cost)                                                                                        | Grounded bake-off below                                                                                                           |
| **Infra**           | **Free Durable Object** background job (NOT Queues — founder can't pay)                                                                                                                  | Sonnet day = ~57s, exceeds the 30s Workers request cap; background jobs are CPU-bounded, and an LLM call is ~0 CPU while it waits |
| **Delivery**        | **Day-1-first**: generate Day 1 → drop reader in; Days 2-7 + deep dives generate in background with retries                                                                              | It's a _daily_ plan — reader needs only Day 1 now; later days are date-gated, giving slack to generate + retry                    |
| **Loader**          | Multi-stage per-day "press" loader (built this session) + **pre-warn** on the Build button                                                                                               | Founder: "the loader should be a presentation… something for each day of writing"                                                 |

---

## Why Sonnet + background job (measured, not guessed)

**Free-generation bake-off** (same prompt, ~800-word devotional):

| Model                        | Time  | $/day  | Note                                                |
| ---------------------------- | ----- | ------ | --------------------------------------------------- |
| Haiku 4.5                    | 14.4s | $0.006 | fast, good, slightly "explained"                    |
| Sonnet 4.6                   | 28.7s | $0.017 | most writerly                                       |
| Opus 4.8                     | 25.4s | $0.105 | ceiling; faster than Sonnet here                    |
| Gemini 2.5 (all)             | —     | —      | **key out of credits**                              |
| Kimi-K2 / DeepSeek (via NIM) | —     | —      | **endpoint 404 — model ids need fixing**            |
| MiniMax-M2                   | —     | —      | `api.minimax.io` auths but returned empty           |
| gpt-5                        | 16.7s | —      | **empty output** (spent budget on hidden reasoning) |

**Grounded bake-off** (weave ONLY provided real materials; auto-checked for invented authors): **all three Anthropic models stayed grounded — zero invented attributions.** The closed prompt is what kills hallucination, not the model. Sonnet wove the à Kempis source most gracefully; Haiku noted a truncation awkwardly.

**Key latency fact:** a Sonnet _daily reading_ (~1,180 words) = **~37s**; a Sonnet _deep dive_ (~3,500 words) ≈ 90-180s. Neither fits the 30s Workers HTTP request cap → **background job is mandatory** (it's also what the founder greenlit: "time limit doesn't matter if we have other solutions").

---

## Prototype proof (this session)

`/tmp/proto-weave.mjs` produced a grounded daily reading (output saved at `/tmp/proto-weave.md`): **1,182 words · 36.8s · $0.026** on Sonnet. Fidelity: verbatim Scripture ✓, both Hebrew words grounded in real BDB/Strong's ✓ (`shabar` H7665 "to burst/break in pieces", `dakah` H1794 "to collapse, contrite"), à Kempis quoted verbatim + attributed ✓, no invented etymology/authors ✓. It reads in the wokeGod register but with **real** lexicon data instead of "pictographic fishhook" etymology and a **real sourced** quote instead of "the Church Fathers saw…".

---

## Grounding assets (already on disk — nothing to buy)

- **Scripture (verbatim):** `public/bibles/` (ASV, BBE, BSB, DARBY, KJV, WEB, YLT) + `src/lib/bible/getVerse.ts` + `parseReference.ts`.
- **Hebrew/Greek lexica:** `content/reference/lexicons/HebrewLexicon/` (Brown-Driver-Briggs `BrownDriverBriggs.xml`, Strong's `HebrewStrong.xml`), `lexicons/Abbott-Smith` (Greek), `lexicons/morphhb`, `lexicons/strongs`, `content/reference/stepbible-data/STEPBible-Data`.
- **Historic voices:** commentary corpus → `public/reference-index.json` (5,114 BM25 chunks: Augustine, Calvin, Pascal, Luther, à Kempis, Spurgeon, Edwards, Bunyan, Wesley, Chesterton, Owen, Murray, Tozer, Bounds, Whitefield, Hannah Whitall Smith, Douglass…).
- **Curated quote bank:** `content/reference/SOURCE-BANK.md` (~60 quotes — grow toward ≥300).

---

## Build phases (deferred — tasks #29-31)

1. **Wire lexicon/stepbible into retrieval** (#29). The index is currently **commentary-only**; index the BDB/Strong's/Abbott-Smith/stepbible data and add a Strong's-number lookup so word studies are grounded, not invented.
2. **Grounded weave prompt + verification pass** — productionize `/tmp/proto-weave.mjs`: `getVerse` injects verbatim Scripture (never model-typed → also fixes the reference/text swap), retrieved chunks are the ONLY allowed quote sources, and a **fidelity check rejects + re-rolls** any day that smuggles in an ungrounded quote/citation/verse. Loosen the 19-field schema to woven prose.
3. **Free Durable Object background generation + Day-1-first** (#30) — generation off the request path; Day 1 → reader starts; Days 2-7 in background with retries + grounding verification; reader renders a partial plan gracefully ("being written").
4. **Deep Dive tier** (#31) — on-demand ~3,500-word expansion (PaRDeS four levels, multiple word studies, canonical cross-refs, several voices, modern illustrations).
5. **Polish** — pre-warn copy on the Build button; cost telemetry; grow SOURCE-BANK toward ≥300.

---

## Bugs found this session

- **`textBPreview` parse loop — FIXED.** Day 2 reliably 500'd on a missing field the parser can derive; now derived from `textB` (so a missing preview no longer nukes the whole edition back to Day 1). `generate-day/route.ts`.
- **Malformed-JSON day failures.** The model intermittently emits invalid JSON (the 19-field envelope is failure-prone) — another reason to loosen the schema; the background-job retry absorbs the rest.
- **Scripture reference/text swap (intermittent).** `ingredient-selector.ts` (~769-798) reassigns `scriptureReference` for dedup/pool-validity **without re-deriving `scriptureText`** → can cite Philippians but quote James. **Fix:** route displayed Scripture through `getVerse(finalRef)` (same fix as the grounded weave).
- **Workers-runtime deterministic-options fallback.** The options call (~18-26s) brushes the 25s deadline under Workers CPU throttle → falls back to deterministic template cards ("apart through dont"). Resolved once generation moves off the request path.

## Interim state on the branch (until the rebuild lands)

Synchronous pipeline kept working-but-not-final: **Haiku** day model (only model that fits the 25s window), right-sized 600-900w prompt, `textBPreview` parse fix, env-tunable `LLM_ROUTE_DEADLINE_MS`, and the new per-day loader. This is **not** the final product — the grounded Sonnet + Durable Object rebuild above replaces it.
