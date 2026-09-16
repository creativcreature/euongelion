# Version 7 — Title Sequence

**Concept.** The parable of the sower cut like a 1960s film title sequence: flat
screenprint inks, hard cuts on a beat, bold shapes that slam in and slice the frame,
whole-frame colour flips, one iconic form per beat.

**References.** Saul Bass title cards (bold cut shapes, dramatic diagonals, rhythmic
cutting); the founder's "Get Up" screenprint cards (flat two- and three-ink printing,
rough edges, dry-brush voids); the Opus 5 riso film (ink separations, misregistration).

## Pace (measured, not estimated)

| | |
| --- | --- |
| Loop | 21.96 s, seamless |
| Beats | 38 |
| Cuts per second | 1.73 average |
| Median beat | 0.50 s |
| Shortest | 0.16 s (the strike flash, the gold flash) |
| Longest | 1.70 s (two deliberate breaths: the wide sowing, the walk back) |
| Beats longer than 2 s | 0 |

Bursts run at 2–3 events per second inside single beats: the bird's two-stage dive, the
four panels slamming up in sequence, the four thorn spikes, the three roots forking, the
30/60/100 count-up. Nothing is ever static: every beat animates inside itself.

## The cut

1. **Sowing** — cobalt clears the frame; the field slams up; the sower slams in; wind-up;
   the throw with a gold slice; a huge hand opens on crimson; seeds streak; four panels
   slam up carrying the four fates (bird, sun, thorns, wheat); a wide breath as he sows.
2. **The path** — the seed lands and bounces; a bird wedge slams in; it dives in two
   stages; a crimson flash on the strike; it lifts away with the seed; husks blow across
   the empty path.
3. **Rocky ground** — rocks slam in one after another; the seed drops into the crack; it
   shoots up on a scale punch; a crimson sun punches in; heat bars stab across; it wilts
   as crimson floods the frame; the burnt stalk curls.
4. **Thorns** — two spikes stab in, then two more from above; the squeeze closes crimson
   on the sprout; the tangle tightens over it.
5. **Good soil** — the seed goes down; three roots fork out; the shoot breaks the surface;
   leaves snap open; the ear forms; thirty, sixty, a hundred grains pop in; a gold flash;
   the field of wheat springs up; he walks back through it (breath); cobalt takes the
   frame and the loop begins again.

Beat-by-beat times: see `beats.md`.

## Site fit

- Composed for the 3:1 front band; checked at 2:1 (phone) — all four panels, the sower,
  the rocks, the thorns and the wheat still read.
- No words, letters or numerals anywhere. Counts are shown as grids of grain.
- No images, video or data URIs: every frame is painted by code onto two plates and
  printed by one WebGL1 shader.
- Inks: cobalt #1a4d98, gold #efbc3f, crimson #ce3442 on paper #ebdcb2. Overprints give
  green (cobalt+gold), orange (gold+crimson) and purple (cobalt+crimson).
- 30 fps cap, DPR capped at 1.5, reduced motion shows a still frame.
- The shader is a flat-ink screenprint pass (torn threshold, dry-brush voids, squeegee
  pressure, misregistration, grain) rather than the halftone dot screen, because this
  style is cut paper and squeegee, not lithography.

## Honest weaknesses

- **Weakest moment: the thorn tangle (13.5–14.3 s).** The tightening barbs read as a dark
  spiked ball; the menace lands but the shapes are closer to an asterisk than to briars.
- The rocky-ground section is the most conventional stretch — rocks, sprout, sun, wilt —
  and carries less invention than the sowing or the count-up.
- The sower is a bold pictogram. He has no face and no acting: correct for this style,
  but it means the piece carries no warmth from a character.
- Craft detail per frame is far below the fruit fly film. This style wins on rhythm,
  colour and graphic punch, not on drawing.
- Phone performance is UNVERIFIED: it was only run on an M4 Pro.

## Files

`index.html` · `preview-3x1.webp` (960×320, 24 fps, 4.7 MB) · `still-3x1.jpg` ·
`still-2x1.jpg` · `sheet.png` · `beats.md`. Review sheets from each round: `r1-sheet.png`,
`r1-big.png`, `r2-big.png`, `r3-big.png`, `r4-sheet.png`, `r5-big.png`,
`rphone-sheet.png`, `rseam-sheet.png`.
