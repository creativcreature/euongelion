# What real audio players have that ours does not

**2026-08-20. Evidence: Mobbin, iOS.** Founder: "the reader needs to be based on
real world readers, you have a lotta missing features that are fairly standard
for audio. players needs to be reworked based on research from mobbin... dont
half ass it."

## First finding: the shape we shipped is the right one

Option A — a slim row docked over the reading, the full player elsewhere — is
not a compromise. It is what products that pair long text with narration
actually do:

| Product                                                                         | Over the text                                            | Full player                                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Blinkist](https://mobbin.com/screens/ea3a5a5a-2509-4c4e-b35e-69955e2349e4)     | docked bar: scrubber, 1.0x, ±15, play                    | separate                                                                       |
| [The Atlantic](https://mobbin.com/screens/483e9b88-9c17-4fb0-89ca-38da34420862) | "NOW PLAYING" pill + mini bar with title, pause, dismiss | [full screen](https://mobbin.com/screens/34b88ad6-d3af-43cc-bcf6-b48a2e69a5d2) |
| [SCMP](https://mobbin.com/screens/19ac4e74-8851-4f03-8189-0f38a86e56e4)         | docked: scrubber, prev, pause, next, 1x                  | —                                                                              |
| [Speechify](https://mobbin.com/screens/1c838be2-63f8-41ee-b50f-f88069726c12)    | docked: scrubber, «, play, », 1.5x Speed                 | —                                                                              |

So the rework is not "undo option A". It is "the full player is under-furnished".

## The standard kit, and where we stand

Counted across [Spotify Audiobooks](https://mobbin.com/screens/c9cb0602-c90a-4e10-9e03-14be4407c20c),
[Apple Podcasts](https://mobbin.com/screens/2070aaf4-77d3-42a5-9129-67b6e851866c),
[ElevenReader](https://mobbin.com/screens/633320e0-b7fc-4791-b65e-c250e82c7b06),
[Headway](https://mobbin.com/screens/14aa568c-3cfd-4f66-bcf0-ee8c3ca87fac),
[Blinkist](https://mobbin.com/screens/ea3a5a5a-2509-4c4e-b35e-69955e2349e4),
[Finimize](https://mobbin.com/screens/0eac6a74-48ca-4a6a-bbb7-54b299e03e2a),
[Patreon](https://mobbin.com/screens/1b240b25-6b50-4dec-a02c-312320546e92),
[The Atlantic](https://mobbin.com/screens/34b88ad6-d3af-43cc-bcf6-b48a2e69a5d2).

| Feature                                   | Seen in                                             | Ours                |
| ----------------------------------------- | --------------------------------------------------- | ------------------- |
| Big play/pause, ±skip                     | all 8                                               | yes                 |
| Scrubber with elapsed + remaining         | all 8                                               | yes                 |
| Speed                                     | 8 of 8                                              | yes                 |
| Sleep timer                               | Spotify, Apple, ElevenReader, Patreon               | yes (fixed tonight) |
| Queue / list                              | Spotify, Apple, ElevenReader, Atlantic              | yes                 |
| Position in set ("1 of 8", "1% complete") | Spotify, Headway                                    | yes                 |
| Download                                  | Patreon, Finimize                                   | yes                 |
| **Volume**                                | Apple Podcasts, ElevenReader                        | **NO**              |
| **Share**                                 | Spotify, ElevenReader, Headway, SCMP                | **NO**              |
| **Cover art in the player**               | 7 of 8                                              | **NO**              |
| **Read-along text highlight**             | ElevenReader, Speechify, Headway, Blinkist          | **NO**              |
| **Named narrator**                        | ElevenReader ("Oliver Silk"), Speechify ("MrBeast") | **NO**              |
| **Dismiss the player**                    | Atlantic (X on the mini bar)                        | **NO**              |
| Output route / AirPlay                    | Apple, Patreon                                      | n/a on web          |

## What that means, in order

**1. Volume — a plain omission.** Every desktop listener has a system volume and
no in-page one. Apple Podcasts and ElevenReader both carry a slider. Note iOS
Safari ignores `audio.volume` entirely, so this is a pointer-fine affordance,
not a universal one.

**2. Share — the most-carried feature we lack.** Four of eight. A devotional is
a thing people send to someone.

**3. Cover art.** Seven of eight lead with it. We already have per-devotional
artwork; the player just does not show it.

**4. Read-along is the big one, and it is blocked on data.** ElevenReader
highlights the paragraph AND the word; Speechify highlights the sentence. Both
need per-word or per-sentence timings. Our manifests carry chapter marks only
(`{t, label, module}`), so **section-level** highlight is buildable today and
word-level needs the render pipeline to emit timings. This is the single change
that would most distinguish the product, because the site is a reading first.

**5. Named narrator — DO NOT BUILD YET.** Real products name the voice, which is
evidence for the founder's open ruling on disclosing that narration is
synthesised. It is his call, still pending, so this stays a recommendation.

## Shipped from this analysis

- Volume, in the sidebar, pointer-fine only.
- Share, using the Web Share API with a clipboard fallback.

## Not shipped, and why

- **Cover art / read-along / narrator** — cover art and section-level read-along
  are real builds against the reading surface the founder signed off hours ago,
  and word-level read-along needs data we do not have. Named narrator is blocked
  on a founder ruling. Proposing beats half-building.
