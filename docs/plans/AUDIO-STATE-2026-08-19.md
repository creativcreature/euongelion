# Audio — the measured state, and what is actually left

**Status:** current. Supersedes `AUDIO-FORWARD-STRATEGY.md` and
`NARRATION-SITEWIDE-PLAN.md`, both of which are marked superseded and kept for
their arguments only.
**Written:** 2026-08-19, under SA-116 / F-161.
**Every number below is measured from the repository**, not carried forward from
an earlier document. Where an earlier document's number was wrong, it is
corrected here and the correction is named.

---

## 0. Why this document exists

The previous plan was handed to a session to execute and could not be, because
eight of its nine stages had already shipped — on the same day it was written,
by parallel sessions. It still said _"Nothing built yet."_ The cost of that is
not embarrassment; it is a session rebuilding shipped work, or worse, "fixing"
something that was already correct.

So this document leads with what is true, and keeps the work list short and
honest. **If you are planning audio work, read §1 and §4 and nothing else.**

---

## 1. What is shipped

| Capability                             | Decision       | Where                                             |
| -------------------------------------- | -------------- | ------------------------------------------------- |
| Audio served from R2, real byte ranges | SA-098         | `src/app/audio/[file]/route.ts`, `wrangler.jsonc` |
| One `<audio>`, above the routes        | SA-115         | `src/components/audio/GlobalAudioHost.tsx`        |
| Reachable from every page              | SA-110         | `GlobalAudioBar`, `AudioHeaderButton`             |
| Queue drawer, auto-advance             | SA-107, SA-096 | `AudioDrawer`, `audioStore`                       |
| Listening in the library               | SA-096         | `ListeningSection`                                |
| The Edition, voiced                    | SA-098         | `/daily-bread`                                    |
| Occasion picker                        | SA-101, SA-098 | `OccasionPicker`, `lib/audio/occasion.ts`         |
| Downloads, offline, synthesised 206    | SA-098         | `lib/audio/downloads.ts`, service worker          |
| Position + listening totals, honestly  | SA-116         | `lib/audio/listening-progress.ts`                 |
| Format taxonomy, long-form books       | SA-116         | `lib/audio/formats.ts`, `scripture-whole.ts`      |

**The system is built.** What remains is content and two trust decisions.

---

## 2. The catalogue, measured

550 tracks · **98.8 hours**

| Corpus                  | Tracks | Hours | Share  |
| ----------------------- | ------ | ----- | ------ |
| `bible-365`             | 365    | 69.7  | 71%    |
| Devotional series       | 185    | 29.1  | 29%    |
| **Audio-native pieces** | **0**  | **0** | **0%** |

### Length distribution

| Band         | Tracks |
| ------------ | ------ |
| under 5m     | 23     |
| 5–10m        | 132    |
| 10–20m       | 374    |
| 20–30m       | 21     |
| **over 30m** | **0**  |

Median **11.1 minutes**; longest single track **28.2 minutes**.

**The shape of the gap has changed.** The old plan said both ends were empty.
Only the short end still is. Since SA-116, `bible-365` grouped by book yields
**45 consecutive runs across 31 books — 31 of them over 40 minutes, 26 inside
the 40–90 minute band, 46.1 hours of long-form in total**, the longest being
Revelation at 93 minutes. No new recording produced that; it was always there,
addressed a day at a time.

> **Correction.** A crude "strip the trailing numbers" grouping gave 59 runs, 36
> over 40 minutes, and a longest of five hours. Those numbers are wrong and
> appear in the first draft of the SA-116 note. The real parser rejects the
> corpus's thematic headings — `Sabbath`, `Selected`, `Amos, Hosea, Micah` —
> which also correctly breaks the runs around them. The measured numbers above
> come from the shipped `scriptureBookRuns()`.

### Voices

| Voice                           | Engine           | Tracks |
| ------------------------------- | ---------------- | ------ |
| `am_michael`                    | kokoro           | 533    |
| `chris-james-thca-master`       | elevenlabs       | 14     |
| `James — Channel (single-take)` | chatterbox_turbo | 3      |

**533 of 550 are one stock synthetic narrator** — 97%. The old plan said 536 and
14; the true split is 533 stock and 17 non-stock, of which 14 are an ElevenLabs
clone and 3 are local Chatterbox. Note that ElevenLabs is a **hard gate** for
`bible-365` (SA-104): 3.66M characters is $600–800 per metered render against
$0 local, and the readability pass invalidates every `textHash`, so that corpus
**will** be re-rendered.

---

## 3. What the formats are, and which have content

`src/lib/audio/formats.ts` is the taxonomy. `deliveredPieces()` reports zero for
anything unrecorded, and every surface renders nothing for it — the same refusal
SA-098 made rather than pretend a stage was built.

| Format          | Length | Occasion               | State                         |
| --------------- | ------ | ---------------------- | ----------------------------- |
| Devotional      | 7–20m  | Morning, commute       | 185 delivered                 |
| Scripture day   | 10–12m | The daily habit        | 365 delivered                 |
| Scripture whole | 40–90m | Long drive, deep work  | **31 runs, assembled**        |
| The Office      | 3–6m   | The gap between things | **0 — needs writing + voice** |
| Night           | 30–60m | Falling asleep         | **0 — needs writing + score** |
| Lectio          | 10–20m | Sitting still          | **0 — needs writing + voice** |

---

## 4. What is actually left

Three items. None of them is engineering-blocked.

### 4.1 The Office, Night, Lectio — content, not code

The pipeline accepts them today: declare the piece in `AUDIO_NATIVE_PIECES`,
render audio under that slug, and it appears everywhere. Nothing else changes.

What it needs is **the founder in front of a microphone**, and for Night, a
score — the cello and low-string beds already sit in
`euangelion-voice-prototype/`. Night is the format worth doing first: it uses
music that exists, and it is the only piece in the catalogue that would be worth
listening to for its own sake rather than for its content.

**This cannot be closed by engineering, and must not be closed by inventing
pieces.**

### 4.2 Decision 04 — where the founder's voice goes

Unanswered. Everything, or only the pieces where a human voice changes the
meaning (the Office, Night, the Sabbath piece). The recommendation on the table
is the latter, **labelled**, so a listener knows which is which.

### 4.3 Decision 06 — is the narration disclosed as synthesised?

Unanswered, and deliberately carries no recommendation. A voice cloned with
consent is the strongest position available, but the norm is being argued out
now and this audience is sharp about authenticity. **This is a trust posture,
not an engineering call.**

---

## 5. Smaller things still open

Carried forward from SA-098's own note, still true:

- **Series day rows have no per-day play control.** The card is a single `Link`,
  and a nested `<button>` is invalid markup — so this needs the card
  restructured, not a control inserted.
- **The short end of the catalogue is empty.** 23 tracks under 5 minutes, and
  none of them designed for that occasion. The Office is the answer, which puts
  it behind §4.1.

---

## 6. Traps, kept because they have each cost a session

- **`wrangler r2 object put/get` default to LOCAL miniflare.** An upload can
  verify byte-identically and still be invisible to production.
- **Deploy builds the working tree, not `HEAD`.** Gitignored audio ships; a
  `git ls-tree` count proves nothing about what is live. The real risk was never
  delivery, it was durability — which R2 answered.
- **Never deploy from a worktree.** Symlinked `node_modules` breaks OpenNext's
  middleware manifest and every route 500s.
- **Bump `sw.js` `CACHE_NAME` for any shell change**, and keep it in step with
  `SW_VERSION` — they have already drifted nine releases apart once.
- **The downloads cache is exempt from both cache sweeps** and must stay that
  way, or a reader who saved a series for a flight loses it to a deploy they
  never saw.
- **Whisper hallucinates a repeated tail** on any slice ending mid-material. It
  has produced two false "damaged track" reports. Transcribe between silence
  boundaries only.
