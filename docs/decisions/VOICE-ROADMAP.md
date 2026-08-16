# Voice roadmap — from a borrowed voice to the founder's own

Founder direction, 2026-08-16: _"my voice narration will eventually replace
michael once i get better reference. i may spend a weekend recording to get
proper samples... thats the future version, and hopefully eventually wont need
eleven labs."_

The destination is right. This records what it takes to get there, and corrects
one assumption that would waste the recording weekend if planned around.

## Where things stand

|                          | Voice                     | Engine                 | Count |
| ------------------------ | ------------------------- | ---------------------- | ----- |
| `he-cannot-deny-himself` | Chris James (THCA master) | ElevenLabs `eleven_v3` | 7     |
| Everything else          | `am_michael`              | Kokoro, local          | 521   |

The founder's clone is an **Instant Voice Clone** built from ~12 minutes of the
confirmed interview master (`4CH012I.wav`). Approved on first listen. The
earlier clone, built from 3.5 minutes of lossy mp3 clips, was rejected for
mispronouncing him — an IVC learns timbre from that much audio and nothing else.

## The correction: Voicebox cannot train on a voice

This matters because the plan above assumes it can.

Voicebox has exactly two modes:

- **Kokoro** — fixed preset voices. No cloning of any kind.
- **qwen** — _zero-shot_: it takes a few seconds of reference audio and
  improvises everything else from the model's own prior.

Neither has a training step. Feeding qwen three hours of pristine studio audio
does not make it meaningfully better than three minutes, because quantity is not
what it consumes. It is also the engine that crashed the render server (see
SA-043 / the narration handoff) and the one the founder had already judged
"a terrible method."

**So: a weekend of recording will not improve Voicebox. Do not plan around it.**

## What actually reaches "no ElevenLabs"

Fine-tuning an open TTS model — F5-TTS, StyleTTS2, XTTS-class. These genuinely
train on supplied recordings, run locally, and cost nothing per character after
training. It is a real project: dataset preparation, transcription, alignment,
GPU hours, evaluation.

**The argument that carries weight is not the subscription fee.** It is that
free local inference makes re-rendering all 528 devotionals in the founder's
voice _possible at all_. On ElevenLabs the back catalog is **5.01M characters** —
roughly seven months of the current plan, or a tier upgrade. A four-figure
decision. Locally it is a weekend of compute. The monthly fee is affordable;
what it cannot buy cheaply is the back catalog.

## What to record — this determines everything downstream

**Narration register, not conversational.** This matters more than the gear. The
current clone sounds "off" precisely because it learned from an interview —
responsive, reactive, rising terminals — and was then asked to read declarative
prose. Read actual devotional text, at the pace a listener should hear it.

**One mic, one room, one position, ideally one session.** Consistency beats
quantity: a fine-tune will faithfully learn any inconsistency in the source.

**1–3 hours of clean speech**, varied enough to cover the sounds of English
rather than the same twenty sentences.

## Record once, use twice

The same recordings serve both paths:

1. **Immediately** — an ElevenLabs **Professional Voice Clone**. The slot is
   unused, and PVC is a genuine fine-tune rather than the instant clone in use
   now. Note it also requires a short consent recording (~30 s).
2. **Later** — the training set for a local model.

## Suggested sequencing

1. Finish the current work (back-catalog score + R2 migration).
2. Record the weekend, to the spec above.
3. Spend the PVC slot on it — immediate quality jump on new content.
4. Treat the local fine-tune as a separate project, _after_ hearing what good
   source material buys.

That order means never being blocked, and it answers whether PVC alone closes
the gap before any investment in training infrastructure.

## Related

- `docs/run/HANDOFF-2026-08-15-narration.md` — operational state, traps
- `.claude/skills/devo-go/references/narration.md` — the shipping pipeline
- Decision **SA-043**, feature **F-086**
