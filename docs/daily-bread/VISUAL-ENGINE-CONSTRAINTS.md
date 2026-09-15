# Daily Bread V2 — visual-language audit and engine constraints (plan §44)

SA-142 / F-184. Written 2026-09-14 from measurements, not impressions. The plan asks for this
audit before shader work: "Procedural artwork must match Euangelion's established site
imagery to a meaningful degree. ASCII must never become a cheap terminal gimmick."

**Method.**
- The four founder-approved style anchors were measured pixel by pixel (sharp, full
  1024×1024 masters): `public/images/site/series/{prayer-of-jabez,he-cannot-deny-himself,looking-at-the-sun,the-harvest}.webp`.
- The same measurements were run on 16 more series heroes and on the engine's current
  static posters, rendered from `scenePosterSvg` at seed 4242.
- The measuring scripts live outside the repo; the numbers are recorded here.

Pixel classes:
- **ink:** blue-dominant pixels;
- **paper:** light, non-blue pixels;
- **warm spot:** saturated orange or gold;
- **red:** saturated red;
- **neutral:** low-saturation mid-tones.

The screen period is the first autocorrelation peak of luminance along the middle rows.
"Flat cells" is the share of 24px cells in the top 35% of the image that are uniformly
light or dark: a measure of negative space.

## 1. What the anchors are

| Anchor | Ink | Paper | Warm spot | Red | Neutral | Solid ink | Paper tone | Spot tone | Screen | Flat top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Prayer of Jabez | 44.8% | 39.9% | 0.0% | 0.0% | 8.2% | `#1b4da4` | `#ecdab3` | (hairline red edge only) | 4px | 64% |
| He Cannot Deny Himself | 25.2% | 49.3% | 1.0% | 0.0% | 12.0% | `#285898` | `#e4d8bb` | `#f1b534` | 4px | 95% |
| Looking at the Sun | 82.5% | 10.2% | 0.0%* | 0.0% | 2.8% | `#103989` | `#e3d5bb` | `#efbf27` | 4px | 100% |
| The Harvest | 29.7% | 47.4% | 5.3% | 0.0% | 4.1% | `#17579a` | `#eedca6` | `#e8c162` | 4px | 88% |

\* A single sunburst: too small to register as area, clearly visible.

What they show, in plain terms:
- **Prayer of Jabez:** a kneeling figure in an empty plain reaching up toward an enormous
  hand coming out of cloud. The hand has a thin red misregistration edge.
- **He Cannot Deny Himself:** a lone walker on a worn path through grass toward a gold sun
  on a high horizon.
- **Looking at the Sun:** a robed figure seated on rock, back to us, watching a small
  sunburst on a night horizon.
- **The Harvest:** a sower walking away from us down furrows toward a huge gold sun, with
  rays in the screen.

**Across 20 series heroes:**
- The screen period is 3–9px at 1024px, 4px in most.
- Ink coverage runs from 5.5% to 83.4%.
- A warm spot is present in 16 of the 20 (0.1–8.6% of the area).
- Red area is 0.0–0.1% in all 20.

## 2. Constraints for procedural art

Each constraint is measurable. The numbers are the anchors' ranges.

| # | Dimension | Constraint |
| --- | --- | --- |
| C1 | Palette: ink | One cobalt ink near `#1a4d98` (anchor range `#103989`–`#285898`). Not violet-navy. |
| C2 | Palette: paper | Warm cream near `#e8d9b4` (range `#e3d5bb`–`#eedca6`). Not white, not cool grey-cream. |
| C3 | Spot colour | A gold light source near `#efbc3f` (range `#e8c162`–`#f1b534`), at most about 9% of the area, used only for the sun, glow or light. Crimson appears only as a hairline misregistration edge, never as a scatter of dots. See §4 for the conflict with the older style note. |
| C4 | Screen | A fine halftone of about 1 dot per 4px at 1024px: at least 200 dots across the image width. Tone is dot density; there are no flat grey fills. |
| C5 | Grain and texture | Paper grain and ink-density variation read as 3–12% neutral pixels, with slight misregistration. A perfectly clean vector dot grid is off-brand. |
| C6 | Contrast | Light-dominant (10–50% ink) or night-dominant (up to about 83% ink) compositions are both on-brand. A mid-grey average is not. |
| C7 | Edge softness | Forms are modelled by soft tonal gradients through the screen (mean local gradient 20–28 at 1024px). Edges come from dot density, not outlines. |
| C8 | Composition | A horizon (placed anywhere from about 20% to 75% of the height), one small subject or none, and a light source. |
| C9 | Negative space | The upper third is mostly calm: 64–100% flat cells. Sky, glow or night carries the silence. |
| C10 | Symbolism | Light arriving over an open landscape: sun, glow, path, field, sky, desert, water. A figure, when present, is small, faces the light, and is never the centre of a crowd. |
| C11 | Illustration style | Naturalistic scenes printed as two-colour riso halftone. Not flat vector geometry, not line art, not a terminal glyph field. |
| C12 | Typography and image | No text in the image. Type sits outside the plate: the image is a full-bleed band between text bands, and a scene never sits under running type. |
| C13 | ASCII | Only as a print texture that meets C1–C11 (glyphs as a halftone screen). Never visible `*`, `:` and `.` characters on a flat ground. |

## 3. Measured against the engine today (2026-09-14)

| Poster | Ink | Paper | Spot | Red | Solid ink | Paper tone | Screen | Flat top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| living-water | 28.3% | 69.9% | 0.0% | 0.2% | `#242e8f` | `#f4ede3` | 15px (68 across) | 91% |
| grain | 32.7% | 65.2% | 0.0% | 0.2% | `#242e8f` | `#f4ede3` | 15px (68 across) | 65% |
| wilderness-stars | 66.4% | 31.3% | 0.0% | 0.3% | `#222c8e` | `#f3ece2` | 15px (68 across) | 14% |

| Constraint | Result |
| --- | --- |
| C1 ink | **Fails.** `#242e8f` is violet-navy, bluer and darker than every anchor. `SCENE_PALETTE.light.ink` is `#1f2a8d`. |
| C2 paper | **Fails.** `#f4ede3` is cooler and lighter than every anchor. |
| C3 spot | **Fails.** Crimson dots are scattered through the field (80–89 per poster), and there is no gold light source. |
| C4 screen | **Fails.** A 15px period gives 68 dots across, 3.75× coarser than the anchors. |
| C5 grain | **Fails.** A clean vector grid: 1.2–1.5% neutral pixels against the anchors' 3–12%. |
| C7 edges | Passes. Local gradient 19.5–25.3. |
| C8–C10 composition | **Fails.** No horizon, subject or light source: an abstract dot field. wilderness-stars' top third is 14% calm against the anchors' 64–100%. |
| C11 style | **Fails.** Flat dot geometry, not a printed scene. |
| C13 ASCII | **Fails.** The live ASCII renderer draws visible `*`, `:`, `.` and `+` glyphs on a flat ground. This was seen on the broadsheet fixture in a local screenshot on 2026-09-14. |

This matches the founder's verdict: "The shader animations are not great."

## 4. Open decisions (the founder's)

1. **Scene direction.** Pitch `daily-bread-scenes-a-vs-b` shows two options:
   - (A) the procedural engine rebuilt toward these constraints;
   - (B) the series riso art with gentle motion.

   No verdict is recorded yet. The engine work in plan §47–53 follows whichever option is
   chosen. These constraints apply to both.
2. **Spot colour.** CLAUDE.md's image style note (2026-05-13) names crimson as the one
   spot colour. The founder-approved anchors, required on every generation since
   2026-08-16, use gold light and crimson only as a hairline. The Echo & Dust canon
   keeps crimson for the heart only. This audit follows the anchors for procedural art
   and flags the difference rather than choosing.

## 5. Other art already in the paper

| Set | What it is | Register |
| --- | --- | --- |
| Series heroes (42, `public/images/site/series/`) | Codex riso halftone plates; four are the style anchors | This audit |
| Daily lead plates (`pipeline/lead-art.json`) | Generated per date through the Codex pipeline in the house style | Must meet C1–C12 |
| Gallery prints (291 files, 145 audited clean) | Reproductions of historic works (Aivazovsky, Allston…) with Vasari captions | Deliberately a different register: an arts column |
| Echo & Dust (`content/strip-reference/ECHO-AND-DUST-CANON.md`) | Riso cobalt on cream, crimson only for Echo's heart | Its own canon |
| Scene posters and renderers (`src/lib/daily-bread/visual/`) | Procedural | Fails today (§3) |
