---
name: devo-go
description: Build a new prefab devotional series end-to-end from a theme — research-verified content, founder reading gate, imagery, videos, wiring, and deploy. Invoke as /devo-go "<devotional thematic>". This is THE standard process for all devotional builds (founder ruling 2026-07-22), distilled from the Prayer of Jabez reference build (SA-029/F-081).
---

# /devo-go — Devotional Series Builder

## Invocation

`/devo-go "<devotional thematic>"` — the argument is the seed: a passage ("the Prayer of Jabez"), a theme ("waiting on God"), or both. From that seed this skill runs the complete pipeline. If the argument is missing, ask for the thematic before anything else.

**Founder ruling (2026-07-22): how the Prayer of Jabez was built is how ALL devotionals are built.** Deviations from this pipeline require an explicit founder ruling, recorded in `docs/production-decisions.yaml`.

## When To Use

Use when the founder asks for a new prefab series (any length, any passage or topic): writing the days, sourcing stories/quotes/videos, generating imagery, registering the series, and shipping it. This skill encodes the process that produced `prayer-of-jabez` — the founder-approved reference build.

Not for: runtime-generated (Soul Audit) devotionals, edits to a single existing day, or visual-only work (use `wokegod-brand`).

## Required Inputs

1. Passage/topic + day count + start day (Sunday start ⇒ SA-029 sabbath-first shape).
   **Image intensity 1–5 (SA-131)** — the tonal register for the series' plates, asked
   in the same Phase-1 AskUserQuestion. 1 is the current site register (airy, ambient
   light, quiet cream ground); 5 is cinematic baroque (tenebrist, one hard in-scene
   source, frame filled). **Defaults only, used when no intensity is given: stills 1,
   motion 5.** When the founder names an intensity it applies to EVERY generated image
   in the run, stills and motion alike, and overrides that split — founder, 2026-08-29:
   _"Unless I specify, the intensity is for all generated images. If I set intensity
   then this rule overrides the default."_ Record the chosen value in the brief header;
   pass it as `--intensity=N` to every generation.
2. The founder's personal/emotional context for the series (becomes the spine — ask if not offered).
3. Founder answers via AskUserQuestion on: format, editorial stance on any cultural baggage, how personal the spine is, and definition of done. Ask BEFORE writing anything.
4. Governing docs read in full: `content/AUTHORING-SPEC.md` (governs on conflict), `docs/AI-CONTENT-CONSTRAINTS.md`, `docs/PUBLIC-FACING-LANGUAGE.md`, `.claude/skills/euangelion-platform/references/content-structure.md`, and `docs/production-decisions.yaml` SA-029.

## Progressive Disclosure References

1. `references/workflow.md` — the 13-phase pipeline with exact commands, file paths, and gate order.
2. `references/verification-standards.md` — research-agent briefs and what VERIFIED means for scripture, Hebrew/Greek, stories, quotes, and videos.
3. `references/imagery-and-video.md` — the two-master architecture (landscape 3:2 + portrait 3:4), the nine prompt blocks and the failure each one fixes, the three set-level axes that stop every plate looking alike, install sizes, placement rules, video embed requirements.
4. `references/traps.md` — every failure mode hit on the reference build and how to avoid it.
5. `references/narration.md` — rendering the finished series in the founder's voice and scoring it: which voice, cost gate, verification, and the traps that cost credits the first time.

## Implementation Workflow (summary — full detail in references/workflow.md)

1. Read governing docs → AskUserQuestion (format/stance/spine/done) → lock the week shape.
2. Fan out parallel research agents (stories, quotes, videos, Hebrew/context); pull ALL scripture verbatim from `public/bibles/` corpus only.
3. Write brief (`content/series-briefs/<slug>.md`) + source pack (`content/source-packs/<slug>.md`). The source pack is the ONLY citation pool for drafting.
4. Draft the pivot (C) day first, then the rest. EVERY day opens with the Two-Minute Open in its **v2 shape** (SA-030 as amended by SA-034, 2026-08-10): scripture → vocab → **short write-up about that scripture** → reflection → short prayer → DEEP DIVE `cta` (`ctaHref: "#devotional-section-7"`), self-contained, before the full structure; declare `"format": "two-minute-open-v2"` so the validator enforces the sequence and the cta target. Run `node scripts/validate-devotional.mjs` until 0/0.
   - **Cross-testament rule (SA-032, 2026-07-27, ALL days):** a day anchored in New Testament scripture must carry a real Old Testament connection that day; an OT-anchored day must carry a NT connection. Corpus-verbatim only.
   - **Parable-cluster rule (SA-032):** when the seed passage belongs to a discourse cluster Scripture itself groups (e.g. the Matthew 13 kingdom parables), cover the cluster as interrelated — never isolate one parable from its God-given neighbors.
   - **Single-author rule (Harvest v5 precedent):** research fans out to parallel agents; DRAFTING DOES NOT. Write every prose module yourself, days 1–7 in order, in one pass. Per-day writer agents produced the patchwork the founder rejected ("hobbled together with various edits just thrown on top"), and the fix was a clean-sheet single-author rewrite. See `references/traps.md` §19.
5. Devotional-editor agent review → apply fixes → re-review to READY FOR FOUNDER.
   - **Readability pass (SA-053, 2026-08-16):** run `node scripts/check-readability.mjs <slug>` and fix the tail before the founder reads it. Founder: _"it needs to be 8th grade level reading maybe slightly more elevated… I want the breadth of content to stay the same, but slightly lower reading level."_ **Breadth never shrinks — only punctuation changes.** The editor pass MUST include a cross-day repetition sweep (parallel writers converge on the same phrases — count recurring sentences/refrains across all days and thin them; SA-032).
6. **Founder reading artifact:** publish a private artifact of the full text in the site's mockup design language. **SA-031 (2026-07-26) amends SA-029(4): the pipeline runs end-to-end WITHOUT pausing here or at the deploy step** — the artifact is still published and every gate still runs and is reported, but they are non-blocking; the founder reviews live output and requests revisions after. Pause only if the founder explicitly asks to read first for a given run.
7. Imagery (GPT Image 2 at `aspect_ratio: "3:2"`, riso duotone) at the series' chosen
   **intensity 1–5** + inline-image placement; verify videos embeddable.
   - **Generate, MEASURE, regenerate what missed.** The SA-131 calibration proved the
     generator does not track a requested ink percentage linearly — asking for more deep
     ink produced a _lighter_ plate at one point. So intensity is a closed loop, not a
     setting: `verify-masters.mjs <dir> --intensity=N` reports what each plate actually
     measures against what was asked, and anything more than one rung off is regenerated.
   - **Never paraphrase an intensity block.** `prompt-preamble.md` holds the verbatim
     wording that produced each founder-approved rung; the wording is the asset, not the
     numbers inside it.
   - **Build the subject line FROM the passage, clause by clause** — every element traceable to a specific verse — and **audit every NEGATIVE constraint against the text before generating** (founder ruling 2026-08-24). An exclusion written for composition silently deletes Scripture: "no staff or rod" produced a Moses without the rod Exodus 17:9 puts in his hand. See `imagery-and-video.md` §"Textual accuracy comes BEFORE composition".
   - **Assign every plate a composition archetype, a coverage band, one conceptual device AND a camera (shot distance + height + relationship)** before generating, and vary all four across the set. **Medium/frontal/eye-level is the model's default and must be rationed** — founder: _"Not just always medium front."_ Over-the-shoulder rear views hide faces by pose, simplify hands, and put the consequence in the same frame as the subject. A plate can be individually beautiful while the SET fails: the founder rejected 33 plates at mean 78% ink / sd 9.7 with _"all the images feel like they are depicting the same devotional."_ The shipped set measures sd 26.8 across 7–100%.
   - **Never derive every ratio from one square master.** The crop-safe intersection of the site's eight ratios from a square is 16% of the frame, which forces the centred, padded compositions the founder rejects. Two masters, each composed to its own shape.
8. Wire: `series.ts` (SERIES_DATA + order array + FEATURED_SERIES if directed), `series-rails.ts`, bump `__tests__/series-data.test.ts` count and `scripts/check-feature-prd-integrity.mjs` count.
9. Tracking: next SA id from `production-decisions.yaml` (canonical — not CHANGELOG grep), next F-### PRD, CHANGELOG entry.
10. **Narration + score (SA-043, 2026-08-15) — full detail in `references/narration.md`.** Render the finished series in the founder's cloned voice, then lay the atmospheric score under it. Runs HERE, after the prose is final and before the gates: the audio stores a fingerprint of the text it speaks, so any later edit invalidates the track and every chapter mark in it; and the manifest is a build input, so it must exist before `npm run build`.
    - `render_el_catalog.py <slugs> --dry-run` FIRST — it prints the exact character cost and refuses to start if the budget will not cover the whole job. Report the cost before spending it. Never spend without showing the number.
    - Then render, then `produce.py` for the score. The score pass rebuilds from the chunk cache: no credits, no API, repeatable.
    - The founder's voice is for NEW series only; the back catalog stays on `am_michael`. A new devotional averages 9,487 characters against 691k credits a month, so new content is already paid for.
    - **The narration is never processed.** Founder ruling: the voice is right as rendered; everything goes underneath it.
    - Verify all four before shipping: duration drift < 0.5 s (chapter marks are absolute — drift moves every one after it), `textHash` matching the page, chapters starting at 0 and inside runtime, and every file under the **hard 25 MiB Workers asset limit** (no plan raises it; ~23 MB is a 25-minute day at 128 kbps stereo).
    - Bump `CACHE_NAME` in `public/sw.js` AND `SW_VERSION` in `src/components/ServiceWorkerRegistration.tsx` together, or returning listeners keep the old audio cached.
11. Gates: type-check, verify:\*, lint, full test suite, build.
12. Verify in `npm run preview` (Workers runtime): curl every route AND a rendered-DOM assertion for new module shapes (curl alone cannot catch client-render drops).
13. Merge/deploy per the founder's standing path (merge to main, then `npm run deploy`) → warm the edge cache on all affected URLs → live-verify → report full evidence (SA-031: deploy is non-blocking; evidence is reported, not awaited).

## Guardrails

- Every quote verbatim + fully cited; every story primary-source verified; folklore REJECTED and the rejection documented in the source pack (Müller breakfast-table and Paton angel-guard are the precedents).
- Allowed translations only (BSB/WEB/KJV/ASV/YLT/DARBY/BBE); match the corpus's exact text INCLUDING divine-name casing (repo KJV prints "the Lord"; BSB prints "the LORD").
- Hebrew/Greek never unpaired with transliteration; the Jabez metathesis rule generalizes: never overstate a lexical claim the interlinear doesn't support.
- Banned phrases/labels per AUTHORING-SPEC §2 — zero tolerance; validator enforces.
- Videos: official channels only, oEmbed-verified AND embed-block-checked; never a video that blocks off-YouTube playback.
- The Two-Minute Open is required on all new days (SA-030, forward-only): a reader who stops at the DEEP DIVE CTA must have had a complete devotional.
- No arbitrary images — every slot needs a one-sentence contextual justification (the caption). (The pre-imagery reading PAUSE was retired by SA-031; the reading artifact itself is still mandatory.)
- **Imagery ACCURACY gate (SA-032, extended by SA-052 2026-08-16 and SA-124 2026-08-24):** before placement, verify every illustration against the fact it illustrates — botanical, historical, textual. Style-checking is not enough. **SA-124 adds the step that must happen BEFORE generation, not after: trace every element of the subject line back to a specific clause of the passage, and audit every negative constraint to be sure it does not cancel one** — "no staff or rod" cost a re-generation by deleting the rod of God from Exodus 17:9. SA-052 adds four checks that no measurement catches: **count the fingers on every hand** (five each, correct length order — the most common founder rejection); **no impossible/Escher geometry** (_"looks like ai made it and got confused"_); **does the image actually suit the passage**; and **derive the worst-case crops** to confirm the idea survives them. Automated blank/border checks must measure TEXTURE at native resolution, never brightness — every brightness-based check written for this pipeline produced false negatives on correct cream-dominant plates. (Precedent: a wheat-vs-darnel plate shipped with formed, identical heads — botanically wrong and message-defeating, founder-caught in production. If the image's point is a difference, the difference must be visibly, accurately rendered.)
- **Readability is a tail problem, not an average (SA-053, 2026-08-16).** Measured across the last four series, the average is already right — FK 7.7, Reading Ease 71, plain English. What makes a day feel dense is the TAIL: 12–17% of sentences run 30+ words and each series carries 11–25 sentences of 45–95 words, at grade 33–36. An average washes those out; a reader does not. Gate on the tail:
  - **FK ≤ 8.5**, **under 8% of sentences at 30+ words**, **nothing over 45 words** — `scripts/check-readability.mjs`.
  - **Never wrap a quotation inside a longer sentence.** 36% of the over-30-word sentences are a setup clause plus an embedded archaic quote plus a continuation, all as one sentence. Setup sentence. Quote its own sentence. Response sentence. This single habit is the largest source of density in the catalog.
  - **`story` and `insight` modules run longest** (avg 20.9w and 24.3w against `teaching` at 16.6w). Bring the sentence discipline of `teaching` to them.
  - Splitting long sentences at existing clause boundaries takes FK 7.7 → 7.2 and 30w+ from 15% → 11% **without cutting a single word.** That is the whole intervention: same research, same quotes, same ideas, fewer stalls.
- **A series is not finished until it can be listened to (SA-043).** Narration and score ship with the series, not after it. A day whose `textHash` does not match its page is a broken track, not a missing feature — the audio is silently saying something the reader is not seeing.
- **Never spend credits without showing the cost first.** Dry-run, report the character count and the remaining balance, then render. An ElevenLabs key carries its OWN quota independent of the account, and exhausting it surfaces as `HTTP 401` — a bare status code reads as a bad key, so always log the response body.
- Stage commits by explicit file list (parallel sessions share this working tree); never `git add -A`.
- Deploy proceeds without a pause (SA-031), but ONLY after preview evidence is green; all evidence is reported to the founder in the final summary.

## Automated Gates (SA-124 — founder: "lock down accuracy and devotional consistency")

Two hooks now enforce mechanically what was previously enforced by memory. Both
run `scripts/check-devotional-consistency.mjs`.

1. **Claude Code PostToolUse hook** — `.claude/settings.json` fires
   `scripts/hooks/devotional-consistency-hook.sh` on every Write/Edit. If the
   file written was a `public/devotionals/*.json`, it checks it immediately and
   reports. This is the one that matters: it turns a failed production build
   forty minutes later into a two-second correction.
2. **husky pre-commit** — runs the same checker over STAGED devotional JSONs
   only, so ordinary commits pay nothing.

**What it catches, and why each one is there:**

| Check                               | Severity | The failure it exists for                                                                                                                                                                                                                                                                          |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field_type`                        | FAIL     | `wordByWord`/`relatedWords` authored as strings where the catalogue uses arrays. Killed TWO production builds with `.map is not a function`, and only at prerender. Learns expected shapes from the catalogue (min 8 samples).                                                                     |
| `open_sequence`                     | FAIL     | An `inline-image` inserted INSIDE the two-minute open, breaking the required scripture/vocab/teaching/reflection/prayer/cta order. Happened on day 6.                                                                                                                                              |
| `image_missing`                     | FAIL     | An `inlineImageSrc` pointing at a file not on disk.                                                                                                                                                                                                                                                |
| `image_no_caption` / `image_no_alt` | FAIL     | The caption IS the contextual justification for the slot; without it the image is arbitrary.                                                                                                                                                                                                       |
| `red-letter`                        | FAIL     | Delegates to the REAL SA-051 resolver via `apply-to-days.ts --check`, which now EXITS 1 if it would add attribution to a module that has none. On its first full run this caught Revelation 22:13 shipping black in `bible-365-day-1` — Christ's own words, on the most-read day in the catalogue. |
| `audio-texthash`                    | FAIL     | Delegates to the python narration extractor. Catches a track that no longer speaks the page — the "stale track survives a text edit" trap.                                                                                                                                                         |
| `too_few_images`                    | warn     | Fewer than 3 plates per day.                                                                                                                                                                                                                                                                       |
| `no_cross_testament`                | warn     | SA-032's OT↔NT link.                                                                                                                                                                                                                                                                               |

**Severity is deliberate.** Correctness blocks; completeness warns. The back
catalogue predates these standards and SA-030 / SA-032 / SA-053 are all
explicitly forward-only — a gate that fires on 582 existing files gets switched
off and then protects nothing. **`--strict` promotes warnings to failures, and
devo-go passes `--strict` for every NEW series.**

Delegation is also deliberate: red letter and textHash call the real resolver
and the real extractor rather than lookalike reimplementations, which would
drift from them and be worse than no check at all.

## Validation

```bash
node scripts/validate-devotional.mjs public/devotionals/<slug>-day-*.json

# SA-131 — imagery at the series' intensity, then the read-back gate.
node scripts/imagery/build-prompts.mjs <slug> --intensity=<1-5>      # add --motion for video plates
node scripts/imagery/verify-masters.mjs <masters-dir> --intensity=<1-5>

# SA-124 — accuracy + consistency. --strict because this is NEW work.
node scripts/check-devotional-consistency.mjs --strict --series <slug>

# Narration: cost gate FIRST, then render, then score (the score costs nothing —
# it rebuilds the narration from the chunk cache).
python3 euangelion-voice-prototype/spec/render_el_catalog.py <slug>-day-1 ... --dry-run
python3 euangelion-voice-prototype/spec/render_el_catalog.py <slug>-day-1 ...
python3 euangelion-voice-prototype/spec/produce.py <slug>-day-1 euangelion-voice-prototype/PRODUCED-<slug>-day-1.m4a

npm run type-check && npm run verify:production-contracts && npm run verify:tracking && npm run verify:feature-prds
npm run lint && npm test && npm run build
npx vitest run __tests__/narration-manifest-current.test.ts   # audio matches the page
npm run preview   # then curl every new route + rendered-DOM check
```
