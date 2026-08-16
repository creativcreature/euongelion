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
5. Devotional-editor agent review → apply fixes → re-review to READY FOR FOUNDER. The editor pass MUST include a cross-day repetition sweep (parallel writers converge on the same phrases — count recurring sentences/refrains across all days and thin them; SA-032).
6. **Founder reading artifact:** publish a private artifact of the full text in the site's mockup design language. **SA-031 (2026-07-26) amends SA-029(4): the pipeline runs end-to-end WITHOUT pausing here or at the deploy step** — the artifact is still published and every gate still runs and is reported, but they are non-blocking; the founder reviews live output and requests revisions after. Pause only if the founder explicitly asks to read first for a given run.
7. Imagery (GPT Image 2 at `aspect_ratio: "3:2"`, riso duotone) + inline-image placement; verify videos embeddable.
   - **Assign every plate a composition archetype, a coverage band and one conceptual device** before generating, and vary all three across the set. A plate can be individually beautiful while the SET fails: the founder rejected 33 plates at mean 78% ink / sd 9.7 with _"all the images feel like they are depicting the same devotional."_ The shipped set measures sd 26.8 across 7–100%.
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
- **Imagery ACCURACY gate (SA-032, extended by SA-052 2026-08-16):** before placement, verify every illustration against the fact it illustrates — botanical, historical, textual. Style-checking is not enough. SA-052 adds four checks that no measurement catches: **count the fingers on every hand** (five each, correct length order — the most common founder rejection); **no impossible/Escher geometry** (_"looks like ai made it and got confused"_); **does the image actually suit the passage**; and **derive the worst-case crops** to confirm the idea survives them. Automated blank/border checks must measure TEXTURE at native resolution, never brightness — every brightness-based check written for this pipeline produced false negatives on correct cream-dominant plates. (Precedent: a wheat-vs-darnel plate shipped with formed, identical heads — botanically wrong and message-defeating, founder-caught in production. If the image's point is a difference, the difference must be visibly, accurately rendered.)
- **A series is not finished until it can be listened to (SA-043).** Narration and score ship with the series, not after it. A day whose `textHash` does not match its page is a broken track, not a missing feature — the audio is silently saying something the reader is not seeing.
- **Never spend credits without showing the cost first.** Dry-run, report the character count and the remaining balance, then render. An ElevenLabs key carries its OWN quota independent of the account, and exhausting it surfaces as `HTTP 401` — a bare status code reads as a bad key, so always log the response body.
- Stage commits by explicit file list (parallel sessions share this working tree); never `git add -A`.
- Deploy proceeds without a pause (SA-031), but ONLY after preview evidence is green; all evidence is reported to the founder in the final summary.

## Validation

```bash
node scripts/validate-devotional.mjs public/devotionals/<slug>-day-*.json

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
