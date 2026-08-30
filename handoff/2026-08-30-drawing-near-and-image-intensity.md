# Drawing Near, image intensity, and the reader atmosphere

**Session:** 2026-08-29 evening → 2026-08-30 ~04:00
**Decisions:** SA-131 (F-175), SA-132 (F-176), SA-133 (F-177)
**Branch:** `feat/seeking-help-georgia` — pushed, origin level with production.

---

## 1 · What shipped

- **Image intensity, a 1–5 tonal scale** (`1119b856`, SA-131/F-175). `--intensity=1..5`
  on `scripts/imagery/build-prompts.mjs` grades a plate from the current site
  register (1) to cinematic baroque (5). `--motion` and stills defaults; a named
  intensity overrides the split and applies to every image in the run.
- **A read-back gate** in `scripts/imagery/verify-masters.mjs`: `--intensity=N`
  reports what a finished plate actually measures against what was asked.
- **Drawing Near, a seven-day series** (`f7d90c2e`, SA-132/F-176). 7 days, Monday
  start, 21 plates at intensity 5, wired into `series.ts`, homepage main feature,
  OG lead, service worker v158 → v159.
- **Narration for all seven days** (`0dfae3d0`) in the founder's voice, 1h48m,
  plus the seven tracks uploaded to R2.
- **The scrolling halftone atmosphere** (`00eca6a5`, `1d708b71`, SA-133/F-177) —
  a dithered ground behind the reading on Drawing Near only.
- **Four skill/spec files brought current**: `.claude/skills/devo-go/SKILL.md`,
  `references/workflow.md`, `references/imagery-and-video.md`, and
  `scripts/imagery/prompt-preamble.md`.

## 2 · What is proved

| Claim                        | Evidence                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All 7 days live              | `https://euangelion.app/devotional/drawing-near-day-{1..7}` → 200, each body containing its own prose (day 1 `"The story does not begin"` ×2, day 3 `"It is easy to hear these words"` ×2, day 7 `"There is no teaching today"` ×2) |
| Series + homepage            | `/series/drawing-near` → 200 with `"Crowned, And Hiding"`; `/` contains `"Drawing Near"`                                                                                                                                            |
| Content gates                | `validate-devotional.mjs` → **0 BLOCKING / 0 NEEDS-FIX** across all 7; `check-devotional-consistency.mjs --strict --series drawing-near` → **OK, 0 notes**                                                                          |
| Readability                  | `check-readability.mjs drawing-near` → FK **4.9**, 30w+ **0.7%**, over-45w **0** — pass                                                                                                                                             |
| Scripture is corpus-verbatim | 89 verses pulled from `public/bibles/KJV/` by `scratchpad/pull.mjs`; casing preserved (this KJV prints "the Lord")                                                                                                                  |
| Greek verified               | STEPBible TAGNT: Matt 5:17 καταλύω **G2647** vs πληρόω **G4137**; John 19:30 **G5055**; Heb 10:1 and 10:22 both **G4334**; Heb 10:19 **G3954**; Rom 10:4 **G5056**; Gal 5:14 **G4137**                                              |
| Red letter                   | `apply-to-days.ts` (the real resolver) → 2 modules marked red, 26 left black                                                                                                                                                        |
| 21 plates live               | e.g. `/images/series/drawing-near/day2-coal.webp` → 200 `image/webp`                                                                                                                                                                |
| Plates hit intensity 5       | `verify-masters.mjs <dir> --intensity=5` → **15/15 pass**, border + blank + read-back                                                                                                                                               |
| Audio live from R2           | all 7 → 200, **byte-identical** to local, `x-audio-origin: r2`; Range request → **206**                                                                                                                                             |
| Audio integrity              | chapters start at 0, strictly increasing, last mark inside runtime; 1.4–9.9 MiB vs the hard 25 MiB limit; textHash matched by the real Python extractor                                                                             |
| Narration spend              | quoted 92,496 chars before spending; finished with **336,031 credits** left                                                                                                                                                         |
| Intensity scale calibrated   | 5 approved plates read **1.0 / 2.1 / 3.2 / 4.0 / 5.0** against their own rung                                                                                                                                                       |
| Atmosphere scoped            | live: `drawing-near-day-1` contains `drawing-near-atmosphere` (1); `all-these-things-day-1` contains it **0** times, `.devotional-shell-main` keeps `z-index: auto`                                                                 |
| Intro band placement         | 0 ink above the first scripture, 16.5 as it starts, 30.1 at midpoint, 0 by the reflection                                                                                                                                           |
| Band rhythm                  | ink sampled every 900px on day 1: four swells with three gaps of clean paper                                                                                                                                                        |
| Build                        | `npm run build` → 768 static pages; teasers 582 → 589, **zero lost**, exactly 7 gained                                                                                                                                              |
| Pushed                       | `05e2d484..1d708b71`, unpushed count **0**                                                                                                                                                                                          |

## 3 · What is half-done

- **Audio `src` is not content-versioned.** These 7 plus the 7 `all-these-things`
  tracks are the only **14 of 564** manifest entries whose `src` lacks a content
  hash. They serve correctly; they miss the immutable-cache guarantee. Needs the
  R2 versioned-key path (`euangelion-voice-prototype/spec/upload_versioned.py` +
  `upload_v2.sh`). Not attempted unattended — see traps.
- **`__tests__/narration-manifest-current.test.ts` fails** on exactly those 14
  entries ("content-versioned key" assertion). Pre-existing since 2026-08-24.
- **`__tests__/edition-admin-queue.test.tsx` fails** ("CLEAR deletes the steer").
  Pre-existing, unrelated, not investigated.
- **Atmosphere is unreviewed on mobile.** Verified at 1440×900 and incidentally on
  the navy reader theme. Never opened at 375px.
- **The devo-go drift list from the start of the session is only partly closed.**
  Fixed: the intensity rules. Still open: `imagery-and-video.md` still documents
  Higgsfield `gpt_image_2` as the generator (it is Codex now); SA-100's
  Real-ESRGAN upscaler is undocumented in the skill; `traps.md` carries nothing
  since 2026-08-10; the SA-030/SA-123 week-shape label conflict in
  `content/next-series-thematic.md` was worked around, not corrected.
- **`docs/feature-prds/F-174.md` exists but was never added to the registry or
  index** — another session's, left alone.
- **Two uncommitted files are not mine**: `.gitignore` (voice session) and
  `content/market-research/…raw-v3.md`.
- **`creativcreature/euongelion` is PUBLIC**, while `CLAUDE.md` documents it as
  private. Verified via `gh repo view --json visibility` → `"PUBLIC"`. Untouched.

## 4 · The next step

Open `https://euangelion.app/devotional/drawing-near-day-1` at 375px and judge the
atmosphere on mobile — it is the only surface the effect has never been seen on.

## 5 · Traps

- **`npm run preview` shows an EMPTY BODY for a brand-new devotional.** The Workers
  preview self-fetches production, which 404s until the deploy exists. The control
  (an already-live series) renders fine, which makes it look like your new page is
  broken. Verify the `.next` prerender and `.open-next` cache contain the prose,
  then assert against production after deploying.
- **Audio does NOT ship in the deploy bundle.** `scripts/strip-audio-from-assets.mjs`
  deletes it so `/audio/*` reaches the Worker, which reads R2. A new series' tracks
  must be uploaded separately or they 404 in production. `wrangler r2 object put`
  needs `--remote`; without it the upload goes to local miniflare and verifies
  perfectly while staying invisible to production.
- **`sampleGrid` fits its source to the whole output.** Handing it an image
  directly stretches it and shows the entire composition. Crop into a correctly
  shaped staging canvas first, and **fill that canvas with paper** — transparent
  pixels average to black and print as solid ink.
- **Intensity-5 plates are ~79% deep ink.** Halftoning them raw closes nearly every
  cell (12,914 of 13,360 sampled pixels painted) and floods the page grey. Compress
  the tonal range; do not clip it with a hard gate, which kills the picture.
- **Scroll offsets cached at mount go stale.** The reader builds before plates load
  and while the article is short. Hold element references and measure per frame.
- **`build-publish-dates.mjs` cannot date a series that is not yet committed** — it
  reads git's first-add date, so the pre-commit gate blocks the very first commit.
  Seed the entries with today's date; the builder regenerates the same value after.
- **The pre-commit hook re-checks the FULL staged set on `--amend`.** An amend that
  adds one file will fail for a missing CHANGELOG or F-PRD that is already in the
  commit. Re-stage them explicitly.
- **Codex CLI is not on `PATH`** and `codex exec` reads stdin even when the prompt
  is an argument — always `< /dev/null`, and run it in the background.
- **oEmbed verification needs a URL-encoded `?url=`.** An unencoded `&` silently
  truncates the request and every video looks dead.
