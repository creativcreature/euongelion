# Version 8 — "Glass and Gold"

**Concept.** The parable told as an illuminated page: a leaded window drawn on cream
paper, four lancet panels for the four soils and a rose medallion for the hundredfold.
Light crosses the window and ignites it pane by pane.

**References.** Gothic stained glass (lancets, rose window, lead cames, glass streaks and
bubbles) and illuminated manuscript ornament (gold vine border, knot medallion). Pace and
cutting from the founder's fruit fly and riso reference films. Print engine from test 04.

## Shot list / beats (loop = 22 s, seamless)

| Time | Beat |
| --- | --- |
| 0.00 | window dark, tracery only |
| 0.35 | medallion ignites at the heart of the rose |
| 0.62 | eight rose petals ignite, staggered |
| 1.22 | twelve outer panes ignite, staggered |
| 1.70 | four seeds fly out of the rose to the four panels |
| 2.15 | CUT: the path panel |
| 2.55 | seed lands and bounces on the beaten path |
| 2.95 | CUT closer: a bird sweeps in |
| 3.50 | the bird takes the seed |
| 3.85 | it leaves with it |
| 4.25 | CUT: rocky ground |
| 4.50 | seed lands |
| 4.80 | a sprout rises |
| 5.25 | PUSH: the sun ignites, rays out |
| 5.70 | heat: the sky reddens pane by pane |
| 6.10 | the sprout wilts |
| 6.55 | the glass cracks |
| 6.95 | CUT: thorns |
| 7.20 | seed |
| 7.45 | sprout rises |
| 7.85 | brambles creep in from both edges (8 vines, staggered) |
| 8.75 | PUSH: the thorns close over it |
| 9.15 | the sprout goes dark |
| 9.50 | CUT: wide — three panels spent |
| 10.05 | CUT: good soil |
| 10.30 | the seed falls in |
| 10.65 | roots branch (6, staggered) |
| 11.35 | PUSH: the shoot rises |
| 11.85 | leaves unfurl (3, staggered) |
| 12.50 | PUSH: the ear forms |
| 13.15 | the ear turns gold |
| 13.75 | PULL: wide |
| 14.15 | grain wave 1 |
| 14.95 | grain wave 2 |
| 15.75 | grain wave 3 |
| 16.35 | PUSH into the rose |
| 16.60 | the rose fills with grain |
| 17.20 | all four panels ignite, staggered |
| 17.65 | the gold vine border grows along the page |
| 18.40 | PULL: wide — the whole window holds (the one breath) |
| 20.00 | the light withdraws, panels dim in sequence |
| 20.72 | the rose dims |
| 21.50 | dark again — loop |

## Measured pace

- **43 beats in 22 s = 1.95 events per second** (staggered ignitions inside a beat push the
  instantaneous rate to 3–8/s during the rose, the brambles and the roots).
- **Median gap 0.45 s**, mean 0.51 s.
- **Longest gap 1.60 s**: the deliberate hold on the full window at 18.4–20.0. Nothing else
  exceeds 0.9 s, and the travelling light and glass grain mean no frame is static.
- No strobing: changes are ignitions, growth, camera pushes and the light sweep — not flashes.

## How it fits the site

- Composes at 3:1 (front band) and 2:1 (phone); the layout scales its lancet spacing,
  panel width and rose radius from the aspect, so all five elements fit either band.
- Standard page contract: `?capture=1&w=&aspect=` exposes `__render(t)`, `__loop`, `__ready`;
  live page caps 30 fps and DPR 1.5, and reduced motion holds a still at t = 18.9.
- Palette is the Euangelion inks only — cobalt, gold, crimson on warm paper. Cames are cobalt
  over crimson so they print near black. No words, letters or numerals.
- No images, video or data URIs: every frame is drawn by code and printed through the
  halftone/misregistration/grain shader (finer screen than test 04, plus glass streaks,
  bubbles and a small backlit bloom).

## Honest weaknesses

- **Detail per shot is still below the fly film.** Panels are mosaics of flat glass with a few
  icons; the reference packs far more line work and texture into every frame.
- **The first two seconds are sparse** — a dark window with only the rose igniting. It earns the
  build, but it is the emptiest moment in the loop.
- **The bird is the weakest drawing.** It reads as a bird in motion, but the body is a single
  pane and the head/beak junction is crude at the closest framing.
- **Thorn panel is muddy** at wide framing: purple bramble panes against purple ground do not
  separate as well as the other three panels.
- **Phone performance UNVERIFIED.** Checked only on an M4 Pro; each frame draws ~200 leaded
  panes, which is heavier than the earlier tests.

## Files

`index.html` · `preview-3x1.webp` (960×320, 24 fps, 11.6 MB) · `still-3x1.jpg` ·
`still-2x1.jpg` · `sheet.png` · review sheets `sheet-r1…r5.png` · `beats.json`
