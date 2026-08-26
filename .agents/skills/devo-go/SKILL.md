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
4. Governing docs read in full: `content/AUTHORING-SPEC.md` (governs on conflict), `docs/AI-CONTENT-CONSTRAINTS.md`, `docs/PUBLIC-FACING-LANGUAGE.md`, `.Codex/skills/euangelion-platform/references/content-structure.md`, and `docs/production-decisions.yaml` SA-029.

## Progressive Disclosure References

1. `references/workflow.md` — the 12-phase pipeline with exact commands, file paths, and gate order.
2. `references/verification-standards.md` — research-agent briefs and what VERIFIED means for scripture, Hebrew/Greek, stories, quotes, and videos.
3. `references/imagery-and-video.md` — GPT Image 2 riso style block, prompt template, processing sizes, placement rules, video embed requirements.
4. `references/traps.md` — every failure mode hit on the reference build and how to avoid it.

## Implementation Workflow (summary — full detail in references/workflow.md)

1. Read governing docs → AskUserQuestion (format/stance/spine/done) → lock the week shape.
2. Fan out parallel research agents (stories, quotes, videos, Hebrew/context); pull ALL scripture verbatim from `public/bibles/` corpus only.
3. Write brief (`content/series-briefs/<slug>.md`) + source pack (`content/source-packs/<slug>.md`). The source pack is the ONLY citation pool for drafting.
4. Draft the pivot (C) day first, then the rest. EVERY day opens with the Two-Minute Open (SA-030): scripture → vocab → reflection → short prayer → DEEP DIVE `cta`, self-contained, before the full structure; declare `"format": "two-minute-open"` so the validator enforces it. Run `node scripts/validate-devotional.mjs` until 0/0.
5. Devotional-editor agent review → apply fixes → re-review to READY FOR FOUNDER.
6. **Founder reading gate:** publish a private artifact of the full text in the site's mockup design language. NO imagery before approval.
7. After approval: imagery (GPT Image 2, riso duotone) + inline-image placement; verify videos embeddable.
8. Wire: `series.ts` (SERIES_DATA + order array + FEATURED_SERIES if directed), `series-rails.ts`, bump `__tests__/series-data.test.ts` count and `scripts/check-feature-prd-integrity.mjs` count.
9. Tracking: next SA id from `production-decisions.yaml` (canonical — not CHANGELOG grep), next F-### PRD, CHANGELOG entry.
10. Gates: type-check, verify:\*, lint, full test suite, build.
11. Verify in `npm run preview` (Workers runtime): curl every route AND a rendered-DOM assertion for new module shapes (curl alone cannot catch client-render drops).
12. Founder confirms evidence → merge/deploy per founder's chosen path → warm the edge cache on all affected URLs → live-verify.

## Guardrails

- Every quote verbatim + fully cited; every story primary-source verified; folklore REJECTED and the rejection documented in the source pack (Müller breakfast-table and Paton angel-guard are the precedents).
- Allowed translations only (BSB/WEB/KJV/ASV/YLT/DARBY/BBE); match the corpus's exact text INCLUDING divine-name casing (repo KJV prints "the Lord"; BSB prints "the LORD").
- Hebrew/Greek never unpaired with transliteration; the Jabez metathesis rule generalizes: never overstate a lexical claim the interlinear doesn't support.
- Banned phrases/labels per AUTHORING-SPEC §2 — zero tolerance; validator enforces.
- Videos: official channels only, oEmbed-verified AND embed-block-checked; never a video that blocks off-YouTube playback.
- The Two-Minute Open is required on all new days (SA-030, forward-only): a reader who stops at the DEEP DIVE CTA must have had a complete devotional.
- No imagery before the founder reads the text. No arbitrary images — every slot needs a one-sentence contextual justification (the caption).
- Stage commits by explicit file list (parallel sessions share this working tree); never `git add -A`.
- No deploy without founder confirmation of preview evidence.

## Validation

```bash
node scripts/validate-devotional.mjs public/devotionals/<slug>-day-*.json
npm run type-check && npm run verify:production-contracts && npm run verify:tracking && npm run verify:feature-prds
npm run lint && npm test && npm run build
npm run preview   # then curl every new route + rendered-DOM check
```
