# Version 9 — "Patent Drawing"

**Concept.** The parable of the sower drawn as an exploded patent sheet: a machine that
takes one grain of wheat and returns a hundred. The four soils are four numbered test
chambers. No people, no words, no numerals, no images — every frame is computed.

**References.** The fruit-fly film's diagram passages (construction circles, callout
lenses, section hatching, rapid annotation); 19th-century patent and engineering plates
(dimension lines with arrowheads, rivets, gear trains, exploded assemblies with dashed
axes); the Euangelion print engine (cobalt/gold/crimson inks on warm paper, halftone,
misregistration, grain).

**Loop:** 22 s, seamless. The sheet ends where it starts, on the specimen grain.
Measured seam difference between the first and last frame: 7.5/255 mean, which is print
grain only.

## Beats (seconds into the loop)

| t | beat |
|---|---|
| 0.00 | specimen grain on the sheet, dimensions in place (loop point) |
| 0.30–0.95 | dimension lines retract, construction arc sweeps, two callout ticks |
| 1.25–2.10 | magnifier punches in: cross-section, endosperm hatch, embryo, leader; exits |
| 2.40 | whip-pan left to the machine |
| 2.44–3.20 | hopper, gear train, scatter wheel and frame fly in and snap together (impact shudder) |
| 3.50–4.10 | crank turns, gears mesh, grain feeds from hopper to wheel, wheel spins up |
| 4.35–4.55 | four dotted trajectories draw on; camera pulls out to the whole sheet |
| 4.85 | four grains launch along the arcs |
| 5.35 | whip to chamber I — the path |
| 5.60–6.25 | grain lands, bounces twice; beak linkage swings in and snaps shut |
| 6.55–7.15 | beak lifts the grain away; crimson reject stamp; reject ticks |
| 7.95 | whip to chamber II — rocky ground |
| 8.55–9.10 | grain lands; sprout telescopes up in three stages |
| 9.40–10.00 | heat lamp swings in, filament glows, heat rays pulse |
| 10.55–11.00 | sprout wilts crimson; reject stamp |
| 11.30 | whip to chamber III — thorns |
| 11.28–11.85 | grain lands, sprouts; spring jaws draw in on their rail |
| 12.15–12.85 | jaws advance, press, crush (impact burst) |
| 13.15–13.50 | reject stamp; jaws recoil |
| 13.95 | whip to chamber IIII — good soil |
| 14.00–14.30 | grain splits; roots branch downward, drawn on in order |
| 15.05–15.60 | shoot rises; two leaf pairs unfurl |
| 15.85–16.85 | ear forms, seven grains pop in, then turn gold |
| 17.10–17.70 | chute draws on; grain pours; counter fills, first tick cluster |
| 18.10 | pull back to the whole sheet |
| 18.45–18.95 | second and third tick clusters (thirty, sixty, a hundred) |
| 19.35–20.40 | harvest returns to the hopper along a dashed path; sheet dimension sweep; magnifier sweeps across |
| 20.80–21.15 | the sheet explodes along dashed axes, then the specimen grain re-forms |

## Pace (measured against the founder's brief)

- **Scheduled beats:** 51 → **2.3 events per second**.
- **Including staggered sub-events** (root branches, ear grains, trajectory draw-ons,
  sprout segments): 78 → 3.5 per second.
- **Median gap between beats:** 0.30 s. **Longest gap:** 0.80 s — so the hard rule
  (never ~2 s without a change) holds with margin.
- **Hard cuts:** only 6 whip-pans in 22 s. The rest of the energy is inside the frame —
  gears turning, grain trickling, hatching, lamp pulsing, lines drawing on — so the
  diagram stays readable at speed.
- Nothing is ever fully static: the gear train turns from 3.5 s, hopper grain trickles
  throughout, the camera breathes on a loop-length cycle.

## Site fit

- WebGL1 + Canvas2D through the shared print engine; one fragment shader; no images,
  no libraries, nothing fetched.
- Composes at 3:1 (front band) and 2:1 (phone) — the layout is aspect-aware: chamber
  detail zoom and the wide shot both derive from the band's aspect.
- 30 fps cap, DPR cap 1.5, reduced motion shows a still frame (the wide sheet).
- Palette: cobalt #1a4d98, gold #efbc3f, crimson #ce3442 on paper #ebdcb2.

## Honest weaknesses

- **Detail per shot is still below the fruit-fly bar.** Its close-ups carry hundreds of
  strokes; the busiest chamber here has a few dozen.
- **The rocky chamber's stones** read as flat angular plates rather than rounded rocks.
- **The thorn chamber** is the weakest beat: the spring jaws read as machinery more than
  as thorns, so the parable's meaning leans on the sequence rather than the image.
- **The machine assembly (2.4–3.2 s)** is the sparsest passage: four parts fly in, but
  the frame is emptier there than anywhere else in the loop.
- **Phone performance is UNVERIFIED** — timed only on an M4 Pro; every frame redraws the
  whole plate in Canvas2D, which is heavier than the shader-only versions.
