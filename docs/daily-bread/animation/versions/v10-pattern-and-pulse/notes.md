# Version 10 — Pattern and Pulse

**Concept.** The picture is made of the print's own dot screen. A field of cobalt dots
and stripes swarms, locks into a formation — seed, bird, rocks, seedling, sun, briars,
wheat ear — then dissolves back into pattern. Op-art, rhythmic, and abstract until the
instant a formation snaps into focus.

**References.** The fruit-fly film's cutting rhythm and diagram beats; the riso film's
three-drum ink separations and reversals; op-art (Bridget Riley) for the moiré and
density waves.

## How it reads (the parable, Matthew 13:3–8)

| Time | Beat |
| --- | --- |
| 0.0–3.4 | The field rules itself, bends into furrows, a gold seed locks in the centre, then five arcs of seed are flung across the band. |
| 3.4–7.0 | **The path.** A hard cobalt band snaps in, a seed lands on it, a bird swoops in, lunges, and the frame reverses for one flash as the seed is gone. The swarm blows away. |
| 7.0–10.6 | **Rocky ground.** Angular rocks stamp in, a green seedling rises between them, a gold-and-crimson sun blooms, heat shimmers in moiré, and the seedling shrivels to purple and scatters. |
| 10.6–13.8 | **Thorns.** Briars stab in from both sides in two strikes, arch over the plant and close; the frame reverses on the squeeze; the plant collapses. |
| 13.8–17.8 | **Good soil.** Furrows bend open, a seed drops, root rings pulse outward, a shoot rises, and a gold wheat ear forms and holds — the one breath in the loop. |
| 17.8–20.6 | **A hundredfold.** Grains pop in exact grids: thirty, then sixty, then a hundred, with a density wave sweeping through, then everything collapses back into one seed. |
| 20.6–22.0 | The seed dissolves into the field, which returns to the opening frame. |

## Pace (measured)

- 45 visual events in a 22 s loop = **2.05 events per second**.
- **Median gap 0.50 s**; longest gap 1.25 s (the wheat ear breath).
- Bursts of 3 events inside 0.55 s at the two peaks: the bird's snatch (5.20 / 5.45 /
  5.75) and the grain multiplication (17.90 / 18.30 / 18.75).
- Only two full-frame reversals in the loop (0.12 s each), so it pulses rather than
  strobes. Checked in rendered frames, not just in theory.

Beat times are in `beats.json`.

## Site fit

- 3:1 front band and 2:1 phone band, both checked in rendered frames.
- One WebGL1 fragment shader; no images, no canvas art, nothing loaded.
- Cobalt, gold and crimson on warm paper, each drum at its own misregistration, with
  ink density and paper grain.
- Page contract: `?capture=1&w=&aspect=` exposes `__render(t)`, `__loop`, `__ready`;
  30 fps cap, DPR cap 1.5, reduced motion holds a still at the wheat ear.
- No words, letters or numerals anywhere.

## Honest weaknesses

- **The wide band is often sparse.** At 3:1 a single formation leaves large fields of
  stripes either side. It is composed for it, but the fly film fills its frame far more.
- **The collapse at 20.4** is a soft gold blob rather than a crisp gathering of grains.
- **The sun reads as a cog** more than a sun; its spikes are even and mechanical.
- **Abstraction costs clarity.** The bird, rocks, briars, ear and grains read; the
  seedling reads as an arrow more than a plant, and a first-time viewer may take a
  beat to see the story rather than the pattern.
- **Phone performance is unmeasured** (UNVERIFIED): checked only on an M4 Pro. The
  shader evaluates the field three times per pixel, once per ink.
