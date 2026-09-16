# Version 2 — Seed Cards (re-cut for pace)

**Concept.** The parable of the sower dealt as a hand of riso-printed cards, cut fast: the row deals, the sack throws, and the film punches in on one card at a time, then recaps the four soils in a rapid montage before the hand is gathered and dealt again.

**References.**
- Keuken Confessies and Franke Elshout cards (the founder's book photo): flat geometric icons, speckled riso ink, overprint colour, calm cream space, one idea per card, strong coloured ground.
- Get Up (same book): chunky two-ink print texture and misregistration.
- The Opus 5 fly and riso films: cutting rate, scale punches, iris and whip transitions, personality in small moments.

**Print.** Three inks (cobalt, gold, crimson) as flat riso fills. The shader adds stochastic grain in mid tones, speckle voids in solids, uneven density, roller streaks, wobbly edges and misregistration that drifts through the loop. Overlaps overprint: gold + cobalt = green, gold + crimson = orange, crimson + cobalt = purple. The cards are bare paper on a solid cobalt table, with crimson shadows that print purple. Nothing is loaded; every frame is drawn by code.

## The cut — 22 s loop

Measured from the beat list below (staggered accents inside 0.25 s counted as one event):

- **36 major events, 1.64 per second.**
- **Median gap 0.55 s**, mean 0.54 s.
- **Longest hold 1.55 s** (the hundredfold landing), second 1.3 s (the final tableau). Nothing else sits longer than ~0.9 s.
- **18 extra micro accents** inside frames (individual thorns, heat waves, dust, single flips, staggered deals).
- Bursts of 2–3 events per second at the throw, the bird's peck and gulp, the wilt, the four thorns and the three waves of seed.
- Nothing is ever fully static: the ink speckle boils at 8 fps, cards breathe and jitter, dust drifts over the table, and every beat gives the focused card a scale punch.

| Time | Beat |
| --- | --- |
| 0.00–0.64 | Five cards drop in on their own beats, spinning, with a bouncy landing. |
| 1.05 | The sack crouches back: wind-up, with crimson tension marks. |
| 1.35 | **Throw.** A swoosh leaves the mouth and a spray of seed crosses the whole band. |
| 1.75–2.35 | Four seeds land, one per soil card, each with a hop. |
| 2.70 | Punch in on the path; the neighbours stay cropped at the edges. |
| 3.00–4.05 | The bird whips in, cocks its head, pecks, gulps, wiggles, flies out. A feather flicks loose. |
| 4.50 | Iris to the rocks. |
| 4.90–5.95 | Sprout pops, the sun slams down and shakes the stones, heat waves, the sprout wilts over, dust puff. |
| 6.50 | Whip to the thorns. |
| 6.85–7.95 | Sprout pops; four thorn vines whip in on consecutive beats; the sprout is choked out. |
| 8.60 | Iris to good soil. |
| 9.05–10.05 | Roots spread, the stem shoots up, leaves pop in pairs, the ear stacks up. |
| 10.55 / 10.90 / 11.25 | **Thirty. Sixty. A hundred.** Three waves of specks burst out. |
| 11.25–12.80 | Landing hold (1.55 s): the burst twinkles and breathes. |
| 12.80 | Pull back to all five. |
| 13.40 | The harvest sweeps back across the band. |
| 14.00 | The sack plumps up again. |
| 14.60–15.08 | The cards flip to their seed-pattern backs, staggered. |
| 15.35 / 15.65 | Fan, then stack. |
| 16.05 / 16.65 / 17.25 / 17.85 | **Recap montage.** Iris to each soil in turn, each replayed at 2.6–2.8× speed. |
| 18.95 | Pull back to all five, in their final states. |
| 19.35 | Seed rain over the table. |
| 19.85 | The faces turn back. |
| 19.85–21.15 | Landing hold (1.3 s): the finished tableau. |
| 21.15 | The cards lift away, staggered. |
| 21.60 | One seed drops in the middle for the next hand. |

**2:1 (phone).** The same 22 s cut, one timeline. The row becomes five smaller cards with real gaps and a slight fan; the solo punch-ins and the montage carry the story, so nothing is lost at phone width.

## Fit for the site

- 3:1 Daily Bread front band, recomposed for 2:1.
- 30 fps cap, DPR cap 1.5, pauses when off screen. Reduced motion shows the hundredfold frame.
- No words, letters or numerals in the image.
- Every frame drawn by code: no images, video or data URIs.

## What changed in the re-cut

- Loop 26 s → **22 s**, and the whole film was rebuilt on a beat clock instead of one long hand.
- Added solo punch-ins, an iris transition, a fan and stack, and a fast recap montage; cards now swap, flip and restack throughout.
- The throw now has a proper wind-up (crouch, tension marks) and a spray that crosses the entire band.
- Card faces run on the film's clock with a speed factor, so each soil can replay at 2.6–2.8× in the montage.
- Neighbour cards stay cropped in shot during solos, so the wide band never empties.
- Constant micro-motion: table dust, card breath and jitter, beat punches.
- The phone row went from a cramped strip to five cards with real gaps.

## Honest weaknesses

- **The rocky-ground beat is the weakest.** Sprout, sun, wilt and dust all land inside 1.1 s, and at speed the wilt reads as a brown smear rather than a plant giving up.
- The sack still has to carry "sower" alone; with no figure, a first-time viewer may read it as a bag of grain rather than someone sowing.
- Seed crossing the cobalt table prints green, not gold — correct overprint, but it loses the gold seed read at small sizes.
- The recap montage repeats drawings the viewer has just seen; it adds pace but no new information.
- The drawing is simpler than the fly film's. Charm comes from motion and print texture, not from illustrated depth.
- Phone performance still unmeasured; two canvases are uploaded per frame and it was only run on an M4 Mac.
