# Codex brief — Euangelion series imagery, round 2 (rev B)

You are producing illustration masters for a Christian devotional site.

**Rev B supersedes rev A.** Gate A passed. Gate B failed and is being re-run on a
corrected pipeline. Read §1 and §2 before anything else — the reason Gate B failed
is architectural, not a matter of trying harder.

**Do not mass-produce. There are gates. Stop at each one.**

---

## 1. What changed in rev B, and why

### 1a. One square master could never have worked

Rev A specified a single 2048² square master and derived every site ratio from it.
That was wrong. The site consumes eight distinct ratios, and the crop-safe
intersection of all of them from a square source is:

```
central 60% width  x  27% height  =  16% of the frame
```

Everything meaningful had to live inside that sliver. **That constraint is what
produced the centred, padded compositions the founder rejected** — the pipeline
was mathematically forcing the fault. Proof from Gate B: `truth` is "an enormous
plumb line touching one exact point," and the 1408:768 site crop cut off the point
and bisected the seated figure. The approved image and the shipped image were not
the same image.

### 1b. Resolution was short

The generator returned **1254²**. The primary hero slot needs 1600px wide, so
installing it meant a 1.28× upscale. Upscaled Ben-Day halftone reads as grain and
mush — a defect this project already fixed once. Codex correctly refused to
upscale.

### 1c. The preamble was fighting the brief

`prompt-preamble.md` demanded sky detail, ground texture and distant landscape in
every frame. That outranked the plate-specific coverage direction and pushed 3 of
5 proofs out of band. **The preamble has been corrected** — the clause is now
"NO BARE PAPER" plus "PRINTED IS NOT POPULATED." Re-read it; do not work from
memory of rev A.

## 2. The corrected pipeline — two masters per plate

| Master        | Size      | Ratio | Serves                                                                                                                                                                                                      |
| ------------- | --------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Landscape** | 2400×1600 | 3:2   | series hero, series card (4:3), Rack plate (4:3), devotional headline (1408:768), artwork frames (3:2), Substack banner (16:9), landscape Mosaic, bento **lead** (1:1) / **default** (1:1) / **wide** (2:1) |
| **Portrait**  | 1800×2400 | 3:4   | Covers plate (3:4), Mosaic plate (4:5), tall Mosaic (3:5), rhythm block (1408:1700), bento **tall** (1:2)                                                                                                   |

Crop-safe zones — how much of each master the composition may actually use:

```
landscape 3:2   worst cases 1:1 (66.7% width) and 2:1 (75% height)
                → keep everything essential inside the central 66% x 75%   ≈ 50% of frame

portrait 3:4    worst cases 1:2 (66.7% width) and 3:5 (80% width)
                → keep everything essential inside the central 66% x 90%   ≈ 60% of frame
```

Still a constraint, but 3–4× the freedom of rev A, and both masters can be composed
to their own shape rather than to a lowest common denominator.

**Explicitly out of scope this round:**

- The `3358/920` homepage banner (`.homepage-hero-banner-art`,
  `.homepage-bible365-hero-art`) is **not series artwork.** It is the homepage-only
  `header-v2.webp`, keeps its native ratio, and is never cropped from these plates.
- **No social derivatives.** No 1:1, 4:5 or 9:16 social exports. Social gets its own
  art-directed pass later.
- **Series OG cards are separately rendered text-led cards.** Do not design for OG.

### Resolution rule — hard

Generate at or above the stated master size. **Never upscale.** If your generator
cannot produce 2400×1600 or 1800×2400 natively, generate the largest supported
size at the correct _ratio_, report the actual dimensions, and **stop for
instruction** rather than upscaling or silently shipping short. A master that
cannot fill its largest consumer without enlargement is not usable.

### Focal metadata

Every plate records a focal point in `manifest.json` (see §7) as normalized
`{x, y}` of the conceptual anchor — the plumb bob's tip, the lamp, the break in the
bread. Downstream crops use it as `object-position` instead of blind centre.

## 3. What stays exactly as it is

From `prompt-preamble.md` (re-read it, it changed):

- Riso screen-print, strict two-colour duotone: deep cobalt ultramarine on warm
  cream, Ben-Day halftone carrying every tone, faint crimson misregistration, no
  greys, **no text, letters or numerals anywhere** — including invented glyphs on
  objects. (Gate B's `valued` failed on pseudo-lettering struck into the coin.)
- One small warm golden-yellow accent per plate; the light must have a story.
- **FULL BLEED** — artwork to every edge; no paper margin, border, frame, vignette.
- **PEOPLE** — region- and period-specific ancient Levantine/Judean; period dress
  only; **skin is a printed VALUE**, brown to deep brown at dense dot coverage,
  never bare paper; faces hidden by pose, angle or head covering, **never blacked
  out**; a visible region-accurate face is fine.

## 4. Why round 1 failed — still the whole job

Founder, on seeing 33 finished plates together:

> "Currently the Images all feel similarly weighted, all over compositions… all the
> images feel like they are depicting the same devotional… When I look at the series
> page and all illustrations at once — its very hard to tell what images are supposed
> to be depicting as they all basically feel the same."

> "I want the imagery to feel slightly more like New Yorker type illustrations while
> maintaining the current style color risograph etc… I still want surrealism."

```
round 1, all 33:     mean 78% ink   range 55–99%   ← clustered heavy
founder-approved 4:  22%  31%  41%  85%           ← spans the ladder
```

**Three rules that follow, and Gate B still broke two of them:**

1. **Quiet ≠ blank ≠ filled.** A cream-dominant frame is correct when the cream is
   printed. Do not add scenery to "complete" it.
2. **No two subject lines may share a trailing clause.** Round 1 was one sentence
   33 times with the noun swapped.
3. **Concept, not illustration.** Jabez is a giant hand from the clouds over a
   speck of a man. A single strange idea reads at thumbnail size; a detailed
   landscape does not. Gate B's `truth` and `the-work-of-god` both drifted back
   toward populated landscape — extra figures, background crowds. **Cut them.** If
   a person is not the device, they are noise.

## 5. Composition archetypes and coverage bands

| Code | Archetype                                                          |
| ---- | ------------------------------------------------------------------ |
| A    | Scale break — one element impossibly large against something tiny  |
| B    | Vast field, tiny figure                                            |
| C    | Single object, close, on a **toned** ground — no landscape         |
| D    | Cross-section — above and below revealed at once                   |
| E    | Repetition + exactly one break                                     |
| F    | Framed view — the frame _is_ an opening                            |
| G    | Overhead plan — **straight down**, near-diagrammatic (not oblique) |
| H    | Silhouette — shape-driven, minimal interior detail                 |
| I    | Detail crop — the rest of the world is out of frame                |
| J    | Impossible juxtaposition                                           |

| Band  | Ink coverage | Notes                                                                 |
| ----- | ------------ | --------------------------------------------------------------------- |
| AIRY  | 20–35%       | Cream dominant but toned. **Zero produced so far across two rounds.** |
| MID   | 40–55%       | Balanced figure-ground                                                |
| DENSE | 70–90%       | Night, storm, chaos, buried — where density _means_ something         |

Set target: **12 AIRY / 14 MID / 7 DENSE**.

State the coverage intent in words inside the subject line. For AIRY: _"most of
the frame is quiet warm cream carrying only a faint dot gradient — no landscape,
no background figures, no filler detail."_ For DENSE: _"ink covers nearly the
whole frame."_

## 6. The matrix — Gate A approved, 33 plates

Bands below are the **Gate A-approved revision** (six changes from the original,
resolving seven adjacent-band collisions; distribution preserved at 12/14/7).

| #   | Slug                                 | Arch | Band                                                                                                                                       | Conceptual device                                                                                  |
| --- | ------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | abiding-in-his-presence              | D    | A real mature grapevine carries visible sap-light into one naturally attached fruiting branch; one genuinely severed branch lies dry below |
| 2   | anointed                             | I    | MID                                                                                                                                        | Oil runs over a bowed head in extreme crop; only the horn's lip enters frame                       |
| 3   | bible-365                            | E    | DENSE                                                                                                                                      | A dense wall of identical closed scrolls; exactly one unrolled and lit                             |
| 4   | coming-to-the-end-of-ourselves       | B    | AIRY                                                                                                                                       | The track stops mid-frame; a tiny figure sits exactly where it ends                                |
| 5   | community                            | G    | MID                                                                                                                                        | Directly overhead: figures ring one lamp, shadows radiating like spokes                            |
| 6   | genesis-two-stories-of-creation      | J    | AIRY                                                                                                                                       | Two incompatible halves of creation meet across a luminous seam, surrounded by quiet printed cream |
| 7   | hearing-god-in-the-noise             | A    | DENSE                                                                                                                                      | A canyon shaped like an ear; a tiny figure at its opening                                          |
| 8   | hope                                 | F    | AIRY                                                                                                                                       | The frame is the tomb mouth seen from within, opening onto a bright garden                         |
| 9   | identity                             | E    | MID                                                                                                                                        | Identical clay masks cover a wall; one empty socket reveals sky                                    |
| 10  | in-the-beginning-week-1              | H    | AIRY                                                                                                                                       | Dark water meets first light at a pure horizon; nothing else interrupts the shape                  |
| 11  | kingdom                              | A    | MID                                                                                                                                        | A mustard sapling towers over the fallen empire it grows through                                   |
| 12  | once-saved-always-saved              | C    | AIRY                                                                                                                                       | Large cupped hands hold a sleeping lamb against a softly printed graded field                      |
| 13  | peace                                | B    | MID                                                                                                                                        | A tiny boat on broad flat water; the departing storm occupies only the frame's edge                |
| 14  | present-in-the-chaos                 | J    | DENSE                                                                                                                                      | A perfectly still vertical chamber cut through a dust storm, one figure inside                     |
| 15  | provision                            | I    | MID                                                                                                                                        | Two hands and one loaf fill the frame; the break in the bread emits light                          |
| 16  | rooted                               | D    | AIRY                                                                                                                                       | A small tree above an impossibly large root system drawn in sparse lines through cream-toned earth |
| 17  | signs-boldness-opposition-integrity  | H    | MID                                                                                                                                        | A colonnade becomes flat dark bars; the figures are the shapes between them                        |
| 18  | standing-strong                      | A    | DENSE                                                                                                                                      | A vast wall of wind fills the frame; one small upright figure holds against it                     |
| 19  | surrender-to-gods-will               | C    | AIRY                                                                                                                                       | Large open hands release light upward against a quiet graded printed field                         |
| 20  | the-blueprint-of-community           | G    | MID                                                                                                                                        | From above, a house plan transforms room by room into one shared table                             |
| 21  | the-nature-of-belief                 | B    | AIRY                                                                                                                                       | A tiny figure faces the first plank of a rope bridge whose far end cannot be seen                  |
| 22  | the-word-before-words                | H    | MID                                                                                                                                        | One point of light interrupts an evenly printed dark field; no other form appears                  |
| 23  | the-work-of-god                      | I    | DENSE                                                                                                                                      | Hands and clay consume the frame; the wheel's movement becomes smeared halftone                    |
| 24  | too-busy-for-god                     | G    | MID                                                                                                                                        | An estate becomes a diagram from above; one curl of breath crosses it and vanishes                 |
| 25  | truth                                | A    | AIRY                                                                                                                                       | An enormous plumb line descends and touches one exact point on a vast quiet plain                  |
| 26  | valued                               | J    | MID                                                                                                                                        | A coin as large as a millstone beside a tiny lamplit woman                                         |
| 27  | what-does-it-mean-to-believe         | I    | AIRY                                                                                                                                       | Only a reaching hand and the edge of a garment inside a softly toned field                         |
| 28  | what-happens-when-you-repeatedly-sin | G    | MID                                                                                                                                        | From directly above, a rut forms a perfect circle; one thin thread escapes it                      |
| 29  | what-is-carrying-a-cross             | H    | DENSE                                                                                                                                      | Beam and bearer merge into one flat silhouette before a luminous gate                              |
| 30  | what-is-christianity                 | F    | AIRY                                                                                                                                       | The frame is an enormous open cage door; a small bright world lies beyond                          |
| 31  | what-is-the-gospel                   | A    | MID                                                                                                                                        | A tiny runner crosses a ridge before a sunrise of impossible scale                                 |
| 32  | why-jesus                            | J    | DENSE                                                                                                                                      | Many roads converge, braid into one rope, and pass through a single small door                     |
| 33  | witness-under-pressure-expansion     | E    | MID                                                                                                                                        | Identical small lamps disperse from one dark city into widening printed space                      |

**Adjacency:** no two plates adjacent on the series page may share archetype or
band. Verified clean at Gate A. Re-verify if anything changes.

**The landscape and portrait masters of one plate share the concept but are
composed independently.** The portrait is not a re-crop of the landscape — it is
the same idea restaged for a tall frame.

## 7. Output locations and manifest

```
imagery-staging/series-v2/
  landscape/<slug>.png              2400x1600
  portrait/<slug>.png               1800x2400
  rejected/<slug>--r<N>.png         superseded proofs, KEPT not deleted
  contact/round-<N>.html
  manifest.json
```

**Preserve the five rejected Gate B proofs** — move them to `rejected/`, do not
overwrite. `imagery-staging/` is gitignored. **Never write into `public/`.**

```json
{
  "slug": "truth",
  "archetype": "A",
  "band": "AIRY",
  "device": "an enormous plumb line touching one exact point",
  "landscape": {
    "file": "landscape/truth.png",
    "subject": "<full SUBJECT line used>",
    "measured_ink_pct": 31.2,
    "focal": { "x": 0.5, "y": 0.72 },
    "dimensions": "2400x1600"
  },
  "portrait": { "...": "same shape, or null until produced" },
  "round": 2,
  "status": "pending | approved | rejected",
  "notes": ""
}
```

## 8. Verification — per plate AND across the set

Per plate, existing tool:

```bash
node scripts/imagery/verify-masters.mjs imagery-staging/series-v2/landscape
```

Checks border and bare-paper coverage. It deliberately refuses to score figures.

**Across the set — the check that actually matters.** Round 1's gate passed 33
near-identical images because it only looked at one at a time. Report every round:

- ink coverage per plate vs its assigned band, and **count out-of-band**
- distribution against the 12/14/7 target
- standard deviation (round 1 was 9.7 — too tight; approved four span 22–85%)
- **crop survival**: derive each master's worst-case crops and confirm the
  conceptual device survives. For landscape that is 1:1 and 1408:768; for portrait
  that is 1:2 and 3:5. A device that dies in the crop fails the plate.

A set that clusters fails **even if every individual plate is beautiful.**

## 9. Contact sheets

Self-contained HTML, base64 images, theme-aware. Four panels in this order:

1. **The founder's approved four**, labelled as the bar.
2. **Thumbnail grid at true series-card size.** The most important panel — the
   founder's complaint is that plates are indistinguishable _in a grid_. If you
   cannot tell them apart here, the round failed regardless of how they look large.
3. **Per plate:** master, plus its **worst-case crops rendered** (1:1 and 1408:768
   for landscape; 1:2 and 3:5 for portrait), archetype, band, measured ink %,
   device in one line. Show the crops — that is where Gate B's failure hid.
4. **Distribution summary** from §8.

## 10. Execution — founder has collapsed the gates

**Founder instruction, 2026-08-16: "get going and generate all images so I can see
the set."** The staged proof gates existed to protect a per-image credit budget.
You are generating on the operator's own ChatGPT account (GPT Image 2), so that
budget no longer binds, and the founder's complaint is a _set-level_ one that five
plates cannot answer. Gates A and B are closed. Run straight through.

**Order of work:**

1. **All 33 landscape masters** → `imagery-staging/series-v2/landscape/`
2. **Contact sheet** `contact/landscape-full.html` + the §8 set-level report
3. **All 33 portrait masters** → `imagery-staging/series-v2/portrait/`
4. **Contact sheet** `contact/portrait-full.html` + the §8 set-level report
5. Report and stop. **Nothing is installed into the site** — that step is not yours.

Do not pause for sign-off between 1–4. Present the finished set.

**Do stop and ask** if any of these occur — these are blockers, not judgement calls:

- The generator cannot reach 2400×1600 or 1800×2400 natively. **Report the actual
  dimensions and stop. Never upscale.**
- Following a locked rule would make a plate impossible.
- A contradiction between this brief and `prompt-preamble.md`. (One was found and
  fixed on 2026-08-16 — the preamble's square-master metadata and 9:16/1.91:1 crop
  clause were rev A residue and are now replaced by `CROP_CLAUSE_LANDSCAPE` and
  `CROP_CLAUSE_PORTRAIT`. Catching that before spending was correct. Keep doing it.)

**Assemble prompts with the repo tooling rather than by hand**, so the wording
cannot drift from the approved source:

```bash
node scripts/imagery/build-prompts.mjs <slug>              # landscape prompt
node scripts/imagery/build-prompts.mjs <slug> --portrait   # portrait prompt
node scripts/imagery/build-prompts.mjs --json              # all pending, landscape
node scripts/imagery/build-prompts.mjs --json --portrait   # all pending, portrait
```

Run state is derived from what is on disk, so an interrupted run resumes by
re-running the same command.

**Self-assess honestly in the final report**, per band and across the set. Gate B
was correctly self-reported as a failure; that judgement is what makes this
process work. If the set clusters again, say so plainly rather than presenting it
as finished.

## 11. Hard rules

- Never write to `public/`. Staging only.
- Never overwrite a master or a rejected proof. Iterations get new names.
- Never regenerate the founder's four approved plates.
- Never upscale. Report short dimensions and stop.
- No text, letters, numerals or invented glyphs in any image.
- No modern clothing, no European/Anglo/pale-skinned figures, no blacked-out faces.
- No background figures or crowd filler unless the device requires them.
- No two subject lines sharing a trailing clause.
- If a plate needs a rule broken to work, **say so and ask.**
- Report honestly at every gate. Gate B was correctly self-reported as a failure —
  keep doing exactly that. A gate that always passes is not a gate.
