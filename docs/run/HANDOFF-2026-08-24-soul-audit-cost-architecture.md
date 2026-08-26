# Handoff — 2026-08-24 — Soul Audit cost architecture

Written for compaction. **Nothing shipped this session** — no code changed, no
commits, no decision id assigned. What exists is a set of measurements, three
findings that change the shape of the work, four traps, and two decisions
waiting on the founder.

A parallel session owns `HANDOFF-2026-08-24-all-these-things.md`. Different
work; don't merge them, and don't `git add -A`.

---

## The problem, as the founder framed it

Three constraints, all hard:

1. **The site stays free.** No payments on site — a payment surface is what
   costs us free Bible-translation licensing. Non-commercial is **locked**.
2. **Soul Audit must genuinely use AI to generate.** Founder rejected a
   pre-composed / deterministic plan library outright: _"no predeterminism."_
3. **The founder cannot absorb the inference cost.** _"Soul Audit costs will
   cripple me."_

**Scope, narrowed by the founder mid-session:** this covers **Soul Audit plan
generation and chat only**. Daily Bread and the weekly devotionals already have
a free path (generated on the founder's own Claude subscription) and are out of
scope entirely.

Founder's chosen architecture: a cheap high-capability model (Kimi / DeepSeek)
does the writing, Claude coordinates and checks, all through **OpenRouter** on
the founder's own key.

---

## Measured, not estimated

Every number below came from the repo, not from category knowledge.

| Quantity                        | Value                                           | Source                                                            |
| ------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Reference corpus                | 5,114 chunks, mean **554 tokens**               | `public/reference-index.json`                                     |
| Retrieved context per day       | ~4,430 tokens (8 × 554)                         | `CHUNKS_PER_DAY = 8`                                              |
| Input per generated day         | ~7,000 tokens                                   | context + prompt + Scripture + word studies                       |
| Output per generated day        | ~2,500 tokens                                   | `LLM_MAX_TOKENS = 6000` is the cap, not the norm                  |
| Generated days per plan         | **5**                                           | `TOTAL_CONTENT_DAYS`; days 6–7 are deterministic (`composeRecap`) |
| **Per plan**                    | **~35,000 in / ~12,500 out**                    |                                                                   |
| **Cost today (Sonnet, $3/$15)** | **~$0.35/plan** incl. ~20% retries              | `grounded-weave.ts:28`, `cost-ledger.ts:53-57`                    |
| Chat                            | ~$0.0005/msg on `gpt-5-nano`                    | `router.ts:102`, `cost.ts`                                        |
| Chat caps                       | 20 msgs/user/month; $100/month platform ceiling | `brain/flags.ts`                                                  |

**Proposed split:** DeepSeek writer (~$0.008) + code gate ($0) + Claude
adjudicating ~15% of days (~$0.020) ≈ **$0.028/plan**.

Per active user per month (1 plan + 20 chat messages): **$0.36 → $0.038**.

| Monthly active users | Today   | Proposed |
| -------------------- | ------- | -------- |
| 100                  | $36     | $3.80    |
| 1,000                | $360    | $38      |
| 10,000               | $3,600  | $380     |
| 50,000               | $18,000 | $1,900   |

**On a $100/month ceiling: ~275 active users today, ~2,600 after.** The wall
moves; it does not disappear. Say so plainly rather than selling "free."

---

## Three findings that change the shape of the work

**1. This is mostly wiring, not a rewrite.** `grounded-weave.ts:20` _already_
imports `generateWithBrain` from the brain router; line 848 is merely
`input.modelOverride ?? SONNET`. The router already carries multi-provider
routing, per-provider BYO keys (`router.ts:300`) and a low-cost platform policy
(`allowHighCostOnPlatform`, `router.ts:363`). The cost-shifting machinery was
built; Soul Audit generation just isn't pointed at it.

The one concrete blocker: **`callOpenAI` (`router.ts:477`) reads the
module-level `OPENAI_MODEL` instead of taking a model parameter**, so an
OpenRouter path cannot reuse it. `callAnthropic` (`:610`) already takes a model.

**2. The day arc is NOT planned by an LLM today.** `select/route.ts:545` sets
`scriptureAnchor` once from `option.preview?.verse`, and theme likewise, from the
deterministically-matched audit option. Per-day variety comes from BM25
retrieval with a diversity penalty on already-used chunks. So a Claude
"coordinator" stage that plans a 5-day arc would be **net-new capability
(~$0.018/plan), not a port of existing behaviour.** Cut it or adopt it
deliberately — do not smuggle it in under a cost refactor.

**3. The Soul Audit's instant moment is already free.** `/api/soul-audit/submit`
makes **zero** LLM calls — the five options come from deterministic ranking in
`matching.ts`, and even the three `ai_primary` options are drawn from the same
curated candidate pool (`matching.ts:350-418`), differing only in framing copy.
At select, `buildOnboardingDay()` returns an instant curated Day 1. The LLM only
writes days 1–5, asynchronously (`USING_QUEUE_FALLBACK`, `select/route.ts:964`).
Whatever changes, the "I am seen" moment is not at risk.

---

## Why a cheap writer is defensible here

Not a general claim about DeepSeek — a claim about this codebase. `verify()`
(`grounded-weave.ts:476`) already runs a deterministic hallucination gate, in
code, at zero cost, and **it does not care which model wrote the text**:

| Check                 | Line   | Catches                                                                                                                                      |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Invented citations    | `:488` | A named historic author not among _that day's_ retrieved sources                                                                             |
| Invented Hebrew/Greek | `:498` | Diacritic tokens in neither the lexicon nor the grounding text (with a carve-out so "naïveté" never fails a day — founder ruling 2026-07-12) |
| Misquoted Scripture   | `:376` | Anchor's first three significant words must appear in order in a quote line                                                                  |
| Stub output           | `:416` | Requires multi-paragraph prose, blockquotes excluded from the count                                                                          |
| False attribution     | `:651` | Credits a source only if the author's surname appears in the prose                                                                           |

Gating **in code before Claude reads anything** is the whole economic lever. If
Claude checked every day, its _input_ cost alone is $0.134/plan — sixteen times
the writing — because checking means re-reading the sources plus the draft.

---

## Traps worth keeping

**Billing follows the engine, not the slot — and OpenRouter breaks the
heuristic.** `executeProvider` (`router.ts:844`) currently decides billing by
_key shape_: an `sk-ant-` key on the `openai` slot routes to Claude and bills as
Anthropic. That was the fix for a real bug — per `cost.ts:9-18`, mispricing once
left the $100 budget guard sitting in front of roughly **$4,500 of real spend**.
A single `sk-or-` key serves DeepSeek at $0.14/$0.28 _and_ Claude at $3/$15, so
key shape can no longer discriminate. **Bill per model id**, and prefer
OpenRouter's reported actual cost over any local rate table that can drift.

**Users cannot bring their Claude/ChatGPT subscription. Re-verified 2026-08-19.**
Anthropic's terms (Feb 2026) forbid Free/Pro/Max OAuth tokens "in any other
product, tool, or service"; enforcement is technical (client fingerprinting)
since 2026-04-04, and **the ban risk lands on the user's account, not ours**.
OpenAI's Apps SDK auth flows the other direction only (ChatGPT is the client,
our server the resource). "Sign in with ChatGPT" did launch 2026-08-02, but it
grants _identity plus a one-time $5/$50 API credit_ across six named partners —
not subscription-billed inference. This extends `docs/run/RESEARCH_OAUTH.md`
(2026-07-10), whose conclusions still hold.

**Non-commercial is stricter than it sounds, and not uniform.** Crossway counts
**donations** as commercial — the day donations appear, the free ESV API is
gone. API.Bible's free Starter tier is 5,000 calls/month across **3** copyrighted
Bibles, "no ads, fees, freemium models or upsells"; a merch link from
euangelion.app risks their "in-app promotions" clause. Practical consequence:
self-serve (API.Bible Starter + api.esv.org + the 7 public-domain versions
already shipping) yields ~11 translations **in a day, with no letters**. Letters
are escalation only, and three of the four majors are _web forms_, not emails
(Crossway digital permissions form, Lockman Permission to Quote form, Tyndale
Permissions Questionnaire; Biblica takes a written request). Biblica publishes
10 business days for review plus up to 10 more for the letter; full license
agreements run 4–6 weeks.

**The gate catches fabrication, not flatness.** No deterministic check will ever
flag prose that is correctly cited, structurally valid and spiritually inert.
Any evaluation ends with the founder reading output, never with a green tick.
Fallback if the writing is dead: move the writer up a tier — Kimi K2 at
$0.60/$2.50 is still ~6× cheaper than Sonnet on output, behind the same gate.

---

## Staged but not done

- **`.env.local`** has `OPENROUTER_API_KEY=` (**empty — the founder has not
  pasted it yet**), plus `OPENROUTER_MODEL_WRITER=deepseek/deepseek-chat` and
  `OPENROUTER_MODEL_CHECKER=anthropic/claude-sonnet-4.6`. Model ids are
  confirmable at openrouter.ai/models; nothing reads these yet.
- **No code touched.** `types.ts`, `router.ts`, `cost.ts` and `grounded-weave.ts`
  are all unmodified.

### The build, when it's approved

1. `types.ts:1` — add `'openrouter'` to `BrainProviderId`. `COSTS` and
   `providerOrder` are exhaustive records, so strict TS forces every call site.
2. `router.ts:477` — a model-parameterised OpenAI-compatible caller.
3. `cost.ts` — per-model billing, preferring OpenRouter's reported cost.
4. `grounded-weave.ts:848` — the writer / gate / adjudicator split.
5. A harness that runs one real plan and prints per stage: model, input tokens,
   output tokens, reported cost, gate pass/fail, total — replacing every
   estimate above with real numbers.

---

## Open — needs the founder

1. **Rollout.** Flag with both paths live (recommended — lets the same plan be
   generated both ways and read side by side, and rollback is a flag flip), or a
   hard switch off Sonnet.
2. **Failure policy** when the gate flags a day and Claude's repair also fails.
   Retry twice then fail visibly (recommended; matches the no-silent-fallbacks
   rule), escalate to Sonnet, or fail fast on first failure.
3. **Coordinator** — cut it, adopt it as new scope, or build it behind a flag.
   See finding 2.
4. **`MAX_AUDITS_PER_CYCLE` is 3**, so one heavy user can triple their own plan
   cost. Worth deciding on purpose rather than inheriting.

## Open — unrelated, from the same session

**ComfyUI Cloud MCP** is installed at **user scope** (`claude mcp add --transport
http --scope user comfyui https://cloud.comfy.org/mcp`) and authenticated —
`claude mcp get comfyui` reports `✔ Connected`. Tools appear in **new** sessions
only. Unresolved: `CLAUDE.md`'s image-generator ruling (Nano Banana banned,
Higgsfield retired, Codex `image_gen` only) predates it and does not mention
ComfyUI, so it is **installed machine-wide but not approved for Euangelion
artwork**. The riso/halftone spec and the check-the-library-first rule would
apply regardless.

## Process note

The founder asked for "a full pitch, show me a page." It was published as a
Claude artifact
(`https://claude.ai/code/artifact/db0f0028-2e54-415c-97d5-c5c1d6c1f7aa`) **before
the `pitch` skill existed in this session**. That skill now forbids artifacts for
Euangelion pitches; the founder then redirected the deliverable here. If this
content is wanted on the pitch site, republish via
`scripts/pitches/publish-pitch.mjs` with a stable slug — do not fork a second
page.
