# SA-050 — Series imagery regeneration: live run state

**Status:** in progress · opened 2026-08-15
**Decision:** SA-050 · **PRD:** F-096
**Resume with:** `node scripts/imagery/build-prompts.mjs --todo`

This file exists because the first attempt at this run lost its entire prompt set
to context compaction. Everything needed to finish is on disk, not in context.

---

## What the founder asked for

1. Regenerate the site's series imagery — the existing set was rejected.
2. Keep four plates as the reference bar, do not touch them:
   `he-cannot-deny-himself`, `looking-at-the-sun`, `prayer-of-jabez`, `the-harvest`.
3. Originals must remain intact through any crop pass.
4. Ship it live.

## Founder corrections folded in (in order given)

| # | Correction | Verbatim |
|---|---|---|
| 1 | Full bleed | (measured defect — 17 of 21 masters had a cream border) |
| 2 | No whitewash | "these all look like generic ai white people and not region and hostory seocific people" |
| 3 | No blacked-out faces | "I dont like blacked out faces, so just try to hide faces through posing, but if a face is shown its ok" |
| 4 | Modern scenes must be diverse | "not NO white people for modern depictions, but not whitte people only" |
| 5 | No empty backgrounds | "I would prefer the hero images not have soo much whitespace… no stark nothing backgrounds" |

Approved 2026-08-15: **"this set works. ensure the skill is updated with this."**

## Canonical files

| File | Role |
|---|---|
| `scripts/imagery/prompt-preamble.md` | The approved prompt wording. Single source of truth. |
| `scripts/imagery/series-image-subjects.json` | Per-series SUBJECT lines, all 33. |
| `scripts/imagery/build-prompts.mjs` | Assembles prompts; reports run state from disk. |
| `.claude/skills/devo-go/references/imagery-and-video.md` | Skill copy of the standard. |

## Generation parameters

`gpt_image_2` · `aspect_ratio: "1:1"` · `quality: "high"` · `resolution: "2k"`
→ 2048×2048 master · **7 credits each** · Higgsfield plan cap **8 concurrent**.

Masters land in `$SERIES_MASTERS_DIR` (defaults to the session scratchpad
`series-final/`). `build-prompts.mjs` treats a `<slug>.png` there as done.

## Verification gate (all three, in order)

1. **Border** — 3 sample pixels down each edge of the 1408×768 centre crop must be ink.
2. **Blank paper** — bare-paper coverage across the frame ~0%.
3. **Figures** — open it. Period dress, dense-dot brown skin, no blacked-out faces.

Steps 1–2 are measured; **step 3 is a human look and cannot be automated**. A plate
can pass 1 and 2 and still be wrong.

## Install path

`heroImage` in `src/data/series.ts` already points at
`/images/site/series/<slug>.webp`, so install is a file replace — **no code wiring
change needed**. Archive the current files before overwriting; the founder's
constraint is that originals stay intact.

## Remaining steps

- [ ] Generate the 30 pending masters (batches of 8)
- [ ] Run the 3-step gate on each
- [ ] Archive current `public/images/site/series/*.webp`, install new
- [ ] Bump `CACHE_NAME` in `public/sw.js` — required for any shell/asset change
- [ ] Identity gate → commit (CHANGELOG + F-094 staged, message cites SA-049) → `npm run deploy`
- [ ] Verify live on euangelion.app, and on the origin worker if the zone cache lags

## Traps that already bit this run

- **Staging a file captures its whole content**, including another session's
  uncommitted edits. Stage by explicit path, never `git add -A`.
- `sharp.trim()` cannot remove the cream border — the gradient is too soft.
- Saliency cropping destroys meaning on these plates; composition must carry the crop.
- The service worker must be bumped or the founder sees no change and reports it broken.
