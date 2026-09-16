# Direction 3 — The Explainer

**Concept:** the parable of the sower told as a Vox-style data story. A field plan draws itself like a map. A pictogram sower walks the route and throws four seeds. The camera whips to each landing, and an inset card shows what happens to that seed. A ledger tallies the outcomes, and the good seed's yield is counted in dot grids of thirty, sixty and a hundred.

## References it draws on
- Vox explainers: cards that mask open from a marker, whip-pans, lines that draw on, staggered pops.
- Isotype and Otl Aicher pictograms: circle-head figure, icon badges in place of labels.
- The founder's book pages: Get Up salon prints (two-ink overprint, flat geometry) and Keuken Confessies (iconic single objects on flat ground).
- The fruit-fly film's diagram shots: plan views, callouts, charts inside a narrative.
- The Euangelion print engine from test 04: cobalt, gold and crimson screens on warm paper.

## Shot list (24.5 s loop, re-cut for pace)
| Time | Beat |
| --- | --- |
| 0.0–2.3 | Grid snaps on, the border traces, the four soils wipe in one by one, then rocks pop, thorns spring and furrows rule — each in rapid bursts. |
| 2.3–6.6 | The sower crosses and throws four times. Each throw is three beats: the arc flies, the seed lands in a cracking ring, a tick and a baseline snap under the soil. |
| 6.6–6.9 | The ledger slides in; four badges and four seeds pop on the beat. |
| 6.9–9.35 | **Path card.** The seed drops and bounces in 0.3 s; the crow enters, pecks, leaves with it; a crimson X stamps the empty spot; the ledger row crosses out. |
| 9.6–11.95 | **Rock card.** Roots hit the slab and turn, the sun punches in, heat lines rise, the sprout scorches and folds over. |
| 12.25–14.4 | **Thorn card.** The sprout rises while six thorn canes snap in, one every 0.09 s, and close into a cage. |
| 14.2–19.6 | The three lost fates hold as chips along the bottom while the **good soil card** plays: roots branch, the stalk rises, the ear fills, and dot grids of 30, 60 and 100 count up with a ring snap on each completion and ticks on the ledger bar. |
| 19.65–19.9 | Whip back out to the whole map. |
| 19.95–21.5 | Badges fly up on callouts; a hundred gold dots fill the good soil in a wave. |
| 22.4–23.6 | A cobalt and gold edge sweeps across to empty paper, which is the first frame again. |

## Pace (measured from the beat table)
- **Counted beats:** 77 in 24.5 s = 3.1 per second, median gap 0.26 s.
- **Perceived events** (beats within 0.35 s merged, so a grid of dots filling counts once): 40 = **1.63 per second, median gap 0.55 s**.
- **Longest gap with nothing new: 1.9 s** (the hundred dots finish filling, then the wipe), and the grid drift, camera drift and halftone boil continue underneath.
- Bursts sit where the energy belongs: the four throws, the crow, the scorch, the thorn cage and the three dot grids run at 2–3 events per second.
- Breaths: two landings, each under 2.5 s — after the crow leaves with the seed, and after the hundred lands.

## Site fit
- **Band shapes.**
  - Primary: the 3:1 Daily Bread front band.
  - At 2:1 (phone), the camera zooms, cards, ledger and marker positions recompose.
  - The wheat is sized to each card's height.
- **Runtime.**
  - The loop is seamless: empty paper to empty paper.
  - The page contract matches the other directions: `?capture=1`, `window.__render`, `__loop`, `__ready`.
  - Live bands run at a 30 fps cap and DPR 1.5, pause off screen, and show the summary frame for reduced motion.
- **Content.**
  - No words, letters or numerals anywhere. Thirty, sixty and a hundred are dot counts.
  - No images or data URIs, and no libraries; everything is drawn in code.
- **Performance.** Each frame is drawn on a 2D canvas and printed by one WebGL1 shader. Cost on older phones is UNVERIFIED.

## What changed in the re-cut
- Loop shortened from 26 s to 24.5 s and every phase packed: the map now builds in 2.3 s instead of 2.5, the walk is 4.2 s instead of 5.4, and each fate card runs about 2.3 s instead of 2.5 with its action starting inside 0.3 s.
- Cards are no longer sparse: the seed drops and bounces the moment a card opens, and the fate begins immediately.
- New recap strip: the three lost fates hold as chips along the bottom while the good soil plays, so three fates and the fourth are on screen at once.
- The sower is a chunkier Isotype pictogram (bigger head, wider torso, thick legs) so it reads at speed.
- Constant underlayer: the map grid drifts, the camera keeps a slow push and sway even while holding, and the halftone boils.
- New accents: a tick and a baseline snap under each soil as its seed lands, ring snaps when each dot grid completes, and the ledger's 30/60/100 ticks jump as the bar passes them.

## Honest weaknesses
- **Motion.** It is tidy and explanatory, but not yet as rich as the fly film. Shots are clean diagrams with little texture, and there are no long, lush moments.
- **The sower** is a small stick pictogram: it reads, but it has no charm or exaggeration. The old-school cartoon energy the founder mentioned is absent here.
- **Empty card space.** The card interiors are sparse, and the upper halves sit empty for about a second before the bird or sun arrives.
- **Busy frames.** The wide shots carry a lot of small detail (rocks, thorns, grid) that turns busy at phone width.
- **Faint speed lines.** They are barely visible, so the whip-pans rely on the expo ease alone.
- **Ledger ambiguity.** The crimson X on the sun and thorn rows overprints the seed icon and turns purple, which is legible but a little muddy.
- **Coarse screen on phones.** The halftone dot is fixed at a minimum of 4 px, so at 780 px wide the screen is coarse relative to the fine lines.
