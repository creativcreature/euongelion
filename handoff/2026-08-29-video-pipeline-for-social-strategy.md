# HANDOFF 2026-08-29 — Video pipeline, for the social-strategy session

> **SUPERSEDED IN PART — read the pitch first.**
> `euangelion.app/admin/pitches/target-youtube-episode-spec` ("What a Euangelion
> episode has to be", REV 2, session `video-spec`) is the **canonical episode
> spec**. It was written in parallel with this document, with more context, and
> it wins wherever the two disagree. Three specific corrections are marked
> **[SUPERSEDED]** below. What still stands here: the measured benchmarks in
> section 2, the boundary-mask method in section 3, and the traps in section 5.

**Written for:** the session developing Euangelion / @ChrisXJames social strategy.
**Why you are getting this:** a video production pipeline was designed this
session. Its shape constrains what social strategy can promise, and social
strategy's answers change the pipeline back. Read section 3 — that is where your
decisions live.

**One-paragraph orientation.** The pipeline makes **VOX-style animated collage**:
cut-out still elements on layers, moved by a compositor. Claude is the brain
(script, beats, element lists, self-checks), Codex is the image maker, Remotion
composites, and the founder narrates. It uses **zero video-generation credits**,
because nothing is generated as video — motion comes from code. The founder ruled
that **all approval gates stay live** until a first product he likes exists, then
strip on a counter.

---

## 1 · What shipped

Nothing shipped. No code was written, no files were committed, and no tooling
remains installed. This session was research, measurement, and design only.

The design itself is recorded in the session transcript and summarised in
sections 3 and 5 below. Treat this document as the artifact.

---

## 2 · What is proved

Everything here was measured on this machine (MacBook Pro, M4 Pro, 20 GPU cores,
48 GB, macOS 26.6.2). **The artifacts were deleted at founder instruction at the
end of the run, so none of it is re-checkable without reinstalling.** The numbers
were observed directly in-session; the files backing them are gone.

- **LTX-Video 2B generates 4 seconds of 480×768 video in 82.3s.** 97 frames, 4
  steps, seed 42. Breakdown: T5 encode 8.3s, DiT 63.8s (16.0s/step), VAE decode
  9.9s. Output verified by `ffprobe` as 97 frames / 4.041667s duration.
- **The `ltx-mlx` published benchmark does not reproduce.** It claims ~7s for
  that identical configuration on an M3 Ultra. Measured gap is 11.8×, against
  hardware only 3.8× larger in GPU cores.
- **DepthFlow renders 3 seconds of 1920×1080 in 0.66s** (108.71 fps, 4.53×
  realtime) on this machine, reporting `OpenGL Renderer: Apple M4 Pro`. A contact
  sheet of frames 0/35/71 from `the-harvest.webp` was inspected directly: the
  two-ink riso palette, halftone dots and subject were fully intact, with visible
  parallax across the sequence.
- **ffmpeg 9.0 arm64 runs natively here.** SHA256 verified against the
  publisher's published checksum. Encode, `ffprobe`, and frame extraction at a
  set fps were each executed successfully.
- **`~/.cache/huggingface` holds 28 GB of voice-cloning models** — HumeAI
  tada-codec (10 GB), Qwen3-TTS (4.2 GB), chatterbox + turbo (6.8 GB),
  whisper-large-v3-turbo (1.5 GB), LuxTTS, Kokoro. Founder confirmed these are
  live working files for in-progress voice-cloning work, not debris.

**Not measured by me, taken from published sources:** Claude's vision limits
(~1,600 tokens/image, 1568px long edge, 100 images/request); Gemini free tier
(1,500 req/day, native video input); Seedance credit cost (50–60 credits per 5s
720p clip against 100 free daily credits); Kaggle 30 GPU-hrs/week and Colab
15–30; GitHub Actions unlimited on public repos.

---

## 3 · What is half-done

### The pipeline itself — designed, never run

**[SUPERSEDED — the generation stage violates a standing ruling.]** The pitch
states: _"No generation. Standing ruling. Motion comes from Adobe CC plus the
owned Artlist packs. Generation is reserved for the single case nothing else
covers: making one of your own plates move."_

Stage L1 below has Codex generating 200–300 new elements. **That is against the
ruling and should not be built.** The 9,427 images already on disk are the
library. The pitch's shot grammar — punch-ins into existing plates, type-as-art,
diagram reveals in rule lines — needs no new generation at all, and is the reason
cut 1 went from 27 shots to 53 without new art.

The rest of the stage order (script → beats → element resolution → narration →
animatic → blocking → spline → render) still holds. Only the source of the
elements changes: **resolve from the library, never generate.**

Also superseded: this document's assumption that the format is layered parallax
collage. The pitch specifies punch-ins, kinetic type, and a built diagram at the
centre — cheaper, and it does not need cut-outs at all for most shots.

```
LIBRARY (once, then compounds)
  L1  [SUPERSEDED] Codex generates 200–300 elements — violates the no-generation
      ruling. Resolve from the existing 9,427 images instead.
  L2  Boundary mask → SVG path per element  (still valid, for the plates that
      genuinely need isolating)
  GATE: does the library hold the brand?

PER VIDEO
  0   Topic + duration            Claude    GATE
  1   Script                      Claude    GATE
  2   Beat breakdown (1 per 5–8s) Claude    GATE
  3   Element resolution          library first, generate only gaps   GATE
  4   Narration                   FOUNDER, one take                   GATE
  5   Animatic — stills cut to VO Remotion  GATE (pacing)
  6   Blocking — Z, camera, entrances       GATE (composition)
  7   Spline — 12fps, no blur, posterize    GATE (motion)
  8   Render                      local / GitHub Actions
  GATE: ship or don't
```

### The blocking unknown — everything depends on it

**Whether Codex `image_gen` can produce usable isolated elements is untested.**
Not attempted this session. If it cannot, the collage approach needs a different
image source. Boundary masking lowers the bar considerably — only the silhouette
is needed, not a clean per-pixel edge — but it is unproven.

### Boundary masking — specified, never run

Founder ruling: **background subtraction is wrong for this artwork.** On halftone,
per-pixel alpha treats the cream paper between dots as background, punching holes
through the interior and leaving a grainy dot-jagged edge. Required method:

1. rough subject segmentation
2. morphological close (bridge the gaps between dots)
3. **external contour only** (`RETR_EXTERNAL`) — this is what guarantees no
   interior holes
4. smooth/simplify the contour
5. export as **SVG path**

Output is the **original opaque PNG plus a path**, not an alpha PNG. Remotion
clips with `<clipPath>`; interior pixels are never touched. Designed, not built.

### Asserted, not demonstrated

- **[SUPERSEDED — Remotion is already live here.]** This document treated Remotion
  as unverified. It is not: `devotional-rekindled-video/` runs **Remotion
  4.0.513**, and `src/series/metrics.ts` already implements the **R1–R11 gate**
  (ASL, close-up %, perceptible moves, resets, non-speech %, longest silence,
  live/cycle shots, runtime). That gate is a working numeric measurement layer —
  i.e. the "measure, don't judge" half of the eye is **already built**, and any
  eye design should extend it rather than start over.
- Remotion CSS `perspective` + per-layer `translateZ` reproduces After Effects'
  3D-layers-plus-camera-null parallax. (Lower priority now — the pitch's grammar
  is punch-ins, not parallax.)
- The element library compounds — that ~200–300 cut-outs covers most of
  Scripture's visual vocabulary (bread, water, lamp, door, vine, sheep, crown,
  scroll, seed, net, rock, oil, gate, cup), so video 20 costs ~10 new elements
  rather than 150. **This is the assumption the entire cost model rests on.**
- ~100–150 unique elements and 2.5–5 hours of generation wall-clock for a first
  5-minute video.

### Decisions that are yours — these change the pipeline

1. **The clock.** 4,000 watch hours by 2027-02-01, or accept the 8,000 bar and
   build over 12–18 months. Arithmetic: 4,000 hours in ~155 days is ~26
   watch-hours/day from zero — ~390 views/day at 4-minute average view duration,
   ~195/day at 8 minutes, ~130/day at 12. **Doubling average view duration halves
   the views required.** That is the strongest lever available and it argues for
   long-form daily over Shorts. Unresolved; it governs everything else.
2. **Surface split.** Research says Shorts acquire but do not bank YPP watch
   hours; long-form is the only monetisation instrument. Pipeline implication:
   long-form is the primary artifact, Shorts are re-crops at near-zero marginal
   cost. Confirm before the pipeline optimises for one shape.
3. **Instagram structure.** Research says Reels out-reach carousels ~36% and DM
   shares outrank likes 3–5× in ranking. The June plan made the 7-slide chiastic
   carousel the Wednesday centerpiece. Proposed inversion: **Reel earns the
   carousel.** Not decided.
4. **Cadence vs. library.** Daily output is only affordable after the element
   library exists. Social strategy needs to know whether the first weeks are
   library-building (low output) or launch (high output). These conflict.
5. **Narration.** Recommended: the founder reads it himself, one take. Research
   says authenticity beats polish, and the founder's own channel data agrees — 10
   journey/philosophy videos averaged 21 views, 2 unboxings hit 1,500 and 721,
   same face, same year. This also unblocks REKINDLED, which is 53 shots, 7:39,
   11/11 on its own metrics, and stalled on narration the founder has rejected in
   every synthetic form. Not yet done.

### Repo state

Working tree at time of writing:

- `.gitignore` — **modified**, uncommitted. Not mine. It appears to newly ignore
  the `euangelion-voice-prototype/thca-*` directories, which were untracked
  earlier in this session. **If any of those holds a usable voice clone, it bears
  directly on decision 5 above and is now excluded from version control.**
- `content/market-research/christian-devotional-content-strategy-on-youtube-and-instagram-raw-v3.md`
  — untracked. Raw research output.
- **7+ unpushed commits** on `feat/seeking-help-georgia`, monitor reports #16–#24
  from a parallel session.

**The branch is `feat/seeking-help-georgia`**, which is unrelated to both the
social plan and the channel work. Confirm the intended branch before pushing.

### The prior threads this must reconcile with

- `marketing/EUANGELION-SOCIAL-MASTER-PLAN.md` v2 — ACTIVE. Week 1 (John 1:1–18)
  fully built: five caption packages in `captions/`, image map, tags, all marked
  **queued**. Launch was set for Mon Jun 15. Log stops at **2026-06-07 15:12**.
  Weeks 2–4 were never begun.
- `2026-08-24-youtube-channel-and-devotional-film.md` —
  @ChrisXJames channel spec, **seven verdicts outstanding**, nothing built.

**Nothing has cleared the founder's approval gate in 83 days.** Both threads
stalled at approval, not at production capacity. Any strategy that adds approval
volume should account for this.

---

## 4 · The next step

**[SUPERSEDED.]** The original next step — test Codex `image_gen` transparency —
is moot under the no-generation ruling; nothing new gets generated, so there is
nothing to test.

The real next step is the founder recording REKINDLED's 1,266 words in his own
voice, single take per movement, room tone left in — because it is one of the six
verdicts the pitch is awaiting, it is the one the faceless ruling makes close to
forced, and it settles narration for all 44+ episodes downstream.

**The six verdicts on the pitch are the actual blocking item**, and they are what
the social session's strategy must be built against:
REKINDLED one film or seven episodes · the 2.39:1 matte · the audio · cadence
one or two a week · diagram reveal fixed or varying · whether the enemy is named
out loud or only shown.

---

## 5 · Traps

- **`public/images/library/poster/` does not exist — but the library does.** The
  path in CLAUDE.md is wrong; the images are real. Measured: **9,427 files** —
  6,635 in `design-sources/` (gitignored), 1,923 in `archive/`, 869 in
  `public/images/`. The founder-approved style anchors are at
  `public/images/site/series/*.webp`. Look in `design-sources/`, not
  `public/images/library/`.
- **evermeet.cx ships x86_64 ffmpeg only.** It downloads and runs under Rosetta,
  silently. Native arm64 builds are at `osxexperts.net` (`ffmpeg9arm.zip`,
  `ffprobe9arm.zip`), with published SHA256s that verified correctly.
- **fp8 model weights crash on Metal** (`Undefined type Float8_e4m3fn`). They are
  roughly half the download size, so they look like the space-saving choice and
  are the one that will not run.
- **Never export `HF_HOME` globally.** Set it per-command. A global export
  repoints the cache and orphans the founder's 28 GB of voice models, silently
  triggering re-downloads.
- **The `mcp__comfyui__*` tools are Comfy Cloud and are credit-billed.** They
  cannot drive a local ComfyUI. Do not reach for them under a "free" constraint.
- **Published local-model benchmarks run 10×+ optimistic.** Measure on this
  machine before quoting a number to the founder.
- **Do not install anything to answer a question.** Two installs were started
  this session from what were questions, not instructions, and both had to be
  reverted. Ask first.
