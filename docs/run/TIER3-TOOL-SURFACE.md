# Tier-3 tool surface

What devo-go relies on, and whether the tier-3 API arm can reproduce it.
Derived from `.claude/skills/devo-go/SKILL.md` and its `references/`.

Any row marked **no** is an explicit capability difference and MUST be
recorded in the reading-gate artifact by `compose-api.mjs`, so the founder
knows what a tier-3 build could not do.

| Capability                | Used for                                                            | Tier-3 substitute                             | Reproducible? |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------- | ------------- |
| Read                      | governing docs, BSB corpus, lexicons, reference index, source packs | `node:fs`                                     | yes           |
| Write / Edit              | drafting days, brief, source pack, series wiring                    | `node:fs`                                     | yes           |
| Grep / Glob               | locating corpus passages and prior series                           | `node:fs` + regex                             | yes           |
| Bash                      | `validate-devotional.mjs`, `check-readability.mjs`, gates, git      | `node:child_process`                          | yes           |
| codex exec (imagery)      | GPT Image 2 plates via the founder's ChatGPT subscription           | shell out identically                         | yes           |
| ElevenLabs narration      | founder-voice render + score                                        | `render_el_catalog.py` over HTTPS, unchanged  | yes           |
| AskUserQuestion           | founder's Required Inputs                                           | `STANDING-BRIEF.md` governs; never used in CI | n/a           |
| Skill invocation          | loading devo-go itself                                              | skill text inlined as the system prompt       | n/a           |
| Agent (parallel research) | stories, quotes, videos, Hebrew/context fan-out                     | sequential API calls, one per brief           | **partial**   |
| WebSearch / WebFetch      | live discovery of stories, quotes, embeddable videos                | none on the raw API                           | **no**        |

## The two real gaps

**WebSearch / WebFetch — no substitute.** The raw Messages API has no
equivalent. This is materially less limiting than it looks: `weekly-series.yml`
already constrains cloud grounding to the committed reference index, lexicons
and BSB corpus, with unverifiable material CUT. Tier 3 therefore composes from
committed sources only. Consequence: a tier-3 series carries no newly
discovered outside stories, quotes or videos. It is a smaller series, not a
less accurate one — every verification standard still applies.

**Agent fan-out — partial.** The skill's parallel research agents become
sequential API calls. Slower, and the single-author drafting rule (Harvest v5
precedent, `traps.md` §19) is unaffected because drafting was never
parallel to begin with.

## What does not change at tier 3

The 12-word contiguous BSB verbatim gate, `validate-devotional.mjs` to 0/0,
the readability pass, the cross-testament rule (SA-032), the single-author
drafting rule, and the reading gate itself (SA-029). Tier 3 changes who runs
the instructions, never the instructions.
