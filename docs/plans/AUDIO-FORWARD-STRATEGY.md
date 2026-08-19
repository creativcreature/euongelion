# Audio-forward — product strategy

**Status:** proposal, written 2026-08-19, revised the same day against a
measurement pass. Nothing here is started.
**Founder's words:** _"A persistent audio player wherever you are on the site.
A queue so that you can just listen. The audio is becoming just as important."_

**Two sibling documents, and what each owns.**

- `NARRATION-SITEWIDE-PLAN.md` owns _how audio survives navigation._ Its §1 (one
  element, one store) is the load-bearing decision; §1 below amends it rather
  than restating it.
- `docs/audio/AUDIO-ENGINE-RESEARCH-2026-08-19.md` owns _what the voice is
  rendered by._ It is a research record, not a contract — its own header says so.
  Every cost figure quoted here comes from it, cited.
- This document owns _what the site becomes when listening is a first-class way
  to use it, not a mode of the reader._

Where this document overlaps the old plan it is because a queue changes the
answer, and the change is marked. Genuinely new here: §2.3 (The Quiet Hour),
§2.4 (the posture ruling), §2.6 (the naming and behaviour rulings), `/listen`,
`ListenAffordance`, §5 downloads, and §6 — which is a trap list, not strategy,
and is the part most likely to save a week.

---

## 0. Start with the honest number

> **CORRECTION, verified against production 2026-08-19 — the "404" premise below
> is wrong, and Phase 0 does not hold as written.**
>
> The `git ls-tree` measurement is accurate: 170 of 550 `.m4a` are committed, and
> all 365 `bible-365-*.m4a` are gitignored. The inference that the other 380
> therefore 404 is not. `npm run deploy` runs `opennextjs-cloudflare build`
> against the **working tree**, not against `HEAD`, so gitignored files in
> `public/` are uploaded like any other asset. Spot-checked live:
>
> | URL                                       | Result                           |
> | ----------------------------------------- | -------------------------------- |
> | `/audio/bible-365-day-1.m4a`              | `200`, `content-type: audio/mp4` |
> | `/audio/bible-365-day-200.m4a`            | `200`, `content-type: audio/mp4` |
> | `/audio/bible-365-day-365.m4a`            | `200`, `content-type: audio/mp4` |
> | `/audio/he-cannot-deny-himself-day-4.m4a` | `200`, 22.2 MB                   |
>
> The catalogue is **100% delivered today**, not 31%. R2 is therefore not a
> blocking Phase 0, and the queue will not hit a dead file on the second track.
>
> **What is actually wrong is durability, not delivery.** 380 tracks (2.9 GiB)
> exist only on this machine and in the deployed bundle. They are not in git, so
> a deploy from a fresh clone, from CI, or from any other machine ships a
> catalogue that really does 404 — and the assets could not be reconstructed
> without re-rendering. That is a genuine risk and R2 (or LFS) is a genuine
> answer to it, but it is a **resilience** project competing on merit with the
> UX work, not a gate in front of it.
>
> **The 25 MiB arithmetic below stands and should be actioned.** The five scored
> tracks measure 21.16–21.50 MiB against a hard 25 MiB per-asset limit, so the
> bitrate ceiling in §6.10 is a real prerequisite for any scored re-render.
>
> **Separately, and not caught below: the origin ignores `Range`.** A real
> `GET` with `Range: bytes=1000000-1000999` against
> `/audio/bible-365-day-1.m4a` returns `HTTP 200` and the **entire 7.4 MB
> body**, despite advertising `accept-ranges: bytes`. Seeking in a 20-minute
> track therefore refetches the whole file. This is an origin-level defect, not
> the service-worker `206` synthesis problem anticipated in §6 — it is upstream
> of it, and it should be diagnosed before any queue or download work, because
> every scrub in the shipped player pays for it today.
>
> Companion UX evidence: `docs/audio/AUDIO-UX-PATTERN-RESEARCH-2026-08-19.md`
> (Mobbin + `/last30days`, 2026-08-19). Its §5 carries nine deltas that are
> binding on this document.

Before any of this is worth designing, measured today:

|                                               | Count   | Measurement                                                                            |
| --------------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| Devotional JSONs                              | 575     | `public/devotionals/*.json`                                                            |
| Manifest entries                              | **550** | `src/data/audio-manifest.json` (a parallel session is rewriting it as this is written) |
| `.m4a` on disk                                | 550     | **3.70 GiB, 98.6 hours**                                                               |
| `.m4a` committed in `HEAD`                    | **170** | `git ls-tree -r HEAD -l public/audio` = **0.66 GiB**                                   |
| Manifest entries that **404 in production**   | **380** | manifest keys whose `src` is not in `HEAD`                                             |
| Devotionals with **no manifest entry at all** | 25      | `575 − 550`                                                                            |

**Production serves 170 tracks against a manifest that promises 550 — 31%
delivered.** All 365 `bible-365-*.m4a` are gitignored (2.60 GiB) and the manifest
still lists every one. A reader who taps play on day 12 of the year gets a 404
dressed as a player. (The `.gitignore` comment is stale twice over: it says
"~1.4 GB" against a measured 2.60 GiB, and "521 files at <=8.6 MB each" against
five files now over 21 MiB.)

That is survivable while audio is a feature of the reader page. It is not
survivable as a **product posture**. An audio-forward site whose queue hits a
dead file on the second track is worse than a reading site with a nice player.

So: **R2 is not a footnote in the old plan's §6. It is Phase 0 of this one.**
Everything below assumes the catalog actually resolves.

**The 25 MiB ceiling, with the arithmetic shown.** Cloudflare's per-asset limit
is a hard 25 MiB — a deploy failure, not a degradation. The seven
`he-cannot-deny-himself` days are the only tracks carrying
`mix: "scored-stereo-v1"`, five of them already sit at **21.16–21.50 MiB**, and
across the seven the encode runs **115–172 kbps** — it is not a fixed rate:

| If the catalogue is re-rendered scored-stereo at… | 25 MiB is reached at | Tracks that would break the deploy               |
| ------------------------------------------------- | -------------------- | ------------------------------------------------ |
| 126 kbps (the rate measured on day-5)             | 27.7 min             | **1** (`the-harvest-day-3`, 28.2 min → 25.4 MiB) |
| 172 kbps (the highest rate observed)              | 20.3 min             | **19**                                           |

So "scoring the catalogue breaks the deploy" is true, but only conditionally, and
the condition is the encode ladder. **Pin a bitrate ceiling against the longest
track in the catalogue before any scored re-render runs** (§6.10), or land R2
first and stop caring.

---

## 1. The gate — three amendments to the old plan

`NARRATION-SITEWIDE-PLAN.md` §1 settles the architecture: one `<audio>`, one
store, every surface a view onto it. Not re-litigated. A queue forces three
amendments:

1. **Imperative element, not JSX.** Put the element in a module-scope singleton
   (`src/lib/audio/transport.ts`) that the store talks to, and let React never
   own it. A JSX `<audio>` in the root layout is still subject to reconciliation,
   Fast Refresh remounts, and — the real killer — React 19 Strict Mode's
   double-invoke, which on iOS burns the one gesture-unlock the whole session
   depends on (§6.1).
2. **One element for the session, forever.** Never create a second element for
   the next track, never one per track. Swap `.src`. This is what makes
   auto-advance legal under autoplay policy, and it is the single most common way
   web queues break on iOS.
3. **Persist position; never persist playback intent.** `uiStore`'s header
   comment documents the exact bug this would recreate — a store that re-applied
   its own state on rehydration and slammed the document to a stale value. A
   narration store that remembers "you were playing X" and resumes on next load
   is that bug with a soundtrack. Persist `{slug: seconds}` and the queue's
   _contents_; never `playing: true`.

---

## 2. Playlists, as a first-class concept

### 2.1 What a playlist IS here

A playlist is **an ordered list of slugs, a provenance, and a cursor**:

```
Queue = {
  id: string                 // stable, for the "resume this queue" case
  source: QueueSource        // provenance — drives the label AND the rules
  items: string[]            // slugs, already filtered to slugs with a DELIVERED track (§6.2)
  cursor: number             // index into items
  label: string              // "Rekindled" / "Your plan" / "The Quiet Hour"
  href: string | null        // where "go to the reading" navigates
}
```

`source` is not decoration. It decides auto-advance, whether the queue survives
a reload, and what happens at the end. That is the design.

### 2.2 The five kinds, and which of them we build

| Kind                   | Source   | Authored by                           | Storage                                          | Auto-advance              | Ends by                                    |
| ---------------------- | -------- | ------------------------------------- | ------------------------------------------------ | ------------------------- | ------------------------------------------ |
| **Series queue**       | `series` | derived from `series.ts`              | none (rebuildable)                               | **off by default** (§2.4) | stopping at the end of the day you started |
| **Plan queue**         | `plan`   | derived from the reader's active plan | by reference only                                | on                        | end of plan                                |
| **Continue listening** | `resume` | derived from `listening_progress`     | server row exists; **the query does not** (§2.5) | n/a — single item         | n/a                                        |
| **The Quiet Hour**     | `daily`  | **us**, assembled daily               | none                                             | on                        | it just ends                               |
| **Listen Later**       | `saved`  | **the reader**                        | `localStorage` in v1 (§2.5)                      | on                        | end of list                                |

**Only Listen Later is user-authored, and it is deliberately singular.** No named
playlists, no folders, no cover art, no sharing.

That is a real recommendation with a real argument: Spotify's playlist model
exists to make a 100-million-track catalog navigable. Ours is **98.6 hours**.
Readers do not curate catalogs that small — they queue them. The correct analogue
is Audible's library plus a "next up" list. A named-playlist feature costs a
table, a management UI, rename/reorder/delete, an empty state, a sharing
question, and eventually a moderation question, and buys almost nothing at 550
tracks. **Do not build it in v1.** Revisit past ~1,500 tracks, or when listeners
ask for it by name.

### 2.3 The Quiet Hour — the one genuinely new product idea

Everything else in this document is plumbing. This is the thing that makes audio
a _destination_ rather than a mode.

**A single, auto-assembled queue against a ~40-minute budget, rebuilt every
morning, that a reader can start with one tap and not touch again.** It is a
**duration budget, not a fixed list**: slots fill in priority order and the next
one is dropped rather than overshooting. Measured medians —
7.4 min per devotional (n=185), 11.4 min per `bible-365` day (n=365) — put the
four named slots at **~34 min**, so the budget has room and the ordering is what
matters:

1. Today's reading (`/today`) — ~7 min. On Sunday the Sabbath piece leads instead.
2. The next day of your active plan, if you have one — ~7 min.
3. Today's `bible-365` day — ~11 min. **Requires Phase 0**; until R2 lands this
   slot is always empty, which is most of the runtime (§7).
4. Your next unlistened day from a saved series — ~7 min.

**Slot 4 needs a resolution rule, because SA-039 made the unit of saving the
SERIES, not the devotional.** The rule: _a saved series resolves to the
lowest-numbered day in it that has no `completed_at` and has a delivered track._
Nothing else in the app resolves a series to a day for listening, so this rule is
new and belongs to whoever builds Phase 4.

**What it costs, honestly.** Slots 1, 2 and 4 assemble client-side from data the
app already has (manifest + `series.ts` + `progressStore` + saved series). Slot 3
needs Phase 0. **Slots 2 and 4 also need the recent-listening query that does not
exist (§2.5)** in order to know what you already finished — so the Quiet Hour is
one pure function, a card, _and_ the Phase 4 endpoint. It is not free.

Its rules are the brand:

- **It ends.** No loop, no "up next" after it, no infinite feed. The finitude is
  the point and it is what separates this from a podcast app.
- **It never repeats what you finished today.**
- **It is offered, never started.** Nothing on this site autoplays on load, ever.
  The one tap that starts it must call `.play()` **synchronously inside the tap
  handler** — see §6.1, because this is exactly the gesture that gets lost.

### 2.4 How playlists differ from the series that already exist — and the tension

A series is **authored content with a teaching arc**: 5–7 days meant to land on
5–7 mornings. A playlist is **a listening session**: "you have 40 minutes, here
is 40 minutes."

These are in genuine conflict, and the conflict should be resolved on the record
rather than discovered later. `CLAUDE.md` states the product's posture as
_"spiritual formation over engagement metrics."_ A queue is, structurally, an
engagement mechanic. Binge-listening a formation series in one sitting is a
**worse** outcome than reading it over a week — not a better one.

**Recommendation, and it is the opinionated core of this document:**

- **Playlists should be cross-series by design.** The Quiet Hour, continue
  listening, and Listen Later all cut _across_ series. That is what makes them
  legitimate: they assemble a session out of pieces each authored for one sitting.
- **A series queue stops at the end of the day you started**, and shows "Day 3
  finished — continue to Day 4?" as a deliberate choice. `bible-365` is the one
  exception (§4.5); it is a reading plan, not a formation arc.
- **Auto-advance defaults: on for `plan`, `daily`, `saved`; off for `series`.**
  This is the old plan's §3 question 2 recommendation, tightened.

If the founder wants continuous series playback by default, that is a legitimate
call — but it is a change of product posture, not a settings toggle.

### 2.5 Where they live

**Derived queues** (`series`, `plan`, `daily`, `resume`) are computed client-side
and held in `narrationStore.queue`. Not persisted — a persisted derived list goes
stale against the manifest, and rebuilding is microseconds.

**"Continue listening" is not built. Correcting the earlier draft.** Migration
018 does index `(user_id, last_played_at DESC)`, but that index exists for a
query nobody has written. Measured:
`src/lib/audio/listening-progress-repository.ts` exports exactly
`readListeningProgress` (one slug) and `upsertListeningProgress`;
`src/app/api/listening-progress/route.ts` exposes only `GET` (which _requires_
`?devotionalSlug=`) and `PUT`. There is no list endpoint anywhere. Phase 4 must
build:

- `listRecentListening({ userId, limit, before })` in the repository — ordered by
  `last_played_at DESC`, **excluding rows with a non-null `completed_at`**
  (§6.5), cursor-paginated on `last_played_at`;
- a recent mode on the route (`GET /api/listening-progress?recent=1`) rather than
  a second file, so the 018-pending fail-soft path is inherited rather than
  re-implemented;
- an RLS pass. 018 enables RLS with **no anon policies** on the stated ground
  that "all access is server-side" via the service role. A list endpoint widens
  what one request can return, so the `user.id` scoping is now the only thing
  standing between readers. It gets reviewed, not assumed.

**Two facts that make this signed-in-only, and must be said out loud.**
(a) `route.ts` returns `{ progress: null }` unconditionally when there is no
user — so cross-device resume, continue-listening, and Quiet Hour slots 2 and 4
are **signed-in features**. The `localStorage` position mirror is what signed-out
readers get, and the UI must not present a signed-in-only shelf to them.
(b) **Migration 018's application status in production is unknown to this
document.** `isMissingListeningProgressTable()` exists, and the route logs
`CONFIG_FEATURE_DISABLED` against `{ migration: '018_create_listening_progress',
pending: true }`, precisely because the table may not be provisioned; 018's own
header says "until it IS applied, the resume feature degrades to on-device only."
**Confirm 018 is applied before Phase 4 is scheduled** (§8).

**Listen Later: `localStorage` in v1. No table, no migration.** The earlier draft
proposed a `listen_queue` table and cited SA-018 and SA-039 for it. Both citations
were wrong in the same direction:

- SA-018-as-amended allows _anonymous, session-keyed_ writes. A schema with
  `user_id UUID NOT NULL REFERENCES auth.users(id)` makes an anonymous row
  structurally impossible. The two cannot both be true.
- SA-039 §2 is the opposite precedent from the one claimed. Faced with exactly
  this choice it **declined to add a table**, storing a series slug in the
  existing `session_bookmarks` shape "to avoid adding a fourth unapplied
  migration behind the three billing migrations still pending." Invoking SA-039
  as the approval gate for the thing SA-039 declined to do is incoherent.

So: **v1 Listen Later is device-local, ordered, and costs nothing.**
`localStorage` under `euangelion:listen-queue`, an array of slugs — order is the
array. It works signed-out (which the table would not have), it adds no migration
to a queue that already has three unapplied billing migrations in front of it,
and it ships Phase 5 without a founder DDL gate.

The table lands only if Listen Later proves used — and then it is a real SA with
a real decision, phrased honestly: _an ordered list is the one thing the
`session_bookmarks` shape cannot carry, so the choice is a fourth migration or an
unordered set._ That is a founder call at that point, not now.

**Position and completion** stay in `listening_progress`. The cursor stays in the
store.

### 2.6 The rulings that turn a data shape into a product

A struct is not a product. These are the reader-facing decisions, made:

- **Naming.** `queue` is the internal word and appears in no reader-facing copy.
  The reader sees exactly three nouns: **Up Next** (the current queue),
  **Listen Later** (the one saved list), **The Quiet Hour** (the daily one).
  "Playlist" is never shown to a reader.
- **Starting a queue while one is playing: replace, immediately, no prompt.**
  Position in the outgoing track is already persisted, so nothing is lost, and a
  confirm dialog on a play button is hostile. The replaced queue is not
  recoverable and does not need to be — every derived queue rebuilds from its
  source in microseconds.
- **A saved slug that stops resolving.** Listen Later filters to delivered tracks
  at render, but shows the count it dropped: "6 readings — 1 unavailable." A list
  that silently shrinks reads as data loss. Nothing is deleted from storage; a
  track that comes back reappears.
- **Cursor vs. stored position on re-entry.** They answer different questions and
  neither overrides the other: the **queue's `cursor` decides which track**, and
  **`listening_progress` decides where in it**. If you left Up Next on item 3 and
  separately finished item 3 on your phone, you re-enter at item 3, at 0:00,
  because `completed_at` is set.
- **IA — who owns "Rekindled".** `/series/[slug]` owns every series. **`/listen`
  never lists series**; it lists _sessions_ — continue listening, The Quiet Hour,
  Listen Later, by-length, and the year. A reader on `/listen` who wants the
  Rekindled arc is sent to `/series/rekindled`. This is what keeps `/listen` from
  becoming a second, worse browse page.

---

## 3. Surfaces an audio-forward site needs

### New

| Surface                            | What it is                                                                                                                                                                                                                                                                              | Size  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **`/listen`**                      | The audio home. Continue listening, The Quiet Hour, Listen Later, "by length" (under 10 / 10–20 / 20+ min), and the year. Sessions, never series (§2.6). The single biggest new thing in the strategy.                                                                                  | M     |
| **`NowPlayingSheet`**              | Full-screen now-playing: series artwork, title, chapters, Up Next, transport, speed, sleep. The global bar expands into it. Absorbs the **four** sheets `NarrationPlayer` already has (`NarrationChapters`, `SpeedSheet`, `SleepTimer`, `TransportSheet`) rather than duplicating them. | M     |
| **`QueueSheet`**                   | Up Next: reorder, remove, "play from here", "clear". Only meaningful for `saved`; read-only for derived queues.                                                                                                                                                                         | S     |
| **`ListenAffordance`**             | Play/pause + duration + progress ring, one component, every list row on the site. Building this once is what makes the site _feel_ audio-forward rather than having six inconsistent play buttons. **Sized M, not S** — see below.                                                      | **M** |
| **`downloadsStore` + download UI** | §5.                                                                                                                                                                                                                                                                                     | M     |

**`ListenAffordance` is the riskiest UI item here, and it is not S.**
"Every list row" means `/series` rails, `/series/[slug]` day lists,
`/library`, the homepage hero, `/today` and `/sunday` — six surfaces, six data
shapes, six existing card markups. And it walks straight into a known trap:
`EditorialMotionSystem` claims `::after` on every `.mock-paper` button and link at
runtime (documented at `globals.css:14330` and `:15496`), so any new
pseudo-element geometry on those elements un-collapses a hidden underline into a
painted slab. **A progress ring is exactly that shape of change: build it on
`::before`, or on a real child element.** The component is M; the six
integrations are Phase 7 and are M as well.

### Adapted

| Surface                                   | Change                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`NarrationMiniBar` → `GlobalAudioBar`** | Becomes a layout singleton driven by the store: play/pause, title, tap-to-expand. **Queue position ("3 of 7") and next/prev arrive with the queues in Phase 3, not with the bar in Phase 2** — shipping dead transport affordances is worse than shipping none. Its `data-narration-bar` effect must gate on _visibility_, not mount. |
| **`NarrationPlayer`**                     | Loses all state; becomes the reader's presentational view onto the store. 1,289 lines. This is the refactor risk the old plan already flags.                                                                                                                                                                                          |
| **`AudioPlayer`**                         | Stops branching engines at render. `SpeechSynthesisPlayer` is demoted to a per-page fallback that is **never** queue-eligible (§6.2).                                                                                                                                                                                                 |
| **`/series/[slug]`**                      | "Listen — 42 min" becomes a peer of the read CTA; the day list gets `ListenAffordance` per row.                                                                                                                                                                                                                                       |
| **`/series/bible-365`**                   | The biggest single win (§4.5).                                                                                                                                                                                                                                                                                                        |
| **`/library`**                            | New `?tab=listening` — continue listening, downloads, Listen Later. `/library` already handles `?tab=` deep links.                                                                                                                                                                                                                    |
| **`/settings`**                           | New Audio section: default speed, skip interval, auto-advance, download-over-cellular, default sleep timer, and (if it ever ships) voice.                                                                                                                                                                                             |
| **`MobileTabBar`**                        | Six tabs today. Whether LISTEN becomes a seventh, replaces one, or stays off is a founder call (§8).                                                                                                                                                                                                                                  |

---

## 4. What audio-forward changes about existing surfaces

The governing rule, stated as a rule because it settles a dozen individual
arguments:

> **Audio outranks reading wherever the unit is longer than the attention a
> screen realistically gets. Reading outranks audio wherever the unit is one
> sitting.**

A series is longer than a sitting. The year is much longer. A single day is not.

### 4.1 Homepage

Today's reading gets its **duration** and an inline `ListenAffordance` in the
hero, beside the existing primary CTA — not replacing it. Play and read are
co-equal here.

**One exception, earned rather than assumed:** if the reader's last three
sessions were listening sessions, promote play to primary. That signal is
available — `listening_progress.last_played_at` versus `progressStore.completions`
— but only once §2.5's recent query exists, and only for signed-in readers. It is
a Phase 7 refinement, not a Phase 1 behaviour.

### 4.2 `/series` (the rails)

Duration badge on every card. `ListenAffordance` on hover (desktop) and in the
card's overflow (mobile). **Play does not outrank here** — a rail is a browse
surface, and hijacking a card tap into playback is what makes music apps feel
hostile.

### 4.3 `/series/[slug]`

**Play outranks.** The natural queue entry point and where the founder's sentence
most obviously cashes out. "Listen — 42 min" primary, "Start reading" secondary,
per-day affordances below.

### 4.4 The reader

**Reading outranks. Always.** The reader is the reading. The panel stays exactly
where it is. The only change is that it is a view onto a store rather than the
owner of the audio, and that the mini bar it spawns is no longer its child.

### 4.5 `/series/bible-365`

The one that is already a podcast and is not being treated as one. 365 days ×
~11.4 min = **69.5 hours** (measured) that nobody is going to read on a screen.

Give it: resume-at-day-N, a continuous queue with auto-advance **on**, a
day-picker, and a visible "Day 47 of 365". This is the strongest argument for the
whole strategy and the clearest proof that Phase 0 is Phase 0 — right now **all
365 of those tracks 404 in production**.

### 4.6 `/library`, `/today`, `/sunday`

- `/library`: play outranks on the listening tab; read outranks everywhere else.
- `/today`, `/sunday`: co-equal, side by side. Single short pieces.

---

## 5. Offline and downloads

The service worker deliberately caches images, devotional JSON, and reading
routes, and deliberately does **not** touch `/audio/*`. That is currently correct
— an accidental cache-first rule over 7 MB tracks would exhaust the origin-private
quota in an afternoon. The audio-forward version keeps that instinct and adds
explicit downloads.

**Recommendations, in order of how badly they bite if ignored:**

1. **A separate cache bucket, `euangelion-audio-v1` — never `CACHE_NAME`.**
   The `activate` handler deletes every cache whose key `!== CACHE_NAME`, and
   `CACHE_NAME` (`euangelion-v118`) bumps on _every_ client-code deploy. Putting
   audio in `CACHE_NAME` means **every deploy silently wipes every download**.
   One line of code, and the single most expensive mistake available here.
2. **Synthesize `206` responses for Range requests.** A `Response` stored in the
   Cache API is a full `200`. Safari's media element issues `Range` requests and
   will not reliably play a media response served as `200` from a service worker
   — it stalls or refuses to seek. The SW's audio handler must read the cached
   full body, slice it per the `Range` header, and return a real `206` with
   `Content-Range`. Missing this is the classic "downloads work on Chrome, do
   nothing on iPhone" bug.
3. **Downloads are always a user action.** Never automatic, never "we noticed you
   like this series." Granularity: one day, one series, or the active plan.
   Never "download everything" — 98.6 hours / 3.70 GiB.
4. **Check quota first, and be honest about iOS.** Call
   `navigator.storage.estimate()` and refuse when free space is under ~2× the
   request, with a real message rather than a silent failure (Development Rule 1).
   Call `navigator.storage.persist()`; where it is **not** granted — the normal
   case for an iOS PWA — label the control **"Keep on this device"** and say
   plainly that the system may clear it. **Do not promise offline listening on
   iOS.** Under-promise; Safari evicts.
5. **`downloadsStore`** (persisted, `euangelion-downloads`): `slug → {bytes, at}`.
   The Cache API is the truth; the store is the index, so no surface has to
   enumerate the cache to render a row. Reconcile on app start, not per render.
6. **Downloads follow the queue, not the page.** "Download this plan" and
   "download The Quiet Hour" are the two that matter. A per-devotional button is
   nice; a per-_queue_ one is the feature.

---

## 6. Failure modes specific to queues

### 6.1 Autoplay policy

The second track plays **only** because the element carrying it was unlocked by a
user gesture on the first. Rules:

- **The very first `.play()` of a session must be called synchronously inside the
  tap handler, on the module-scope element** — not after an `await`, not after a
  store round-trip, not after a `fetch`. This is the single rule the whole feature
  rests on, and it is the one the "start The Quiet Hour with one tap" card
  (§2.3) is most likely to break, because that card wants to _assemble_ a queue
  before playing. Assemble first, then play; or play a known first item and
  assemble behind it.
- One element, whole session. Swap `.src`, never construct.
- `.play()` is legal from the `ended` handler of an already-unlocked element. It
  is not legal after a `fetch` or `await` chain that loses the gesture.
- `.play()` returns a promise. **Handle the rejection.** A rejected play in a
  queue must stop the queue and surface a visible "tap to continue" state — not
  advance silently, and not swallow the error.
- Strict Mode double-invoke can burn the unlock. Another reason for §1.1.
- **Route and device changes.** Bind `pause` to the element's `devicechange`/
  output-change path so pulling out AirPods stops playback rather than blasting
  the phone speaker in a quiet room, and re-set `MediaSession` state when the
  AirPlay target changes. Neither is exotic; both are what "a persistent player"
  means to someone wearing headphones.

### 6.2 A track with no audio

Three numbers disagree: 575 devotionals, 550 manifest entries, 170 delivered.

**"Filter by the manifest" is not the fix, and the earlier draft was wrong to
present it as one.** The manifest _is_ the 550-entry list that promises all 365
gitignored `bible-365` files. Filtering by manifest catches only the **25**
devotionals with no entry; it catches **none of the 380** entries that 404. There
is no runtime signal for "shipped" — `.gitignore:132` removes the files and the
manifest is unaware.

So there are exactly two honest routes, and the plan takes both:

1. **Phase 0 lands first**, after which manifest membership and deliverability are
   the same thing and filtering by manifest is finally correct. This is the plan.
2. **Until then, the manifest must record delivery.** Add a per-entry field
   (`delivered: boolean`, or a `channel: "git" | "r2"`) written by the publish
   step — never by hand — and have every queue builder require it. This is a
   change to `src/data/audio-manifest.json`'s schema and to the renderer that
   writes it; it is not a change any UI code can make for itself.

The rest still holds:

- **Tell the truth at build time, not at play time.** "5 of 7 days have audio" on
  the series page. A queue that silently skips two days reads as a bug.
- **`SpeechSynthesisPlayer` is never queue-eligible.** Not a media element, so it
  cannot hold the lock screen, cannot hold the gesture unlock, and dies when the
  screen sleeps — the exact limits the rendered-audio pipeline was written to
  escape. Retire it once R2 lands and coverage is complete.
- **A manifest entry whose file does not exist is a lie, and nothing catches it
  today.** There is no `verify:narration` in `package.json` and no voice-lock
  check in the husky chain. The old plan's §5 proposed a verifier for
  _key ↔ devotional_ drift; this one is a different check — _key ↔ shipped file_
  — and both belong in the same script, in the `verify:*` chain. This is small
  and it is the thing standing between us and §0 repeating.

### 6.3 The seven `he-cannot-deny-himself` and seven `rekindled` tracks

**Correcting the earlier draft, which got this backwards.** Measured from the
manifest, the 14 `elevenlabs` entries are exactly `he-cannot-deny-himself-day-1..7`
and `rekindled-day-1..7`, all voiced `chris-james-thca-master`. **That is the
founder's own cloned voice**, and SA-043 locks it: _"Voice Master V-3 is what I
want the devotionals to sound like"_ — the clone "carries the
he-cannot-deny-himself series and every NEW devotional from here," with Kokoro
`am_michael` keeping the back catalog. Calling these "the defective ones" and
gating Phase 3 on re-rendering them onto `chatterbox_turbo` is a **voice change
that reverses a registered founder decision**, presented as a cleanup. It is
withdrawn.

What is actually wrong with those tracks is narrower and still real: no
per-segment pause grammar, no round-trip verification, and at least one shipped

> **RETRACTED 2026-08-19, verified by direct measurement.** `he-cannot-deny-himself-day-4`
> is **not damaged.** The tail from 1420s to the 1541.2s end was re-transcribed in nine
> tight slices cut at silence boundaries, and every segment is present, correct and in
> order — including the Cranmer biography ("Imprisoned under Mary I, degraded from office
> at Christ Church, Oxford, on 14 February 1556...") and the closing line, which lands
> cleanly on the last frame with no repetition after it.
>
> The "restarts a sentence and cuts mid-phrase" report came from transcribing a 71-second
> slice in ONE request. Whisper hallucinated a repeated tail on it — it emitted
> "Cranmer is not in this reading as a hero of the six that did not" twice after the real
> ending. Cut the same audio at its pauses and the duplication disappears. This is the
> same class of error as the false "115 missing words" report on `rekindled-day-1`, and it
> is exactly what `strip_hallucination()` in `render_chatterbox.py` exists to defend
> against. **Never accept a defect report drawn from a single long-slice transcript.**
>
> One real defect did surface, and it is systemic rather than specific to this track: the
> heading "The Voice Behind Today" is **spoken twice** (once as its own segment, once
> inside the text). That is the double-say affecting 464 devotionals, which
> `dedup_headings()` addresses on the new engine.

truncation (`he-cannot-deny-himself-day-4`). In a queue they play unattended,
with nobody watching. So:

**The Phase 3 gate is verification, not re-voicing.** Before queues ship, all 14
must pass round-trip transcribe verification against their `textHash`, and
`day-4`'s truncation must be repaired **on the engine SA-043 names** (ElevenLabs
IVC, `eleven_v3`, stability 0.5). That gate is compatible with SA-043 and this
document can assert it.

**The engine question is separate, founder-owned, and not a prerequisite here.**
`chatterbox_turbo` appears in this repo only in
`docs/audio/AUDIO-ENGINE-RESEARCH-2026-08-19.md`, whose own header says
_"research record. Not a contract — nothing here is registered in
`docs/production-decisions.yaml` or a feature PRD yet."_ That document lists
"re-render scope" as **open question #2 the founder still owes an answer on**. An
unregistered engine cannot gate a phase against a registered ruling. If the
founder does move the voice to Chatterbox, it is an **SA-043 amendment** with its
own decision record, and the strategy below is unaffected either way — every
surface here is engine-agnostic.

### 6.4 iOS lock screen with a changing queue

- **Re-set `MediaSession.metadata` on every advance**, and set it **after**
  `loadedmetadata`, not before the `.src` swap — iOS otherwise shows the previous
  track's artwork against the new title.
- `previoustrack`/`nexttrack` are currently bound to `stepChapter(∓1)`.
  **Recommendation: with a queue active they step tracks; with no queue they step
  chapters.** Bind `seekbackward`/`seekforward` to the ±15/30 skips in both cases,
  so the skip affordance never disappears from the lock screen. (Recommended, not
  asked — say so if it is wrong.)
- Set `navigator.mediaSession.playbackState` explicitly on every transition.
  Leaving it at `none` is why lock-screen buttons go dead rather than stale.
- Set `positionState` on seek and on advance, or the scrubber shows the previous
  track's duration.

### 6.5 Position tracking across a queue

- **`lastPushAt` is module-global** (`listening-progress.ts:123`), shared across
  every slug. Advance from A to B within 30 s of A's last write and B's early
  writes are dropped. Make it a `Map<slug, number>`. Wrong-by-construction today;
  actively wrong in a queue.
- **The `ended` flush writes `seconds: 0`** (`NarrationPlayer.tsx:243`), so a
  "continue listening" list ordered by `last_played_at DESC` would show finished
  tracks at 0:00 as though never started. **The fix is entirely on the read
  side.** `completed_at` is _already written correctly_ —
  `listening-progress-repository.ts:143` does
  `completed_at: params.ended ? (existing?.completedAt ?? now) : …`, with a
  comment explaining that re-listening must not un-finish a reading. The earlier
  draft told the next engineer to add a write that exists, which would have
  changed nothing and left the bug live. **The recent query (§2.5) must exclude
  non-null `completed_at`.** Nothing else is needed.
- **Soft navigation never flushes.** `pagehide` and `visibilitychange` do not fire
  on a Next.js client-side route change, and there is no unmount flush. Position
  is up to 5 s stale locally and 30 s stale on the server, every navigation. A bug
  **today**; a global player makes it fire twenty times a session. Flush on track
  change and on route change in Phase 1.
- **Rebind restore before you optimise it.** `restorePosition`
  (`NarrationPlayer.tsx:175`) `await`s `fetchServerPosition(slug)` at `:185` and
  is bound to `loadedmetadata` at `:732`. Swapping `.src` re-fires
  `loadedmetadata`, so "fetch item n+1's position during item n" is **not a
  prefetch — it is moving where restore is bound**, from a media event to the
  queue's advance path. Do that deliberately in Phase 3, and keep a
  `loadedmetadata` fallback for the no-queue case. Warming the _bytes_ is the easy
  half and stays a plain `fetch()` of the next `src` in the last ~30 s;
  `/audio/*` is `immutable`, so the HTTP cache does the rest and no second element
  is needed.

### 6.6 Two tabs

Two tabs, two root-mounted transports, both restore, both play. Use a
`BroadcastChannel('euangelion-audio')`: on play, tell the others to pause. Cheap,
and without it the first bug report is "it played twice."

### 6.7 Page-coupled effects

`data-narrating` on `#devotional-section-N` and `seekToChapter`'s
`scrollIntoView` will target whatever page is visible. Guard every one of them on
`playingSlug === visibleSlug`. Without it, listening to Day 3 while browsing
Day 5 highlights the wrong paragraphs on the wrong reading.

### 6.8 Bottom-of-viewport collision

`.narration-mini` (`position: fixed; bottom: 0`) and `.mobile-tab-bar` have never
coexisted, because the bar only exists on the reader route. As a layout singleton
they will.

**Recommendation: the bar sits _above_ the tab bar, and the tab bar does not
hide.** Hiding primary navigation to make room for a player is how an
audio-forward site starts feeling like it has hijacked the app.

**There is no height token to offset against — one has to be created.** Measured:
there is no `--tab-bar-height` (or any tab-bar height variable) anywhere in
`src/app/globals.css` or `design-system/`. `.mobile-tab-bar` is defined at
`globals.css:9537` and inside `@media (max-width: 900px)` at `:9542`, with
`padding: 0.34rem 0.25rem calc(env(safe-area-inset-bottom, 0px) + 0.34rem)` and no
declared height; the only number that stands for its height today is the `body`
clearance in the same block, `padding-bottom: calc(3.7rem +
env(safe-area-inset-bottom, 0px))`. So:

- Declare `--tab-bar-height: calc(3.7rem + env(safe-area-inset-bottom, 0px))`
  **inside the same `@media (max-width: 900px)` block** — the bar does not exist
  above 900px, so an offset defined outside it would push the player off a
  desktop viewport for no reason. Note the breakpoint is **900px, not 768px**.
- Rewrite the existing `body { padding-bottom: … }` to use the new token, so the
  bar's height and the page's clearance can never drift apart again.
- Then `bottom: var(--tab-bar-height, 0px)` on `.narration-mini`, and add the
  player's own height to the `body` clearance when it is visible.

Bottom-chrome measurement is a known-hostile area in this codebase
(`--mock-h-topbar: 42px` already lies at mobile). Measure in the browser before
believing any of these numbers.

### 6.9 Sleep timer meets queue

A sleep timer that expires mid-queue must **stop the queue**, not advance past the
fade. And "end of track" as a sleep option becomes ambiguous — define it as the
end of the _current track_, never the end of the queue, and label it "after this
reading."

### 6.10 Deploy-size ceiling

25 MiB per asset is a hard Cloudflare limit. Five tracks sit at 21.16–21.50 MiB
and the scored re-render runs 115–172 kbps. Per §0's table: at 126 kbps one track
breaks the deploy; at 172 kbps, nineteen do. **Pin an encode ceiling computed from
the longest track in the catalogue (currently `the-harvest-day-3`, 28.2 min) —
that is **≤124 kbps** for a 25 MiB budget — or land R2 first.** Discovering this at
deploy time costs a failed release, not a slow one.

---

## 7. Phases

**These do not all ship independently.** Dependencies are named.

| #     | Phase                                                                                   | Size  | Risk           | Depends on                                    | Ships                                      |
| ----- | --------------------------------------------------------------------------------------- | ----- | -------------- | --------------------------------------------- | ------------------------------------------ |
| **0** | **Delivery: R2 for `/audio/*`**                                                         | **L** | **High (ops)** | —                                             | Nothing visible. Unlocks everything.       |
| 1     | Lift the transport (old plan §4) + soft-nav flush                                       | M     | High           | —                                             | Nothing visible; audio survives navigation |
| 2     | `GlobalAudioBar` (play/pause/title/expand only) + per-slug throttle                     | S     | Low            | 1                                             | The founder's first sentence               |
| 3     | Queues: series, plan, `bible-365`; `NowPlayingSheet`; `QueueSheet`; bar gains next/prev | M     | Medium         | 1, 2, **0** (for `bible-365`)                 | The founder's second sentence              |
| 4     | `/listen`, continue listening, The Quiet Hour                                           | M     | **Medium**     | 3, **0** (Quiet Hour slot 3), **018 applied** | Audio becomes a destination                |
| 5     | Listen Later (`localStorage`, ordered)                                                  | S     | Low            | 3                                             | The one authored list                      |
| 6     | Downloads                                                                               | M     | Medium-high    | 3                                             | Offline listening                          |
| 7     | `ListenAffordance` across six surfaces + re-rank (§4)                                   | M     | Low            | 2                                             | The posture                                |

**Phase 0 is not optional and not deferrable.** 2.60 GiB of `bible-365` is
gitignored and 404s in production; 0.66 GiB of audio is already in the deploy tree
and every additional series makes each release slower. Doing Phases 1–4 on a
catalog that is **31% delivered** produces a beautiful queue that plays nothing.

**Phase 4 is not "Low" risk and is not free.** It needs a repository function, an
endpoint, an RLS review, and pagination that do not exist (§2.5) — plus a
confirmed-applied migration 018, plus Phase 0 for one of the Quiet Hour's four
slots.

**Gate on Phase 3:** all 14 founder-voiced tracks verified and `day-4`'s
truncation repaired, on the engine SA-043 names (§6.3). The engine question is a
separate decision and does not gate anything here.

**Honest risk notes.** Phase 1 remains the scariest — it refactors 1,289 lines of
`NarrationPlayer` that currently work, with no visible payoff. Phase 6 is the
sleeper: the two service-worker traps in §5 are each a single small mistake that
produces a symptom pointing somewhere else entirely. Phase 7 looks like polish
and is six integrations into six different card markups, one of which is a known
pseudo-element minefield (§3).

**Deliberately not here.** Named user playlists (§2.2). Sharing. Social /
what-others-are-listening-to. A separate audio app. A `listen_queue` table
(§2.5). Rendering audio on demand for generated `/daily-bread` days — noted as
open question #6 in the engine research and correctly deferred.

---

## 8. Founder decisions

Split deliberately. The first list changes what gets built. The second is
already decided in this document and is here so it can be overruled, not
re-litigated.

### 8.1 These change the build — they need answers

1. **Posture, and bingeing.** (a) Is audio _equal_ to reading, or _primary_?
   Everything in §4 is written for "equal, with audio winning where the unit is
   long." If the answer is "primary," `/listen` becomes the homepage and the tab
   bar changes. (b) §2.4 stops a series queue at the end of the day you started,
   because reading a 7-day arc in 50 minutes is a worse spiritual outcome than
   reading it over 7 mornings. Agree, or should a series play straight through?
2. **The Quiet Hour.** Is a daily assembled ~40-minute queue the right idea, and
   is that the right name? The one genuinely new product concept here, and the
   piece most worth killing early if it is wrong.
3. **The tab bar.** Six tabs today (TODAY, DAILY BREAD, SERIES, SOUL AUDIT,
   LIBRARY, YOU). Does LISTEN become a seventh, replace one, or live inside
   LIBRARY?
4. **Offline on iOS.** Ship a download feature we cannot guarantee (Safari
   evicts), labelled honestly — or hold it until there is a native shell?
5. **Is migration 018 applied in production?** Not a preference — a fact this
   document does not have, and Phase 4 cannot be scheduled without it. If it is
   not applied, applying it is additive and idempotent and precedes Phase 4.
6. **The voice engine — but not as a gate.** The engine research doc records
   ElevenLabs at ~$842 for a whole-catalogue render versus $0 on Chatterbox
   Turbo, _per render_, and every copy fix or pause-grammar change pays it again.
   That is a genuine SA-043 amendment question and it is yours. **This strategy
   does not need the answer** — §6.3's Phase 3 gate is verification on the
   current engine, and every surface here is engine-agnostic.

### 8.2 Decided here — overrule if wrong, but they are not open

- **Lock screen.** With a queue active, `next`/`previous` step **tracks**;
  with none, **chapters**. Skips stay bound in both cases (§6.4).
- **The bar appears on legal and marketing pages.** The alternative — audio
  playing with no visible control — is worse, and the cost is a player over the
  privacy policy.
- **The 14 founder-voiced tracks are verified, not re-voiced, before Phase 3**
  (§6.3). SA-043 stands.
- **No `listen_queue` table.** Listen Later v1 is `localStorage`, ordered, and
  works signed-out; SA-039 §2's precedent is to _decline_ a fourth migration, not
  to approve one (§2.5).
- **R2 spend is not a real question at this volume.** 3.70 GiB of storage at
  R2's published $0.015/GB-month with zero egress is single-digit cents a month —
  smaller than any other line item in the project, and it removes 0.66 GiB from
  every deploy. **Recommendation: do it.** The decision worth your attention is
  the ops work and the new account dependency (Phase 0, L, high-risk), not the
  bill.
- **Scoring is per-series, not catalogue-wide.** Music beds cost storage and push
  long tracks into the 25 MiB deploy failure (§6.10: at the highest observed
  scored rate, 19 tracks would break the build). More to the point, §2.4's own
  posture says a formation series can earn production value while a 365-day
  reading plan does not need it. Score what earns it.
