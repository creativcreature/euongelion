# Imagery & Video — generation, processing, placement

## Hard sequence rule

NO image generation until the founder has read and approved the full text (SA-029 gate). Video IDs are verified during research and shown as cards in the review artifact; imagery briefs are written per day but not executed.

## Generator

Higgsfield MCP, model `gpt_image_2` ("GPT Image 2", OpenAI) — the founder-directed generator (SA-029). Params: `resolution: "2k"`, `quality: "high"` (~7 credits/image), `aspect_ratio: "1:1"` for the series card, `"16:9"` for day banners and inline figures (16:9 cover-crops cleanly into wide slots). Plan cap: 8 concurrent jobs — fire 8, poll `job_status`, fire the rest as slots free. Download `results.rawUrl` PNGs.

## The style block (append to every prompt, verbatim base)

> Risograph screen-print illustration in strict two-color duotone: deep cobalt ultramarine blue ink on warm cream paper. Heavy visible Ben-Day halftone dots forming every tone, subtle paper grain, slight print misregistration leaving a faint crimson offset edge on some contours. No gray tones anywhere — every shadow is rendered as blue dot density. Generous negative space, high horizon line, small figure scale, single-subject composition. Flat printed poster aesthetic, no photorealism. Absolutely no text, no letters, no numbers, no words anywhere in the image.

- One small warm golden-yellow spot accent per image, named concretely in the subject line (a sun, a lantern, a lit window, a shaft of light) — the light must have a story (founder-locked "luminous scenes with light behavior").
- Subject lines are drawn from the day's actual content — the caption must be able to justify the slot in one sentence. Reference-build subjects worth imitating: rows of identical figures with one stepped out (genealogy interrupted); a tiny figure knocking at an enormous door; a bounded field with corners left standing; a house in rain with flames bending away.
- Prompt-safety: "newborn baby" trips the filter (`status: "nsfw"`) — use "swaddled bundle". If a result drifts photographic, regenerate with harder poster language ("bold simplified shapes", "strong graphic silhouette", "absolutely not photographic").
- No Hebrew/Greek script in generated images — models garble it; script belongs in scripture/vocab modules where it's content.
- Review every render at preview size before accepting; regenerate misses (style drift, filter kills) immediately.

## Processing & placement

- Convert with the repo's own `sharp` (node script; no PIL/cwebp on this machine): series card 1024×1024 webp → `public/images/site/series/<slug>.webp` (this feeds the series card AND the day-page headline hero via `getSeriesHero`); day images resized to 1600w webp → `public/images/series/<slug>/<day-n-name>.webp`. Target ≤400KB (q80 → drop toward q48 for dense halftone; a few hundred KB over is acceptable rather than degrading the dots).
- Insert as `inline-image` modules at contextually exact positions (after the module whose content they illustrate): `inlineImageSrc`, `inlineImageAlt` (descriptive), `inlineImageCaption` (the one-sentence contextual justification), `inlineImageWidth` (`narrow` ≈ fig-sm | `wide` | `bleed` = full).
- Rhythm: ~2 images per teaching day (one banner-weight `bleed`, one `narrow`/`wide` figure), 1 for sabbath, 1 for recap. Re-run the validator after insertion (captions/alts are scanned prose).
- Republish the review artifact with images embedded (small data-URI versions ~800w q58) so the founder sees them in context.

## Video embedding

- Module shape: `{ "type": "video", "videoProvider": "youtube", "videoId": "<11-char>", "videoTitle": "<exact current title>", "videoCaption": "<what it teaches here>", "videoAttribution": "<channel>" }`.
- `VideoModule` renders click-to-play: thumbnail (i.ytimg.com — allowed by `img-src https:`) → on click, `youtube-nocookie.com` iframe playing INLINE. The CSP's `frame-src` includes `https://www.youtube-nocookie.com` (added 2026-07-12 hotfix) — if a future provider is added (e.g., Vimeo), extend `frame-src` in `next.config.ts` FIRST or players render as blank blocked boxes.
- Placement: after the teaching module the video deepens (typically post-B or post-C); a long-form sermon go-deeper sits late in the day, before resources.
