# Imagery & Video — generation, processing, placement

## Hard sequence rule

NO image generation until the founder has read and approved the full text (SA-029 gate). Video IDs are verified during research and shown as cards in the review artifact; imagery briefs are written per day but not executed.

## Generator

Higgsfield MCP, model `gpt_image_2` ("GPT Image 2", OpenAI) — the founder-directed generator (SA-029). Params: `resolution: "2k"`, `quality: "high"` (~7 credits/image), **`aspect_ratio: "1:1"` always**. Plan cap: 8 concurrent jobs — fire 8, poll `jobs_wait`, fire the rest as slots free. Download `results.rawUrl` PNGs.

## Generate ONE master, derive every ratio (SA-052)

**Never generate per aspect ratio.** Generate one 2048×2048 master and crop every
slot from it. A square master is the geometric mean of the extremes we need
(9:16 → 1.91:1), so it loses the least to any single crop. Credits then scale
with how many _pictures_ you want, not how many _places_ they appear — a 10-slot
set costs 7 credits instead of 70.

| Key             | Slot                          | Pixels    |
| --------------- | ----------------------------- | --------- |
| `site-hero`     | Site headline hero            | 1408×768  |
| `site-card`     | Series card                   | 1024×1024 |
| `site-inline`   | Inline / day banner           | 1600×900  |
| `site-portrait` | Portrait card 3:4             | 1050×1400 |
| `og-card`       | OG / FB / LinkedIn / X link   | 1200×630  |
| `ig-square`     | Instagram / LinkedIn square   | 1080×1080 |
| `ig-portrait`   | Instagram portrait 4:5        | 1080×1350 |
| `story`         | Stories / Reels / TikTok 9:16 | 1080×1920 |
| `pinterest`     | Pinterest 2:3                 | 1000×1500 |
| `yt-thumb`      | YouTube thumbnail 16:9        | 1280×720  |

Crop with `fit: 'cover', position: 'centre'` — **not** `sharp.strategy.attention`.
Saliency targets the largest mass, which on these plates deletes the meaning: it
kept a hand and cropped out the kneeling figure it was reaching for. Composition
carries the crop instead, via the CROP clause below.

**Originals are never overwritten** (founder constraint). Derivatives go to new
paths; the master stays untouched and archived.

## Per-devotional volume

Minimum 3 generated images per devotional, up to 5 where the content needs them.
Each is a master that derives the full table above.

## The prompt — canonical copy lives in the repo

**`scripts/imagery/prompt-preamble.md`** is the single source of truth for the
approved wording, and `scripts/imagery/series-image-subjects.json` holds the
per-series subject lines. Assemble with `node scripts/imagery/build-prompts.mjs <slug>`.
Do not retype the preamble from memory — it was founder-approved verbatim on
2026-08-15 after three rejected rounds.

The prompt is five blocks, in order:

1. **FULL BLEED** — artwork to every edge, no paper margin, border, frame or vignette.
2. **FULLY DEVELOPED FRAME** — a complete illustrated scene, never an isolated subject on blank paper. Sky carries cloud structure, ground carries texture, distance carries landscape. Quiet areas may be faint but are always printed.
3. **Riso duotone style** — cobalt ultramarine on warm cream, Ben-Day dots carrying every tone, paper grain, faint crimson misregistration, no greys, no text.
4. **PEOPLE** — region- and period-specific; skin as a printed value; faces by pose. See below.
5. **SUBJECT** then **COMPOSITION FOR CROPPING**.

> **Deleted 2026-08-15:** the old style block said _"Generous negative space, high
> horizon line, small figure scale, single-subject composition."_ That line is what
> produced subjects floating in blank cream. Founder: _"no stark nothing
> backgrounds."_ Block 2 replaces it. Do not reinstate it.

### PEOPLE — the clause that matters most

- **Region and period specific.** Ancient Levantine / Judean for biblical scenes: Middle Eastern Semitic people, dark hair, dark brows, dark eyes. Period dress only — woven tunic, draped mantle, head cloth or veil, sandals or bare feet. **No modern clothing.** Unspecified period defaults to contemporary Western and produced a boy in a sweatshirt and jeans.
- **Skin is a printed VALUE, not a label.** Brown to deep brown, rendered in **dense** blue halftone, obviously darker than the cream ground. _In a cobalt-on-cream duotone the cream paper is the only other ink, so unprinted skin **is** white skin._ Naming an ethnicity while leaving skin near paper still outputs a white person. This is the single highest-leverage line in the prompt.
- **Named exclusions.** European, Anglo, Nordic, generic AI white faces, pale skin, light or blonde hair, modern haircuts.
- **Faces by pose, never by blackout.** From behind, in profile, head bowed, or shadowed by a head covering. Founder: _"I dont like blacked out faces, so just try to hide faces through posing, but if a face is shown its ok, just needs to be historically accuerate."_ A visible region-accurate face is acceptable.
- **Modern-dress scenes must be diverse.** Black, Brown, Middle Eastern, East Asian, South Asian and white people together. Founder: _"not NO white people for modern depictions, but not whitte people only."_ Use the modern-dress PEOPLE variant in `prompt-preamble.md`.

### Subject lines

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

## Accuracy Gate (SA-032, extended by SA-052 — MANDATORY before placement)

Every render is checked in this order. Steps 1–2 are measured; **3–5 require
opening the image**.

1. **Border** — sample 3 pixels down each edge of the 1408×768 centre crop; all must be ink. `sharp.trim()` cannot fix a border — the gradient is too soft. Regenerate.
2. **Blank paper** — bare-paper coverage across the whole frame ≈ 0%. Anything higher means block 2 was ignored.
3. **Figures** — period dress, dense-dot brown skin, no blacked-out faces, no modern clothing. A plate can pass 1 and 2 and still fail here.
4. **Fact check** — does the image depict what the caption claims? Botany (wheat BOWS heavy and golden at maturity; darnel stands stiff with thin dark spikelets; identical ONLY pre-heading), history, geography, textual detail (four soils are four DISTINCT grounds; a mustard seed is tiny and its tree large). If the teaching hinges on a difference, the difference must be visible and correct.
5. **Crop check** — derive the 9:16 and 1.91:1 crops and confirm both still carry the subject and the golden light. A master that only works square is a failed master.

A beautiful wrong image fails. Regenerate with the fact named explicitly in the
prompt. Founder precedent: the v1 wheat/darnel plate showed two identical formed
heads — style-perfect, botanically wrong, caught by the founder IN PRODUCTION.

## Video embedding

- Module shape: `{ "type": "video", "videoProvider": "youtube", "videoId": "<11-char>", "videoTitle": "<exact current title>", "videoCaption": "<what it teaches here>", "videoAttribution": "<channel>" }`.
- `VideoModule` renders click-to-play: thumbnail (i.ytimg.com — allowed by `img-src https:`) → on click, `youtube-nocookie.com` iframe playing INLINE. The CSP's `frame-src` includes `https://www.youtube-nocookie.com` — if a future provider is added (e.g., Vimeo), extend `frame-src` in `next.config.ts` FIRST or players render as blank blocked boxes.
- Placement: after the teaching module the video deepens (typically post-B or post-C); a long-form sermon go-deeper sits late in the day, before resources.
