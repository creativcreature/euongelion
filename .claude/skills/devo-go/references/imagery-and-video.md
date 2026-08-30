# Imagery & Video — generation, processing, placement

## Hard sequence rule

NO image generation until the founder has read and approved the full text (SA-029 gate). Video IDs are verified during research and shown as cards in the review artifact; imagery briefs are written per day but not executed.

## Generator — as actually shipped 2026-08-16

Higgsfield MCP, model `gpt_image_2`. Params: **`aspect_ratio: "3:2"`**,
`resolution: "2k"`, `quality: "high"` → **2048×1360**, ~7 credits/image. Plan cap
8 concurrent — fire 8, poll `jobs_wait`, fire the next as slots free. Download
`results.rawUrl` PNGs.

Founder approved this batch: _"this style is almost perfect for now."_

## Two masters, NOT one square (SA-052)

> **Retired:** the earlier "one 2048² square derives every ratio" rule. It read as
> economical and was the direct cause of the set the founder rejected. The site
> consumes eight ratios; their crop-safe intersection from a square is the central
> **60%×27% — 16% of the frame** — so every composition was forced to the centre
> with padding around it. The pipeline was manufacturing the "everything looks the
> same, everything floats centred" fault. Do not reinstate it.

| Master        | Size            | Safe zone             | Serves                                                                                                                                     |
| ------------- | --------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Landscape** | 2400×1600 (3:2) | central 66%×75% ≈ 50% | series hero, card (4:3), Rack (4:3), headline (1408:768), artwork frames (3:2), Substack (16:9), landscape Mosaic, bento lead/default/wide |
| **Portrait**  | 1800×2400 (3:4) | central 66%×90% ≈ 60% | Covers (3:4), Mosaic (4:5), tall Mosaic (3:5), rhythm block (1408:1700), bento tall                                                        |

The portrait is **not a re-crop of the landscape** — same concept, restaged tall.

**Out of scope:** the `3358/920` homepage banner is not series art (it is
`header-v2.webp`, native ratio, never cropped from these). Series OG cards are
separately rendered text-led cards. Social 1:1 / 4:5 / 9:16 get their own
art-directed pass — do not derive them from series plates.

Install: crop the landscape master to **1600×872 webp at q60** →
`public/images/site/series/<slug>.webp`. `heroImage` in `src/data/series.ts`
already points there, so install is a file replace with no code change. Crop with
`fit: 'cover', position: 'centre'` — **never** `sharp.strategy.attention`, which
targets the largest mass and once kept a hand while deleting the kneeling figure
it reached for.

**Never upscale.** `next.config.ts` sets `images.unoptimized`, so the raw file is
served with no srcset; the headline slot is ~1267 CSS px on a 1920 desktop. A
1024 source was being enlarged 1.24× and the halftone read as grain.

**Originals are never overwritten** (founder constraint). The installer archives
to `design-sources/` (gitignored; git history is the real revert path) and is
write-once so a second run cannot clobber the archive with its own output.

## Per-devotional volume

Minimum 3 generated images per devotional, up to 5 where the content needs them.

## Image intensity 1-5 (SA-131, founder-chosen 2026-08-29)

The series carries a tonal register, chosen in Phase 1 and passed to every
generation as `--intensity=N`. It is the founder's two-style split made into one
control: **1 is the current site register** (airy, ambient light, quiet cream
ground, subject small in frame) and **5 is cinematic baroque** (tenebrist, one
hard light source inside the scene, frame filled, bodies mid-event). **Stills 1, motion 5 are DEFAULTS only**, used when no intensity is given — the
baroque register exists for video, gifs and motion source plates, and still
imagery on the site otherwise stays light.

**An explicitly set intensity applies to EVERY generated image in the run — stills
and motion alike (founder ruling 2026-08-29).** The stills-1 / motion-5 split is
only a DEFAULT, used when no intensity is given. Founder: _"Unless I specify, the
intensity is for all generated images. If I set intensity then this rule overrides
the default."_

| Rung | Register            | Deep mass (<64) | Lit (>200) |
| ---- | ------------------- | --------------- | ---------- |
| 1    | airy — current site | 2%              | 79%        |
| 2    | lit                 | 24%             | 36%        |
| 3    | balanced            | 40%             | 23%        |
| 4    | dramatic            | 49%             | 7%         |
| 5    | tenebrist — motion  | 79%             | 1%         |

The approved plate for each rung is on disk at
`imagery-staging/intensity-spectrum/scale-5/`. Those five ARE the specification —
when a rung is ambiguous, look at its plate.

**Three findings from the 28-generation calibration, each of which cost a round:**

1. **State the CREAM share, not the ink share.** Asking for "18–35% ink" produced a
   binary result: rungs 1–2 light, rungs 3–10 all maximally dark and
   indistinguishable. The model steers on _"about 36% of this frame remains quiet
   warm cream paper"_. The COVERAGE DISCIPLINE block already knew this; the graded
   blocks had dropped the cream half.
2. **Say what the reference image is FOR.** The anchor attached to these runs was a
   maximum-intensity plate, and unqualified it dragged every rung to its own
   darkness. The clause _"the reference is for palette, ink texture and drawing
   style only — do NOT copy its tonal balance or lighting"_ is what unlocked the
   middle of the scale.
3. **Name both budgets and forbid both failure directions.** State only the deep
   share or only the cream share and the model runs to whichever end it prefers.

**Intensity is a closed loop, not a setting.** Requested percentages do not track
linearly with results — one prompt asking for MORE deep ink produced a LIGHTER
plate than one asking for less. So the control is: generate, measure with
`verify-masters.mjs <dir> --intensity=N`, regenerate anything more than one rung
off target. Never paraphrase an intensity block in `prompt-preamble.md`; that
wording is the validated artifact.

**How this relates to the coverage-band axis below.** Intensity sets the tonal
register for the SERIES; the AIRY/MID/DENSE coverage band still varies plate to
plate WITHIN that register, and the archetype, device and camera axes are
unaffected. The set-level standard-deviation rule was written when tone was the
only axis being varied and should be read against the series' chosen rung, not
against the whole 1-5 range.

## The four axes that make a SET work

A plate can be beautiful and the set still fail. The founder's rejection was
_"all the images feel like they are depicting the same devotional."_ Assign every
plate all three of these, and vary them across the set:

**1. Composition archetype** — A scale break · B vast field/tiny figure · C single
object close on toned ground · D cross-section · E repetition + one break ·
F framed view (the frame _is_ an opening) · G overhead plan (straight down, not
oblique) · H silhouette · I detail crop · J impossible juxtaposition.
No two plates adjacent on the series page share one.

**2. Coverage band** — AIRY 20–35% ink · MID 40–55% · DENSE 70–90%. Target roughly
12/14/7 across 33. **State the band and the percentage in the subject line.**

**3. One conceptual device** — the surreal move, named outright. This is what makes
a plate legible as a thumbnail; a detailed landscape is not.

**4. Camera — shot type, height and relationship** (added 2026-08-24, founder
ruling). State all three in the subject line. Founder: _"I want the images to be
slightly more varied in Camera/Shot type. Not just always medium front. Needs
some flexibility in Shot composition."_

| Sub-axis         | Options                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Distance**     | extreme close / close / medium / wide / extreme wide vista                                                   |
| **Height**       | ground-level looking up · eye-level · high vantage looking down · straight-down overhead plan                |
| **Relationship** | frontal · three-quarter · profile · **from behind (over-the-shoulder)** · POV through the subject's own eyes |
| **Depth**        | flat and compressed (long-lens feel) vs deep foreshortening with a large near element (wide-lens feel)       |

**Medium + frontal + eye-level is the default the model falls into, and it is
the one to ration.** Use it for at most a third of a set. No two plates adjacent
on the series page share a distance AND a relationship.

**Over-the-shoulder earns its own note.** The `all-these-things` master was
rejected frontal and approved as an over-the-shoulder rear view — three men seen
from behind on a hilltop, the battle they are affecting visible past the
subject's shoulder in the valley below. It fixed three problems at once:

- it put the viewer **behind** the subject, which is where a reader stands in a
  reading (watching, not being watched);
- it created **deep space** — a large near element and a distant consequence —
  which is inherently more dynamic than a flat frontal tableau;
- and it **hid the faces by pose and simplified the hands**, because hands seen
  from behind grip an object rather than presenting open palms to camera. The
  most common founder rejection got easier by changing the camera.

A plate whose subject is a person DOING something to a wider situation should
almost always show the situation in the same frame. Put the consequence in the
shot.

Measured outcome: rejected set mean 78% ink / sd 9.7; shipped set mean 53% / sd
26.8 / range 7–100%. The founder's four approved plates span 22–85%. **Spread is
the metric, not any single plate.**

## The prompt — canonical copy lives in the repo

**`scripts/imagery/prompt-preamble.md`** is the single source of truth for the
approved wording, and `scripts/imagery/series-image-subjects.json` holds the
per-series subject lines. Assemble with `node scripts/imagery/build-prompts.mjs <slug>`.
Do not retype the preamble from memory — it was founder-approved verbatim on
2026-08-15 after three rejected rounds.

The prompt is nine blocks, in this order. Each exists because of a specific
observed failure — none is decorative:

1. **FULL BLEED** — artwork to every edge; no paper margin, border, frame, vignette. _(17 of 21 masters once came back with a cream border; `sharp.trim()` cannot remove it.)_
2. **NO BARE PAPER** — every region printed; even the quietest carries a dot gradient or tone. _(Founder: "no stark nothing backgrounds.")_
3. **PRINTED IS NOT POPULATED** — printing a region does NOT mean filling it with scenery; add nothing the subject does not require. _(The fix for block 2 over-corrected into demanding sky, ground texture and distant landscape everywhere, which produced 33 plates at 78% mean ink that all looked alike.)_
4. **GROUNDED, NEVER FLOATING** — real contact, gravity, attachment; no floating emblems.
5. **SCALE MUST BE LEGIBLE** — where something is meant to be enormous, include a readable scale reference. **A single small figure is the subject, not forbidden filler** — the ban on background figures forbids crowds only. _(Without this, a giant plumb bob rendered alone read as an ordinary object photographed close.)_
6. **COVERAGE DISCIPLINE** — the stated ink percentage is a hard budget, not a mood: render the subject and STOP. _(Band accuracy went 0/4 → 4/8 the moment this was added.)_
7. **Riso duotone style** — cobalt ultramarine on warm cream, Ben-Day dots carrying every tone, paper grain, faint crimson misregistration, no greys, no text and no invented glyphs. _(A coin came back with pseudo-lettering struck into it.)_
8. **HANDS AND ANATOMY** — five fingers, correct length order, real joints, thumb low on the inner palm; prefer hands doing physical work; obscure them when they are not the subject.
9. **NOT AI ARTWORK** — names the tells to avoid (airbrushed haze, glow bloom, uniform obsessive detail, bilateral symmetry, filigree, plastic sheen, even lighting) and the alternative (uneven ink, deliberately flat passages, asymmetric hand-cut shapes, registration slip, one decisive light direction).

Then **PEOPLE**, **SUBJECT**, and the orientation-matched **CROP_CLAUSE**.

> **Deleted 2026-08-15:** the old style block said _"Generous negative space, high
> horizon line, small figure scale, single-subject composition."_ That produced
> subjects floating in blank cream.
> **Also deleted 2026-08-16:** its replacement, "FULLY DEVELOPED FRAME", which
> demanded sky, ground and landscape in every frame and caused the opposite
> failure. Blocks 2 and 3 above are the corrected pair. Quiet, blank and filled
> are three different things; only blank was ever forbidden.

### PEOPLE — the clause that matters most

- **Region and period specific.** Ancient Levantine / Judean for biblical scenes: Middle Eastern Semitic people, dark hair, dark brows, dark eyes. Period dress only — woven tunic, draped mantle, head cloth or veil, sandals or bare feet. **No modern clothing.** Unspecified period defaults to contemporary Western and produced a boy in a sweatshirt and jeans.
- **Skin is a printed VALUE, not a label.** Brown to deep brown, rendered in **dense** blue halftone, obviously darker than the cream ground. _In a cobalt-on-cream duotone the cream paper is the only other ink, so unprinted skin **is** white skin._ Naming an ethnicity while leaving skin near paper still outputs a white person. This is the single highest-leverage line in the prompt.
- **Named exclusions.** European, Anglo, Nordic, generic AI white faces, pale skin, light or blonde hair, modern haircuts.
- **Faces by pose, never by blackout.** From behind, in profile, head bowed, or shadowed by a head covering. Founder: _"I dont like blacked out faces, so just try to hide faces through posing, but if a face is shown its ok, just needs to be historically accuerate."_ A visible region-accurate face is acceptable.
- **Modern-dress scenes must be diverse.** Black, Brown, Middle Eastern, East Asian, South Asian and white people together. Founder: _"not NO white people for modern depictions, but not whitte people only."_ Use the modern-dress PEOPLE variant in `prompt-preamble.md`.

### Subject lines

**Open every subject line with the camera, then the coverage band, then the
subject** (SA-124). Naming the camera first is what stops the model reverting to
its medium/frontal/eye-level default:

> `"<DISTANCE> <RELATIONSHIP> from <HEIGHT>: <BAND> coverage, NN% ink: <subject>…"`

e.g. `"MID-DENSE coverage, 55-65% ink: a dynamic over-the-shoulder view from
BEHIND and slightly above three men on a rocky hilltop, looking past them and
steeply DOWN into the valley…"`

Do not leave the camera implicit. A subject line that only describes WHAT is in
the frame will be rendered as a medium frontal tableau every time.

- One small warm golden-yellow spot accent per image, named concretely (a sun, a lantern, a lit window, a shaft of light) — the light must have a story (founder-locked "luminous scenes with light behavior").
- Drawn from the day's actual content — the caption must justify the slot in one sentence. Subjects worth imitating: rows of identical figures with one stepped out; a tiny figure knocking at an enormous door; a bounded field with corners left standing; a house in rain with flames bending away.
- Prompt-safety: "newborn baby" trips the filter (`status: "nsfw"`) — use "swaddled bundle". If a result drifts photographic, regenerate with harder poster language.
- No Hebrew/Greek script in generated images — models garble it; script belongs in scripture/vocab modules where it's content.

## Processing & placement

- Convert with the repo's own `sharp` (node script; no PIL/cwebp on this machine). Series master → `public/images/site/series/<slug>.webp` (feeds the series card AND the day-page headline hero via `getSeriesHero`); day images → `public/images/series/<slug>/<day-n-name>.webp`. Target ≤400KB (q80 → drop toward q48 for dense halftone; a few hundred KB over is acceptable rather than degrading the dots).
- Insert as `inline-image` modules at contextually exact positions: `inlineImageSrc`, `inlineImageAlt`, `inlineImageCaption` (the one-sentence justification), `inlineImageWidth` (`narrow` | `wide` | `bleed`).
- Rhythm: ~2 images per teaching day (one `bleed`, one `narrow`/`wide`), 1 for sabbath, 1 for recap. Re-run the validator after insertion.
- Republish the review artifact with images embedded (~800w q58 data URIs) so the founder sees them in context.

## Homepage handoff on publish (MANDATORY)

When a devotional is finally uploaded it **replaces the main feature on the
homepage**. This is part of publishing, not a follow-up task:

- `HOMEPAGE_TODAY` in `src/app/page.tsx` — hardcoded; the homepage main feature does not derive itself.
- `NEW_SERIES_ORDER` and `FEATURED_SERIES` — update so the new series surfaces in browse.
- Bump `CACHE_NAME` in `public/sw.js`, or the founder loads the old shell and reports the change as missing.

## Textual accuracy comes BEFORE composition (founder ruling 2026-08-24)

A plate is wrong if it contradicts or omits what the passage says, no matter how
well it is composed. Two rules, both learned the hard way on `all-these-things`.

### 1. Audit every NEGATIVE constraint against the passage before generating

The first `all-these-things` master was rejected because its subject line said
**"no staff or rod."** That exclusion was written to keep the frame uncluttered.
But Exodus 17:9 reads _"I will stand on the top of the hill with the rod of God
in mine hand"_ — so the constraint deleted the single object the text puts in
Moses' hand. The plate was style-perfect and biblically wrong.

Founder: _"the main image is incorrect as moses should have a staff in his
hands... Images have to be more accurate and precise."_

**Negative constraints are the dangerous half of a subject line.** They are
written for composition and they silently override Scripture. Before generating:

- List every **named object, actor, action and time-of-day** in the passage.
- Confirm each is either IN the frame, or deliberately out for a stated reason.
- Then re-read your own exclusions and check none of them cancels an item on
  that list.

### 2. Build the subject FROM the verse, clause by clause

The approved v2 master maps to the text line by line, and that is why it is
right — not because it looks better:

| Element in the plate           | Verse it comes from                                                   |
| ------------------------------ | --------------------------------------------------------------------- |
| the raised staff               | Ex 17:9 — "the rod of God in mine hand"                               |
| the battle in the valley below | Ex 17:10 — Joshua fought while the three went up the hill             |
| Moses seated on a stone        | Ex 17:12 — "they took a stone, and put it under him"                  |
| one supporter on each side     | Ex 17:12 — "the one on the one side, and the other on the other side" |
| the low sun on the horizon     | Ex 17:12 — "until the going down of the sun"                          |

If a plate's elements cannot be traced back to specific clauses like this, the
subject line is decoration, not illustration. Write the table first.

## Accuracy Gate (SA-032, extended by SA-052 — MANDATORY before placement)

Run `node scripts/imagery/verify-masters.mjs <dir>` for steps 1–2. Steps 3–6
require opening the image; the script deliberately refuses to score them.

1. **Border** — 3 samples down each edge of the 1408×768 crop must be ink. `sharp.trim()` cannot fix a border; the gradient is too soft. Regenerate.
2. **Blank paper** — measured as **local variance at native resolution**, not lightness. Printed quiet carries dot texture; blank paper is flat. **Both naive versions of this check produced false negatives** — a lightness threshold failed every correct cream-dominant AIRY plate, and sampling after a downscale averaged the halftone away so printed areas read as flat. Nine good plates were nearly regenerated for nothing.
3. **Hands** — count the fingers on every visible hand. Five each: four plus a thumb. Middle longest, little shortest, thumb low on the inner palm. No fused, splayed, crossed or boneless digits. A malformed hand is the single most common founder rejection and is invisible to every automated check.
4. **Impossible geometry** — no structure that reads as Escher: no recursive lattices, no ambiguous up/down, no spans that loop or return on themselves, no tessellated modules. Founder: _"looks like an escher drawing and thus looks like ai made it and got confused."_ When a structure is uncertain, make it plainer — an obviously buildable object is correct, anything clever is wrong.
5. **Does it suit the passage** — a technically fine plate can simply be the wrong idea for the day. Read the devotional and ask whether a reader would connect them. Founder rejected one plate on exactly this and nothing else.
6. **Fact check** — botany (wheat BOWS heavy and golden at maturity; darnel stands stiff with thin dark spikelets; identical ONLY pre-heading), history, geography, textual detail (four soils are four DISTINCT grounds). If the teaching hinges on a difference, the difference must be visible.
7. **Crop check** — derive the worst-case crops and confirm the device survives: 1:1 and 1408:768 for landscape, 1:2 and 3:5 for portrait. A master that only works at its native ratio is a failed master.

A beautiful wrong image fails. Founder precedent: the v1 wheat/darnel plate was
style-perfect, botanically wrong, and caught by the founder IN PRODUCTION.

## Set-level check — the one that actually catches sameness

Per-image verification passed 33 near-identical plates 33 times. The defect only
exists **across** the set. Before any full-set sign-off, report:

- ink coverage per plate against its assigned band, and the count out of band
- distribution against the 12/14/7 target
- **standard deviation** — under ~15 means the set has collapsed toward one register
- any two series-page neighbours sharing archetype, band, or camera (distance + relationship)
- **the camera distribution**, and what share of the set is medium/frontal/eye-level — over roughly a third means the set has collapsed to the model's default (SA-124)
- a contact-sheet panel at **true series-card size**: if the plates cannot be told
  apart in that grid, the round has failed regardless of how they look large

## Video embedding

- Module shape: `{ "type": "video", "videoProvider": "youtube", "videoId": "<11-char>", "videoTitle": "<exact current title>", "videoCaption": "<what it teaches here>", "videoAttribution": "<channel>" }`.
- `VideoModule` renders click-to-play: thumbnail (i.ytimg.com — allowed by `img-src https:`) → on click, `youtube-nocookie.com` iframe playing INLINE. The CSP's `frame-src` includes `https://www.youtube-nocookie.com` — if a future provider is added (e.g., Vimeo), extend `frame-src` in `next.config.ts` FIRST or players render as blank blocked boxes.
- Placement: after the teaching module the video deepens (typically post-B or post-C); a long-form sermon go-deeper sits late in the day, before resources.
