# Daily Bread motion: how these animations were made

SA-142 / F-184 · written 2026-09-15 for the next session, on any account.

Everything here was made in one session for the founder. It is written so another
session can carry on without rediscovering the method. Read this file first, then
`versions/<name>/notes.md` for the piece you are working on.

---

## 1. What exists right now

**The pitch the founder responds on** (one page, ten directions):
`https://euangelion.app/admin/pitches/daily-bread-sower-five-directions`
Check for his verdict there before asking him again. Responses live in the private
`pitches` bucket at `responses/daily-bread-sower-five-directions.json`.

**Ten finished style tests**, all telling the parable of the sower (Matthew 13:3–8):

| # | Folder | Style | Loop | Pace |
| --- | --- | --- | --- | --- |
| 1 | `versions/v1-specimen` | Natural-history specimen plate | 24 s | 2.1 changes/s |
| 2 | `versions/v2-seed-cards` | Riso icon cards (Keuken Confessies) | 22 s | 1.6 |
| 3 | `versions/v3-explainer` | Vox-style kinetic map | 24.5 s | 1.6 |
| 4 | `versions/v4-cartoon-sower` | Mid-century cartoon (Get Up cards) | 22 s | 2.7 events/s |
| 5 | `versions/v5-woodcut-dawn` | Moving linocut | 24 s | 1.5 |
| 6 | `versions/v6-paper-theatre` | Cut-paper stop motion | 22 s | 2.4 events/s |
| 7 | `versions/v7-title-sequence` | Saul Bass title cards | 22 s | 1.7 cuts/s |
| 8 | `versions/v8-glass-and-gold` | Stained glass / illumination | 22 s | 2.0 |
| 9 | `versions/v9-patent-drawing` | Exploded patent diagram | 22 s | 2.3 |
| 10 | `versions/v10-pattern-and-pulse` | Op-art halftone kinetics | 22 s | 2.1 |

**Two earlier tests**, kept because they are the two working methods in their
simplest form: `tools/04-life-of-a-seed.html` (drawn from nothing) and
`tools/05-seed-from-site-art.html` (the site's own art, reprinted and animated —
the founder called this one "waaaaaay better").

**Rendered previews** are NOT in the repo (they are 5–21 MB each). They are public at
`<SUPABASE_URL>/storage/v1/object/public/edition-assets/pitch-media/daily-bread-sower-five-directions/<version>-preview-3x1.webp`
plus `-still-3x1.jpg` and `-still-2x1.jpg`. Re-render them from source any time.

Nothing is in the site. No deploy has happened. Phone performance is UNVERIFIED for
all ten: everything was checked on an M4 Pro Mac only.

---

## 2. The two methods

**Method A — drawn from nothing.** Every shape is code. Used for versions 1–10.
Strength: total control, no assets, any style. Weakness: anything requiring a
lifelike human fails badly (see §8).

**Method B — the site's own art, reprinted and animated.** Load an existing plate from
`public/images/site/series/*.webp`, split it back into its cobalt and gold inks, then
re-screen it live through the same print engine and animate it with camera moves,
growth reveals and code-drawn particles. Used for `tools/05-seed-from-site-art.html`.
Strength: the founder's illustrators' quality, instantly. Weakness: loads images, so it
costs bandwidth, and it animates what exists rather than inventing shots.

They combine. The engine is identical; only the source of the tone plates differs.

---

## 3. The print engine

Every version paints two canvases per frame, then a WebGL1 shader prints them.

- **TONE plate** — `r` = cobalt coverage, `g` = gold, `b` = crimson. Screened as AM
  halftone, each ink on its own angle (15°, 75°, 45°).
- **LINE plate** — same three channels, but printed solid, not screened. This is the
  engraving: contours, hatching, ruled lines. Draw it with `globalCompositeOperation
  = 'lighter'` so inks add independently.
- **Paper** — cream `#ebdcb2`, with grain, ink-density variation and speckle voids.
- **Inks** — cobalt `#1a4d98`, gold `#efbc3f`, crimson `#ce3442`. They MULTIPLY like a
  real riso: cobalt over gold gives green, gold over crimson orange, cobalt over
  crimson purple. That is where colour range comes from without leaving the palette.
- **Misregistration** — each plate samples at a slightly different offset, and a
  "print-in" springs the cobalt plate into register over the first second.

`tools/engine-utils.js` holds the reusable parts: the `Plates` class (tone + line
canvases, a stage camera, `fill` / `add` / `line` / `dot`), `ribbon()` for
variable-width strokes, easing helpers, seeded RNG, and path helpers. Copy it into a
new version's folder rather than importing across folders.

**Occlusion rule:** when you fill a shape on the tone plate, fill the same path in
black on the line plate first. Otherwise line work from parts behind shows through
solid bodies. This was a real bug, and the drawings looked like x-rays until it was
fixed.

---

## 4. The page contract

Every version is one standalone HTML file that works two ways.

- **Normal:** shows a 3:1 band and a 2:1 phone band, capped at 30 fps and DPR 1.5, and
  shows a still when the reader prefers reduced motion.
- **Capture:** `?capture=1&w=1500&aspect=3` renders a single canvas at that exact size
  and exposes `window.__render(t)`, `window.__loop` (seconds) and `window.__ready`.

Keep that contract. Every tool below depends on it.

---

## 5. Tools and exact commands

Sources live in `tools/`. They expect to run from a version folder.

```bash
# stills at chosen times
node ../../capture.mjs index.html out --w=1500 --aspect=3 --times=2,6,10,14

# every frame of the loop
node ../../capture.mjs index.html out/loop --w=1500 --aspect=3 --fps=24 --from=0 --to=22

# encode: ffmpeg comes from imageio-ffmpeg, path cached here
FF=$(cat ../../../anim-research/ffpath)

# a video to watch locally
"$FF" -y -framerate 24 -i out/loop/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 loop.mp4

# the animated WebP the pitch page needs (see §7 for why not video)
"$FF" -y -framerate 24 -i out/loop/f%04d.png -vf "scale=960:320:flags=area" \
  -c:v libwebp_anim -quality 50 -compression_level 4 -loop 0 preview-3x1.webp

# contact sheet to actually look at
"$FF" -y -i loop.mp4 -vf "select='not(mod(n\,36))',scale=500:-1,tile=4x7" -frames:v 1 sheet.png
```

`capture.mjs` launches headless Chromium from `playwright-core` in the daily-bread-v2
worktree, with `--use-angle=metal` (real GPU) and `--allow-file-access-from-files`
(needed by Method B, or `getImageData` throws a security error on `file://` pages).

`sharp` for stills and sheets:
`/Users/jamesparker/Documents/app-projects/external/euangelion/.claude/worktrees/daily-bread-v2/node_modules/sharp`.
Pass `{ animated: true, limitInputPixels: false }` to inspect an animated WebP, or it
refuses the tall frame stack.

---

## 6. Pace: the thing the founder cared most about

He rejected the first five as "too slow". Measure, do not guess. Detect cuts in any
reference film:

```bash
"$FF" -i reference.mp4 -filter:v "select='gt(scene,0.28)',metadata=print:file=-" -an -f null - \
  | grep -o "pts_time:[0-9.]*"
```

Measured from his two references:

| Film | Changes | Median gap | Mean gap |
| --- | --- | --- | --- |
| Fruit fly (Opus 5) | 64 in 27 s | 0.29 s | 0.71 s |
| Riso piece (Opus 5) | 81 in 28 s | 0.21 s | 0.45 s |
| My first attempts | every 4–6 s | — | — |

**His final instruction:** "The pace doesn't need to be 1:1 - but more dynamic more
intense and faster for sure." The target that satisfied him:

- about 1 to 1.5 visual events per second on average;
- bursts of 2–3 per second at the peaks (a throw, a strike, a scorch, a harvest);
- at most two deliberate breaths per loop, each ≤ 2.5 s, for the emotional landings;
- never more than about 2 s with nothing changing;
- nothing fully static: texture boil, drifting motes, breathing scale;
- every beat must read in about 0.3 s. If it cannot, simplify the drawing rather than
  slow the cut.

"Event" counts a cut, a snap camera move, an element entering, a transformation, a
mask wipe or a scale punch. Put the beat list and the measured median gap in
`notes.md` — every version has one, so compare against those.

---

## 7. Publishing to the pitch site

```bash
cd /Users/jamesparker/Documents/app-projects/external/euangelion
bash <scratchpad>/db2/withenv.sh scripts/pitches/publish-pitch.mjs body.html \
  --title="..." --slug=daily-bread-sower-five-directions --tags=daily-bread,scenes,animation --session=scene-tests
```

Re-publishing the same slug replaces the page. One page per idea, forever.

Media goes to the public `edition-assets` bucket under
`pitch-media/<slug>/<version>-<file>`; `tools/upload-media.mjs` does the whole folder
and verifies each file is served. Two hard constraints learned here:

1. **The site's security policy blocks video from storage** (`media-src 'self' blob:
   data:`), but allows images from any HTTPS host. So previews must be **animated
   WebP**, not mp4. Keep each under about 22 MB; drop to 20 fps if needed.
2. **Uploads sometimes fail with a network error.** Always verify afterwards by
   fetching each URL and comparing `content-length` to the local file size, and
   re-upload what does not match. Six of thirty-one failed the first time in this
   session.

The pitch page renders HTML but **does not run scripts**, so a live canvas cannot play
there. Interactive work belongs in a real admin route under `/admin/lab/<experiment>`,
which needs a deploy — and deploys are on hold.

---

## 8. What was learned the hard way

**Art direction**

- **Never freehand a human in code.** Four rebuilds of a realistic sower were all
  rejected ("Not a fan of the man at all"). Faces, hands and drapery must come from
  the site's art, or the figure must be frankly geometric/cartoon, which he liked.
- **The fly film avoids the hard subject.** Its close-ups are insects, cells, wood
  grain and peel: subjects code draws well. Choose subjects that suit the method.
- **Realism at halftone scale comes from silhouette and motion,** not interior detail.
  Detail below about 3 dots wide disappears.
- **A thin paper-coloured edge** around a character stops it sinking into a dark
  background, and reads as backlight against the sun. Cheap, and it works.
- He disliked the code-drawn seeds (flat ovals with outlines). Match the texture of
  the surrounding art instead of drawing clip-art shapes.

**Technical traps**

- **Inverted halftone.** `smoothstep(a, b, x)` with `a > b` is undefined in GLSL. The
  first render came out as a photographic negative. Write `smoothstep(spot - aa, spot
  + aa, k)`, and multiply by `smoothstep(0., .03, k)` or blank paper grows dots.
- **`cast` is a reserved word** in GLSL ES. So is `sample`. Rename.
- **Float32 in a shortest-path search loops forever.** Rounding makes a node look
  improvable on every pass. Use `Float64Array` for distances. This hung a page for
  minutes with no error.
- **Row/stripe patterns beat against the dot screen** and shimmer. Fade any ruled
  pattern out once its period drops below about three dot cells.
- **Cache keys must exclude position.** A torn-paper edge cache keyed without position
  froze every moving piece where it was first drawn.
- **A seeded hash must spread.** `fract(sin(seed * k) * big)` clustered every test day
  onto the same layout; `fract(seed * 0.6180339887)` (golden ratio) spreads whole
  numbers evenly.
- Animated WebP encoding of ~900 frames takes minutes. Run it in the background.

**Working method that produced these**

Ten versions were built by ten parallel agents, one per style, each given: the style
brief, the shared rules (message, palette, band sizes, no words, no images), the page
contract, its own folder, and a demand for at least three review rounds. The rule that
mattered most: **render a contact sheet, LOOK at it, fix what is wrong, repeat** — and
report the weakest moment honestly. Every version's `notes.md` names its own weakest
moment. Two agents died on connection errors mid-run and were resumed from their own
transcripts with a short recap; no work was lost.

---

## 9. House rules that apply to this work

- Pitches go to the pitch site, never to chat or artifacts.
- Claude Code cannot generate imagery for this project. New stills come from the
  founder's Codex pipeline in the house style; this engine then animates them.
- Check the image library before making anything new: `docs/image-library-catalog-2026-05-08.json`,
  with files under `design-sources/image-library/` and `public/images/site/series/`.
- Palette: cobalt, cream and gold are the anchors' measured colours. Crimson as a third
  ink is still the founder's open decision; it is used sparingly here for heat and
  misregistration.
- No text or numerals inside the picture. Counts are shown as dots or tallies.
- Deploys and pushes to `main` are held pending the founder's approval.
- Environment: run scripts with `withenv.sh` (it loads `.env.local` and the Supabase
  admin env). Never print secret values.

---

## 10. Where to pick up

1. Read the founder's verdict on the pitch page. He is choosing one or two directions.
2. Take the chosen version through a long refinement pass: its named weakest moment
   first, then detail per shot, keeping the pace from §6.
3. Measure it on a real phone. That is the only claim nobody here has proved.
4. If it is going into the paper, the scene slot in `src/components/daily-bread/visual/ProceduralScene.tsx`
   currently accepts a shader only. Method A versions need it to accept a character
   layer too; Method B versions need the plate loader as well.
