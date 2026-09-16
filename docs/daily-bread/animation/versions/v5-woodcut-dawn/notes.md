# Version 5: Woodcut Dawn

**Concept.** The parable of the sower as a moving relief print, cut on the beat. Carved cobalt night and earth, gold as the only light, crimson only for heat. No people, no images: every frame is drawn by code.

## References it draws on
- Relief-print traditions: linocut and woodcut skies cut in parallel gouges; white-line woodcut, where a paper halo separates a subject from its ground.
- The riso misregistration of the Euangelion anchors, and the fly film's layered ink printing and hard cutting.
- The founder's book references: flat iconic subjects, two or three inks, texture in the ink.

## How it prints
Three blocks, each drawn in code:
- **Cobalt:** the key block — night, earth, crow, briars. Carving it leaves paper.
- **Gold:** the light — seeds, stars and moon, the suns, the grain.
- **Crimson:** heat — the scorching sun and the withered sprout.

A shader prints them on warm paper with uneven ink pickup, wood-grain streaks, paper tooth, ragged boiling edges (on twos, 12 fps) and misregistration. Each beat adds a press shudder: the camera kicks, the zoom punches and the plates slip for about 60 ms. On first play the blocks come down one after another.

Every mark is a tapered gouge: sharp entry, full body, blunt lift-out. The sky is ruled gouges whose width is the tone, with carved halos round the moon, the suns and each subject. Underground the logic inverts: the ink is the ground, so clods and roots are cut back to paper.

## Cut list (24 s loop)
| Time | Shot |
| --- | --- |
| 0.00 | Night sky, moon, stars |
| 1.05 | Wide field, seeds streaking down |
| 2.05 | Close: the seed on the hard path |
| 2.75 | **The crow's eye**, filling the frame |
| 3.40 | The crow gliding in over the light |
| 4.00 | It lands, folds, bobs |
| 4.50 | **The beak takes the seed**, gold flash |
| 5.00 | It flies off with it |
| 5.90 | Rocky ground: the seed drops, stones stamp in |
| 7.10 | The sprout runs up |
| 7.85 | **The scorching sun stamps in** |
| 8.70 | The sprout withers crimson |
| 9.75 | Breath one: the dead sprout, shimmer fading (1.85 s) |
| 11.60 | Thorn ground: a sprout rises |
| 12.40 | **Thorn spikes stamping in**, close |
| 13.00 | Briars climbing |
| 13.90 | The cage closed |
| 14.90 | Underground: the seed falls and splits |
| 15.75 | **A root tip forces a clod apart** |
| 16.45 | The roots spread |
| 17.50 | The shoot climbs to the surface |
| 18.50 | Dawn: the sun clears the hills, the field springs up |
| 19.70 | Close: an ear snapping into gold |
| 20.30 | Three tillers stamp in: thirty, sixty, a hundredfold |
| 21.40 | Breath two: the dawn lands, held to the loop (2.6 s) |

Accents inside shots (a block stamping, a strike, a flood): 1.60, 3.60, 4.60, 6.60, 6.75, 9.30, 13.30, 20.50, 20.80, 21.10, 22.30 (light flare), 23.20 (a flight of birds crosses).

## Measured pace
- 25 cuts + 12 accents = **37 visual events in 24 s = 1.54 per second**.
- **Median gap 0.60 s.** Longest gap **1.85 s** (breath one). Bursts reach 2–3 per second at the crow's strike (2.75–5.00: six events in 2.25 s) and the dawn field (20.30–21.40).
- Two deliberate breaths: the dead sprout (1.85 s) and the dawn (2.6 s to the loop point). Neither is static: the camera pushes, shimmer fades, wheat sways, the glow pulses, the grain boils, birds cross.

## Site fit
- Primary 3:1 front band; 2:1 phone framed tighter, wider at dawn. Same page contract: `?capture=1`, `__render`, `__loop`, `__ready`; 30 fps cap; DPR cap 1.5; reduced motion shows the dawn still.
- Palette: cobalt `#1a4d98`, gold `#efbc3f`, paper `#ebdcb2`, crimson `#ce3442`. No text or numerals, no loaded images, video or data URIs.
- Cost: about 6–18 ms per frame at 1500×500 on an M4 Pro. UNVERIFIED on phones.

## Deliverables
- `index.html`, `preview-3x1.webp` (960×320, 21 fps, 20.1 MB), `still-3x1.jpg`, `still-2x1.jpg`, `sheet.png` (24 frames, one per second).

## Honest weaknesses
- **The landed crow** (4.0–4.5 s) is still the weakest moment. In flight and in the eye close-up it reads as a crow at once; on the ground its lower body sinks into the dark earth.
- **The briars** read as a tangle, but their arches still suggest little dead trees.
- **The sky's bright areas** show regular dashes that can look mechanical rather than hand-cut.
- **Rocks** read as stones with carved hatching, but they are simple polygons.
- **The 15.0–15.7 s underground fall** is quiet against the rest: one seed in a dark field.
- **Craft against the fly film:** the drawing per shot is far less dense. The pace, staging and parable now carry it; the detail does not match.
