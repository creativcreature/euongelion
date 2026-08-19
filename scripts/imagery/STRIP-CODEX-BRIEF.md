# The Ninety-Nine — Codex generation brief (SA-090 / F-136)

Ten strip panels for The Daily Bread's Funnies slot. This brief follows the
standing rules in `CODEX-BRIEF.md`; only the deltas are stated here.

## The job

For each pending id in `scripts/imagery/strip-panel-subjects.json`:

1. Assemble the prompt: `node scripts/imagery/build-strip-prompts.mjs <id>`
   — never hand-write prompts.
2. Generate with the **built-in `image_gen` tool only** (founder ruling
   2026-08-16 — the fallback CLI bills the API account and is banned).
3. **Attach the four style anchors as references on every generation:**
   `public/images/site/series/{prayer-of-jabez,he-cannot-deny-himself,looking-at-the-sun,the-harvest}.webp`
4. Landscape 3:2. The built-in tool's ~1536×1024 ceiling is expected —
   generate at ratio, report actual pixels, do not hunt for bigger.
5. Save to `imagery-staging/strip-v1/<id>.png`.

## What kills a panel (reject before saving)

- Any gold, any glow, any dark-ground/night-city look — cobalt on cream ONLY.
- Sheep with human expressions, drawn eyes, props, or clothes. Attitude comes
  from pose and grouping; the cast rule is in the subjects file.
- The shepherd as a close subject. He appears only distant or as absence.
- Text anywhere in the artwork. Captions are typeset by the site.
- A different fold. Same dry-stone sheepfold every panel, new angles only.

## After generation

Report per panel: id, actual pixels, one line on cast/setting compliance.
The founder reviews the staged set; on approval they are converted to webp in
`public/images/edition/strip/` (same basename), which is the ONLY step that
makes the strip section live — the generator serves only installed panels.
