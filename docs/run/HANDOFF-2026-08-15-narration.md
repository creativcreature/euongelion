# Handoff — narration in the founder's voice (2026-08-15, overnight)

## What you can listen to right now

Three devotionals in your own voice, finished — voice, atmospheric bed, chapters:

| Track                                           | Length   | Pace    | Chapters |
| ----------------------------------------------- | -------- | ------- | -------- |
| `public/audio/he-cannot-deny-himself-day-1.m4a` | 22.0 min | 162 wpm | 23       |
| `public/audio/he-cannot-deny-himself-day-2.m4a` | 23.3 min | 159 wpm | 23       |
| `public/audio/he-cannot-deny-himself-day-3.m4a` | 24.7 min | 157 wpm | 23       |

Audiobook narration band is 150–170 wpm; all three sit inside it. Bed is −26 dB
under speech and −18 dB in the gaps, the level you set by ear. Peak −1.3 dBFS,
loudness-matched to the rest of the catalog so moving between a founder-voice
track and a Michael track needs no volume change.

Sample takes kept for comparison in `euangelion-voice-prototype/`:
`VOICE-master-v3.mp3` (the approved clone), `ELEVENLABS-THCA-v3.mp3` (the old
3.5-minute clone), `VOICE-v2-stability60/80.mp3` (the flatter-model test).

## Two things need you

### 1. The ElevenLabs API key has its own 50,000 quota — days 4–7 are blocked

Days 4–7 failed with repeated `HTTP 401` while the account held 641,765 credits
and `/v1/user` authenticated normally. The key named **Euangelion** carries a
separate 50,000-credit cap and is exhausted:

```
"This request exceeds your API key (Euangelion) quota of 50000.
 You have 37 credits remaining, while 802 are required."
```

**Fix:** ElevenLabs dashboard → API Keys → edit "Euangelion" → raise or remove
its quota. Then:

```bash
python3 euangelion-voice-prototype/spec/render_el_catalog.py \
  he-cannot-deny-himself-day-4 he-cannot-deny-himself-day-5 \
  he-cannot-deny-himself-day-6 he-cannot-deny-himself-day-7
```

Cost 52,902 characters. Already-rendered chunks are cached, so nothing is paid
for twice.

### 2. Voicebox's worker is dead — the back-catalog re-render is stopped

Kokoro will not complete even a six-word job: it accepts work, reports
`healthy`, then sits at `generating` with the server at 0.3% CPU. Tried a full
app quit-and-relaunch and a queue flush; neither helped. 47 of 527 devotionals
were re-rendered with the corrected contract before it wedged.

When it works again:

```bash
for i in 0 1 2; do
  python3 euangelion-voice-prototype/spec/render_catalog.py \
    --voice am_michael --shard $i/3 > euangelion-voice-prototype/michael-shard$i.log 2>&1 &
done
# then, once finished:
python3 euangelion-voice-prototype/spec/build_chapters.py
```

The queue is content-addressed, so it renders exactly the stale tracks and skips
the three founder-voice ones. Three shards run about 8 hours.

## What changed in the audio itself

| Fixed                                           | Scale                                   |
| ----------------------------------------------- | --------------------------------------- |
| Section headings unspoken                       | 2,242 headings across 526 devotionals   |
| Subtitle dropped from the opening line          | 77 days                                 |
| Pull quotes read twice, in place and lifted out | 66 modules, all verbatim duplicates     |
| Greek Extended glyphs handed to the voice       | 49 across 11 devotionals                |
| One-word title dropped by the length floor      | `standing-strong-day-7` ("Contentment") |

The renderer (`narration_extract.py`) and the on-page reader
(`src/lib/audio/segments.ts`) are two implementations of the same reading
contract and had drifted on **103 of 533 devotionals**. They now agree on all
533 — 921,909 words each — and the reader independently reproduces the
renderer's SHA-1 of the spoken text. Two tests hold this:

- `__tests__/narration-reading-contract.test.ts` — headings, subtitles, glyphs,
  one-word titles, checked against the real catalog
- `__tests__/narration-manifest-current.test.ts` — every track rendered from the
  text the page now shows, files present, chapters inside runtime

The second is **currently red on purpose**: it names the 477 tracks still
carrying pre-fix audio. It goes green when the back-catalog re-render finishes.

## Repo state

**Nothing is deployed.** The live site is untouched.

My work is complete and verified on disk but **not yet committed** — the shared
pre-commit gate is failing on another session's F-090:

```
[feature-prd-integrity] Missing desktop/mobile contracts in F-090.md
```

I fixed two blockers there that were safe and repo-wide:

- the check hardcodes the expected feature count; F-090 made it 90 and the
  constant still said 89, which blocked **every** commit in the repo
- added the standard `## Methodology References` / `- M00` stanza F-090 omitted

The remaining gap is `### Desktop` / `### Mobile` contracts for their feature,
which is theirs to write. A retry loop is running and will commit my work
automatically once that clears.

Also worth knowing: **`public/audio` is tracked in git and is 2.0 GB**, with only
163 of 527 files actually committed. Worth a decision about moving audio to R2
before this grows further.

## The economics, settled

The whole catalog is 5.01M characters. Pro gives 691k/month. But a **new**
devotional averages 9,487 characters, so the plan covers **72 new devotionals a
month** against a publishing rate of about seven. Your voice on all new content
is already paid for; the back catalog stays on Michael. Recorded as SA-043.

The free-local-clone route was tested and is not viable: that engine is
zero-shot, so better source audio doesn't fix its prosody, and it's the same
component that's currently wedged. Training a model on ElevenLabs output would
take days of GPU time to land below the original and likely breaches their
terms. There is also nothing to save.
