# Audio engine research — 2026-08-19

**Status:** research record. Not a contract — nothing here is registered in
`docs/production-decisions.yaml` or a feature PRD yet.
**Why this file exists:** these measurements have no other durable home, they are
expensive to re-derive (one of them costs money to re-derive), and §6 documents a
verification method that produces confident false alarms. Rediscovering that the hard
way costs a day.

---

## 1. The decision

**Chatterbox Turbo, run locally through Voicebox on `127.0.0.1:17493`.**

- Voicebox's engine string is exactly `chatterbox_turbo`. Passing `chatterbox` returns
  HTTP 422.
- The model is already on this machine (3.8 GB). MIT licence; commercial use is
  unencumbered.
- Marginal cost per render: **$0**.

### Cost, for contrast

| Corpus          | Characters | ElevenLabs, one full render | Chatterbox Turbo |
| --------------- | ---------- | --------------------------- | ---------------- |
| `bible-365`     | 3,662,125  | ~$600–800                   | $0               |
| Whole catalogue | 5,100,180  | ~$842                       | $0               |

Those figures are per _render_, not per year. Every re-render — a copy fix, a pacing
change, a pause-grammar revision, a voice change — pays them again. That is the real
argument, more than the sticker price: a metered engine makes the pipeline
un-rerunnable, and this pipeline is going to be rerun.

---

## 2. Pacing is a reference-selection problem, not a post-processing one

Chatterbox is **zero-shot**: output prosody follows the reference profile's audio.
Measured on the same sentence across four reference profiles of the founder's voice:

| Reference profile                      | Pace        |
| -------------------------------------- | ----------- |
| THCA master (conversational interview) | 214 wpm     |
| Founder Voice                          | 188 wpm     |
| Channel (measured)                     | 196 wpm     |
| **Channel (single-take)**              | **170 wpm** |

Professional narration sits at 150–170 wpm. Reference selection alone is worth
**~44 wpm**, and one existing profile already lands inside the band.

So the pacing fix is _narration-paced reference audio_. Time-stretching remains
available as a fallback and is explicitly not the plan — `render_kokoro.py`'s header
documents the abandoned clone path as precisely the failure of trying to fix pace in
post ("every take had to be time-stretched ~1.35x — which is audible").

---

## 3. Licensing — why the "obvious best quality" engines are off the table

| Engine     | Licence               | Verdict                                                                                                                                     |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Chatterbox | MIT                   | Commercially safe. **Chosen.**                                                                                                              |
| Kokoro-82M | Apache-2.0            | Commercially safe. The currently shipped path.                                                                                              |
| XTTS-v2    | CPML — non-commercial | **Rejected.** Coqui shut down in January 2024, so there is no counterparty to buy a commercial licence from. Money cannot resolve this one. |
| F5-TTS     | CC-BY-NC              | **Rejected.** Non-commercial.                                                                                                               |

Stated plainly because published quality benchmarks rank XTTS-v2 and F5-TTS well, and
any future session evaluating on quality alone will re-propose them. The blocker is not
quality and it is not negotiable.

---

## 4. The defect the new renderer must be engineered against

Chatterbox verbatim fidelity measured **94–97%, not 100%**. It drops words
non-deterministically, and long inputs sometimes truncate.

Consequence: **verification is part of the render loop, not a QA pass after it.** A
segment renders → transcribes → scores → re-renders on failure.

`render_kokoro.py` already has the right shape for this. Its phonetic clarity gate
(Soundex equivalence, number/ordinal normalisation, an ASR-confusion list, plus
word-boundary reconciliation so "a way"/"away" doesn't register as a miss) exists so
transcription artefacts don't fail audio that is actually correct. That gate carries
over unchanged. What changes is that with Chatterbox it becomes **mandatory rather than
advisory**, because the base engine's error rate is not zero.

---

## 5. What the ElevenLabs path got wrong

`euangelion-voice-prototype/spec/render_founder_el.py` is a useful catalogue of what not
to reproduce.

1. **Pause grammar applied at the wrong boundary.** Segments are grouped into requests
   up to a character ceiling; _inside_ a request they are joined with a single space
   (`" ".join(s["text"] for s in group)`, L141), and the register-aware `PAUSE_AFTER`
   map — imported from `render_kokoro.py` — is only consulted _between_ requests. On
   `rekindled-day-1` that placed **7 pauses where the grammar specifies 59**.
2. **No verification of any kind.** Which is how a truncated track shipped unnoticed.
3. **Profile modules say their heading twice** — "The Voice Behind Today. The voice
   behind today: Thomas Cranmer" — across **464 devotionals**. The module heading is
   spoken, then `narration_extract`'s `("profile", "name")` lead-in says it again.

### Damage assessment

Only **`he-cannot-deny-himself-day-4`** is actually damaged: it restarts a sentence and
cuts mid-phrase. **13 of the 14 tracks were verified ending on their true final words.**
The fleet is not broken; one track is. Defects 1 and 3 are quality debt across the
catalogue, not corruption.

---

## 6. Verification: the method that works, and the one that lies

**Do not transcribe a long file in a single request.** Transcribing a 19-minute track in
one `/transcribe` call returned a transcript that silently omitted passages plainly
present in the audio. Scored against source, it produced a **false report of 115 missing
words**. The audio was fine; the transcript was not.

**Use overlapping ~90-second windows.** Slice the track, transcribe each window, and
score the union against the source segment text. The overlap is load-bearing: a word
straddling a boundary must appear in both windows or it reads as a drop.

This is the most repeatable mistake in this whole area. A whole-file transcript looks
authoritative, is one call, and fails in the direction that manufactures alarming
findings — which then get acted on.

---

## 7. Voicebox API surface

Host `127.0.0.1:17493`. Engine string `chatterbox_turbo` exactly.

| Call                   | Shape                                             |
| ---------------------- | ------------------------------------------------- |
| `POST /generate`       | `{profile_id, text, language, engine}` → `{id}`   |
| `GET /history/{id}`    | poll until `status` is `completed` / `failed`     |
| `GET /audio/{id}`      | fetch the generation (WAV)                        |
| `DELETE /history/{id}` | remove a generation                               |
| `GET /profiles`        | list voice profiles                               |
| `POST /transcribe`     | whisper turbo — the round-trip verifier for §4/§6 |

---

## 8. Founder recording guidance

Two different asks were being conflated. They need different amounts of tape.

**If a cloud PVC is ever revisited (ElevenLabs PVC):** it wants 30–180 minutes.
30–60 minutes is the minimum worth booking.

**For Chatterbox — the actual plan:** zero-shot needs only a _short_ reference. An hour
of recording is not training data; it is a **pool to select the ideal 20–40 second
reference clip from**. The selection is the deliverable, and §2 shows that selection is
worth ~44 wpm.

Capture rules are the same either way:

- Read **devotional prose**, in **narration voice** — not conversationally, not
  interview-style. The 214 wpm row in §2 is what conversational reference sounds like
  once cloned.
- Split into ~30-minute files.
- One mic, one room, one session wherever possible. Consistency beats quality.
- **No compression**, no limiting, no noise reduction. Processing can be added later; a
  clean capture cannot be recovered from a processed one.

---

## 9. Site strategy: where this collides with the existing plan

`docs/plans/NARRATION-SITEWIDE-PLAN.md` is the prior proposal and still stands as
written. Its load-bearing finding: the `<audio>` element lives inside `NarrationPlayer`
inside the devotional page, so **audio dies on navigation**. Site-wide narration is not
"add the player to more routes" — it is lifting the element to the root layout behind a
Zustand store (the repo already has ~8). Phases 1–2 there are the minimum that delivers
"listen while I work".

Shipped today: pre-rendered narration, a scroll-following mini bar (the reading rule),
an Audible-style chapter sheet with measured timestamps, and an on-page section marker.

**What has changed since that plan was written:** the founder now wants the site
**audio-forward**, with playlists and queues — audio "becoming just as important" as
reading. The existing plan treats the queue as Phase 3, an enhancement bolted to a
reading site. Audio-forward inverts the hierarchy: the queue becomes a first-class
object with its own surfaces (a listen entry point, series-as-album, continue-listening),
and reading and listening become two views on one item rather than one being a feature of
the other. That is a larger scope than the plan currently carries, and it is unspecced.

The engine decision is orthogonal to all of it — §6 of that plan already notes every
surface is engine-agnostic. Nothing in §1–§8 here blocks phases 1–2.

---

## 10. Open questions the founder still owes an answer on

1. **Does the recording session happen?** Everything in §2 assumes a narration-voice
   reference exists to select from. Without one, the best available is "Channel
   (single-take)" at 170 wpm — the top edge of the band, not the middle.
2. **Re-render scope.** Chatterbox changes the voice. Does the existing rendered
   catalogue get re-rendered wholesale, or does the new engine apply only to new work —
   leaving two voices on the site?
3. **`he-cannot-deny-himself-day-4`** — repair it now on the current engine, or leave it
   until the engine decision lands?
4. **The double-heading fix touches the audio of 464 devotionals.** Is that a re-render
   trigger in its own right, or does it wait on #2?
5. **Audio-forward scope.** Is the queue a Phase-3 enhancement (existing plan) or the
   organising idea (§9)? These produce different information architectures, so the answer
   should precede any code.
6. **Generated `/daily-bread` days still have no track.** At $0 marginal cost,
   render-on-demand becomes a compute question rather than a billing one — which is a
   different decision from the one the existing plan deferred.
