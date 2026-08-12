# Euangelion Narration Pacing Spec — v0.1 (prototype)

**Status:** Draft, founder review pending. Lives with the prototype takes; moves to
`docs/audio/` + its own F-### PRD when the direction is approved.

**Purpose:** Make founder-voiced narration repeatable for ANY devotional text.
Every rule below is derived from measurement, not taste — the calibration source
is the founder's own speech (interview `4CH012I.wav`, 2026-07), and every
constant is re-derivable by re-running the calibration procedure (§6) whenever
better reference audio exists.

---

## 1. Calibrated voice constants (v0.1 — from interview close-mic)

| Constant                                      | Value                   | Source                                                            |
| --------------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| Natural speaking rate (speech-only)           | **2.82 w/s** (~169 wpm) | 5 reference clips, silence-excluded                               |
| Reflective/emotional register                 | 2.0–2.4 w/s             | scan_26 ("I've loved deeply…") 2.26; scan_23 2.86→2.39 clip-level |
| Explanatory register                          | 2.6–2.9 w/s             | scan_00, scan_04, scan_14, scan_16                                |
| Energetic register (NOT used for devotionals) | 3.5–4.6 w/s             | scan_06, scan_21, scan_28                                         |
| Pause, median                                 | 0.40 s                  | 23 intra-clip silences ≥0.2s                                      |
| Pause, p75                                    | 0.55 s                  | same                                                              |
| Pause, maximum ever observed                  | **0.70 s**              | same — the founder never pauses longer                            |

**Hard rule derived from the last row:** no stitched silence may exceed 0.70s
(+the small engine-native trailing silence). The v1 prototype's 1.1–1.4s gaps
read as artificial precisely because they exceeded the speaker's natural range.

## 2. Context → target rate map

The founder naturally slows down as content gets more weighty/emotional. Encode
that as per-module targets (w/s, speech-only):

| Module type                      | Target   | Tolerance | Rationale                                     |
| -------------------------------- | -------- | --------- | --------------------------------------------- |
| `title` / `subtitle`             | 2.60     | ±0.15     | Announcement register, unhurried              |
| `scripture`                      | **2.45** | ±0.15     | Reverent register = founder's reflective band |
| `teaching` / `insight` / `story` | 2.82     | ±0.15     | His natural explanatory rate                  |
| `reflection` (questions)         | 2.60     | ±0.15     | Space to think; also gets long post-pause     |
| `prayer` / `breathPrayer`        | **2.30** | ±0.20     | Slowest register on the map                   |
| `takeaway` / `commitment`        | 2.60     | ±0.15     | Deliberate, directive                         |

## 3. Pause grammar (text boundary → stitched silence)

All values come from the measured pause distribution — we only _assign_ his
natural pauses to structural boundaries, we never invent longer ones.

| Boundary                           | Silence            | Maps to                                               |
| ---------------------------------- | ------------------ | ----------------------------------------------------- |
| Comma / clause (inside a sentence) | none stitched      | engine-internal                                       |
| Sentence → sentence, same module   | **0.40 s**         | his median pause                                      |
| Paragraph / module → module        | **0.55 s**         | his p75 pause                                         |
| Entering or leaving `scripture`    | **0.70 s**         | his max pause — reserved for the most sacred boundary |
| Before `prayer`                    | **0.70 s**         | same reservation                                      |
| After a reflection question        | 0.70 s             | thinking space                                        |
| After final "Amen."                | 1.0 s trailing pad | outro only — not between speech                       |

## 4. Text-shaping rules (applied to the literal transcript before rendering)

1. **Same words only.** Shaping may alter punctuation, line-breaks, and chunk
   boundaries — never wording. (Content-integrity rule; devotional text is the
   product.)
2. **Sentence-level chunks.** Split on sentence enders (`.` `!` `?` `"`);
   each chunk renders as its own generation.
3. **Fragment-merge rule.** Chunks under 5 words merge with the following
   sentence (or preceding, if last). _Measured cause:_ short fragments render
   fast — "A man steps out of the line." (7w) came out at 4.38 w/s, worst in
   the take.
4. **Scripture verse phrasing.** Inside scripture, split additionally at
   semicolons and verse boundaries; quoted speech ("Because I bore him in
   pain") stays with its attribution clause.
5. **Strip for speech** (mirrors `src/lib/audio/segments.ts` `toSpeech`):
   markdown, `{{wn:...}}` word-notes → surface word, links → label, no
   headings/bullets read aloud.
6. **Pronunciation map** (grows over time; applied as text substitution at
   render, never saved back to content): `Jabez → JAY-bez` (verify by ear),
   Hebrew transliterations get hyphenated syllables. Every new series adds its
   proper nouns here after the listen-through.

## 5. Render + QA protocol (per piece)

1. Render with seed 7 (qwen engine, 1.7B, MLX).
2. Compute rate = words / rendered duration. Accept if within module tolerance (§2).
3. Else **seed-hunt**: seeds 11, 23, 42 — keep the take closest to target.
4. If every take is >0.3 w/s above target, flag the piece for manual review
   (options: re-shape punctuation, re-split, or time-stretch in post).
5. Whole-devotional QA gate: overall speech-rate within ±5% of the
   word-count-weighted target; no accepted piece outside tolerance +0.15;
   human listen-through before publish (pronunciation + tone check).

## 6. Calibration procedure (repeatable; reruns when reference audio improves)

1. Take every reference sample on the voice profile.
2. 50 ms RMS windows; threshold = max(60, p85 × 0.10); silence run ≥ 200 ms = pause.
3. Speech-rate = transcript words ÷ (duration − Σpauses), per clip and pooled.
4. Pause stats: median / p75 / max across all clips.
5. Update §1 constants; §2 targets shift proportionally (scripture = pooled
   rate × 0.87, prayer = × 0.82, teaching = × 1.0, title/reflection = × 0.92).
6. **Planned recalibration:** when the founder records deliberate narration
   samples (60–90 s), rerun this — those samples replace interview-derived
   constants and will likely slow all targets further.

## 7. Disk hygiene (every render, no exceptions)

Seed-hunting multiplies takes (up to 4 per chunk); at catalog scale that is
thousands of orphaned WAVs inside Voicebox's data dir. Rules:

1. **Track every generation id created during a render** — winners AND rejected
   hunt takes.
2. **After the stitched output is written, delete them all** via
   `DELETE /history/{id}` (removes DB row _and_ WAV on disk — verified in
   Voicebox source, `services/history.py`).
3. **Persist only:** the stitched output WAV (→ later: the encoded Opus for R2)
   and a `.manifest.json` beside it recording chunk → (text, seed, rate). The
   manifest makes every deleted intermediate exactly reproducible — same text +
   seed + profile ⇒ same audio.
4. **Temp files** live next to the output with a `.tmp` suffix and are removed
   before exit. Nothing goes to `/tmp` or accumulates in the Voicebox data dir.
5. **Source-material staging** (interview WAVs, YouTube pulls, scan clips) lives
   in the session scratchpad, never the repo; delete after the useful segments
   are promoted to profile samples. Voicebox keeps its own copies of profile
   samples internally, so staged copies are redundant once attached.
6. `--keep-takes` flag exists for debugging a bad render; using it is the
   exception and the takes must be swept afterward.

## 8. Findings from first full-devotional run (A3, Jabez Day 1, 2026-07-22)

- **Overall rate: 2.87 w/s vs 2.82 natural — within 2%.** The flat-rate goal is
  solved by sample selection + seed-hunting + pause grammar.
- **Differentiated registers are NOT reachable by seed-hunting alone.** 9/27
  chunks flagged, concentrated in `scripture` (target 2.45) and `prayer`
  (2.30): the engine renders ~2.8–3.0 regardless of content because the
  profile's reference samples average ~2.8. Seeds move a chunk ±0.2 at best.
- **v0.2 direction — register-specific sample sets.** One voice profile per
  register (scripture/prayer profile fed ONLY the 2.0–2.3 w/s reflective
  clips; teaching profile at ~2.8). The renderer selects the profile by module
  type. The founder's deliberate recording session should capture each
  register separately: Scripture read slowly, teaching read naturally, prayer
  prayed — not read.
- Short declaratives ("A man steps out of the line.") stay fast at any seed —
  raise `min_chunk_words` 5 → 8 so they merge into neighbors.

## 9. Known engine facts (v0.5.0, Apple Silicon MLX)

- `instruct` (delivery directions) is a **no-op** on the MLX qwen path — pacing
  must come from reference samples + chunking + stitching, per this spec.
- Chatterbox Turbo renders ~15% fast vs founder-natural (3.24 w/s observed) and
  exposes no pace control; qwen lands ~9% fast pre-seed-hunt (3.07).
- Reference-sample prosody dominates output prosody. Sample selection IS the
  pacing tool; everything else is trim.
- First generation after model load can fail (`no Stream(gpu)` MLX race) —
  always auto-retry once. Long texts can crash the sidecar; keep chunks ≤ ~40 words.
