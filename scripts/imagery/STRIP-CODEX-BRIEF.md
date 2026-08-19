# ⚠️ DIRECTION CHANGED 2026-08-19 — DO NOT GENERATE FROM THIS BRIEF YET

Founder: "the cartoon needs to be like a legit cartoon — like peanuts or
boondocks... I have one I started with chatgpt, maybe can find it."

That supersedes the riso-plate-plus-caption format this brief specified. The
funnies slot is now a REAL MULTI-PANEL COMIC STRIP:

- 3–4 panels in a horizontal strip, drawn cartoon style (Peanuts / Boondocks
  register — characters with faces, expressions, timing across panels), NOT a
  single riso art plate with a typeset caption.
- The founder's own ChatGPT-started cartoon is the intended character/style
  anchor. HOLD all generation until it lands in
  `content/strip-reference/` (create when received) and the founder approves
  a character sheet derived from it.
- OPEN FOUNDER DECISION: a Peanuts-style strip carries lettering (speech
  balloons) INSIDE the artwork, which the site's no-text-on-images rule
  forbids. Either the rule gets a comics exception (balloon lettering is
  content, like Hebrew/Greek) or dialogue stays typeset below the panels.
  Neither is assumed — ask.
- The Ninety-Nine CONCEPT (the flock left behind; elder-brother dry wit) may
  survive as the premise or be replaced by the founder's cartoon's own cast —
  founder's call when the reference lands.

What survives from the old pipeline: the StripPayload contract, the review
queue (every strip is a draft until approved), and the caption/writing bank
as dialogue raw material. The riso subjects below are RETIRED as generation
targets and kept only as a record.

---

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
