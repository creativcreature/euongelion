# HANDOFF — The Audio Player (2026-08-19/20)

**Purpose:** resume this work from zero context after a shutdown or compaction.

**Read these first, in order:**

1. This file — session state, rulings, findings, traps.
2. `docs/audio/PLAYER-GAP-ANALYSIS-2026-08-20.md` — the Mobbin research, with
   citations, and the corrected gap table.
3. `docs/feature-prds/F-164.md`, `F-165.md`, `F-167.md` — the three features.
4. `docs/production-decisions.yaml` — SA-119, SA-120, SA-122.

**Status:** **Shipped and live at v0.8.17 / service worker v149.** Every item
from the research is built except two, both named in §7. Three items are blocked
on the founder (§6). Nothing is half-built and unrecorded.

---

## 1. What the founder asked for

Three messages, in order:

> "the site should not be autoplaying.... and ther is no way to turn pause right
> now. the player didnt even detect the audio was playing."

> "desktop sidebar should contain universal player." … then, choosing option A
> from three rendered mockups: "both exist and basically are redundant. If onpage
> audio is playing, the its autoloaded in the que… I think?" … then "The sidebar
> (universal player) should also que other devotionals, not just the chapters."

> "the reader needs to be based on real world readers, you have a lotta missing
> features that are fairly standard for audio. players needs to be reworked based
> on research from mobbin... dont half ass it"

Plus, on process: "finish this thing and any unfinished approved tasks", and
"please continue I will test once everything is live and done- then tweak from
there."

---

## 2. Founder rulings this session — BINDING

| #   | Ruling                                                                                                 | Consequence                                                                           |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| R1  | **Option A**, chosen from mockups: sidebar is the full player, the reading's panel shrinks to one row. | SA-119 (sidebar half), SA-120 (panel half).                                           |
| R2  | **The sidebar queues other devotionals, not just chapters.**                                           | `queueForReading()`; playing a reading queues its series _from that day_.             |
| R3  | **Rework the player from Mobbin research.** "dont half ass it"                                         | SA-122; research doc with citations.                                                  |
| R4  | Terminology: **"I dont know what transport means."**                                                   | Say "the play controls". Never "transport" to the founder.                            |
| R5  | Standing, earlier: **"its ok that a person binge a series"**                                           | No per-source stopping rule in the queue, ever.                                       |
| R6  | Standing: **leave the other session's files alone; leave the 365 Bible alone.**                        | Bible-365 is read-only here. Its data is used for fallbacks and tests, never written. |

---

## 3. What shipped

| Version | Cache | What                                                           |
| ------- | ----- | -------------------------------------------------------------- |
| 0.8.8   | v139  | SA-119 — sidebar becomes the player; playing queues the series |
| 0.8.10  | v141  | SA-120 — the reading's panel is one row                        |
| 0.8.12  | v144  | SA-122 — volume, share, **`media-src` added to the CSP**       |
| 0.8.13  | v145  | The sidebar's missing stylesheet (§4.2)                        |
| 0.8.14  | v146  | styled-jsx `:global()` for `<Link>`-borne classes (§4.3)       |
| 0.8.15  | v147  | Cover art; the reading-on-page offer                           |
| 0.8.16  | v148  | Readings called by name, not by slot (§4.4)                    |
| 0.8.17  | v149  | The cover loads eagerly (§4.5)                                 |

The player now carries, against the eight surveyed: cover art, real titles, big
play/pause, ±15s, scrubber with elapsed and remaining, speed, sleep timer (that
stops, and fades), chapters, queue with Up Next, downloads, position-in-set,
volume, share, and section-level read-along.

---

## 4. Findings — every one verified against production, not inferred

### 4.1 The CSP had NO `media-src` — real defect, fixed

Confirmed live by listening for `securitypolicyviolation`:
`{ directive: 'media-src', blockedURI: 'blob', disposition: 'enforce' }`. With no
directive, media fell back to `default-src 'self'`, which does **not** cover
`blob:` — so the offline path, where the service worker synthesises 206 responses
from cached bytes, was blocked outright.

CHANGELOG already claimed "`media-src` now names the R2 host". **It did not.**
`__tests__/security.test.ts` asserts against a hardcoded **copy** of the header
(`REQUIRED_SECURITY_HEADERS`, ~line 187), so it could never have caught the
drift. `__tests__/csp-media.test.ts` now reads `next.config.ts` itself.

### 4.2 Half the sidebar had no CSS at all

`lsn-seek`, `lsn-seek-label`, `lsn-times`, `lsn-extras`, `lsn-chip` were in the
markup and in **no rule**. The player rendered `0:0011:18 left` and
`1x speedSleep timerChaptersShare` — everything still `display: block`. All five
were controls added the night before. **39 unit tests passed against it**, because
they query by role and an unstyled button is perfectly findable.

### 4.3 styled-jsx does not scope child components

`.lsn-text` is a `next/link` `<Link>`. styled-jsx appends its `jsx-<hash>` class
only to elements **it** emits; it cannot know a component forwards `className`.
So the anchor shipped as `class="lsn-text"` and the compiled
`.lsn-text.jsx-<hash>` could never match. Same for `.lsn-now`. Both fully
declared, both inert — queue rows read `ABIDING IN HIS PRESENCEDay 2` on one line.

**Fix pattern:** `:global()` under a scoped ancestor —
`.lsn-row :global(.lsn-text)` compiles to `.lsn-row.jsx-<hash> .lsn-text`, which
matches and does not leak.

### 4.4 The queue labelled readings by slot, not by name

`SERIES_DATA` generates days as ``title: `Day ${i + 1}` `` — placeholders. The
player, Up Next, header and offer all read "Day 2". **No new index was needed:**
`getDevotionalTitle()` has existed since 2026-05-13 and its generator header
states the purpose outright. The queue simply never asked. One lookup in
`itemForSlug` fixed all four surfaces.

### 4.5 The cover never loaded

`loading="lazy"`, `complete: false`, `currentSrc: ""` — the browser never started
the request; an empty 491×491 square. `next/image` lazy-loads by default via its
own IntersectionObserver, which never fires for markup mounted inside a panel
that slides in. A `new Image()` with the identical src loaded fine at 928×1152,
which ruled out the file, the URL and the CSP in one step. Both covers carry
`priority` now.

### 4.6 The sidebar's sleep timer did nothing

SA-119 gave it a chip and a sheet that opens, and it was called done. It recorded
the choice into state nothing read: set fifteen minutes, put the phone down, get
the whole reading. Worse than no timer, because the reader stops watching the
clock. It now counts against a wall-clock end time, handles end-of-chapter, and
**fades over five seconds** rather than cutting mid-sentence (behaviour ported
from the panel rather than deleted with it).

---

## 5. Traps for the next session

1. **Tests cannot see any of §4.2–4.5.** Unit tests query by role; type-check and
   lint never check that a `className` has a matching rule. Two guards now exist
   in `__tests__/audio-drawer-styles.test.ts`: one fails if any `lsn-` class in
   the markup has no rule, the other fails if a class on a capitalised JSX tag is
   not reached through `:global()`. **Copy this pattern to other styled-jsx
   components.**
2. **A backtick inside a CSS comment terminates the ``<style jsx>{`…`}``
   template literal.** Surfaces as `Parsing error: '}' expected`, pointing at CSS
   rather than at the comment.
3. **The MCP browser cannot verify playback.** The media element never leaves
   `readyState 0` even for an in-memory blob. See
   `memory/project_browser_cannot_decode_aac.md`. It also cannot resize:
   `innerWidth` stays 1706 whatever `resize_window` is given, so **mobile layout
   is unverifiable from a session.**
4. **Edge caching makes a good deploy look failed.** `curl` returned v147 three
   times after v148 was at 100%. Add a cache-busting query and retry before
   concluding anything; check `wrangler deployments list`.
5. **`npm run deploy` can fail with `fetch failed` and still exit 0.** Always grep
   the log for `Current Version ID` before claiming a deploy landed. One did fail
   this session and was briefly reported as live.
6. **`git commit && echo OK` chains hide husky failures.** A release commit failed
   the `feature-prd-link` gate while the following `git push` still ran, leaving
   the version bump uncommitted and the fix pushed.
7. **Parallel sessions.** Another session held `edition-*`, `hero-rotation`,
   `strip-reference` and `devotional-rekindled-video` throughout. Their tests were
   red at various points — that is theirs, not yours. Stage by explicit path;
   never `git add -A`.

---

## 6. BLOCKED ON THE FOUNDER — three items

### 6.1 Playback, the sleep timer, the fade, and mobile — need a real device

Everything measurable says the delivery path is correct: valid faststart AAC
(`afinfo` reports `optimized`, 405s), correct 206s with correct byte offsets,
`x-audio-origin: r2`, suffix ranges resolving to the end of the file. **But no
session can watch a reading play** (§5.3). Thirty seconds on a phone closes it.

### 6.2 The cover for some readings is an object plate

`abiding-in-his-presence-day-2` resolves to `obj-bronze-lyre-strings` — an object
plate. The locked imagery direction reserves object plates for **empty states**,
with luminous scenes on narrative surfaces
(`memory/feedback_imagery_dynamic_direction.md`). The player deliberately mirrors
whatever the reading page already shows, so this is the **page's** mapping and not
something the player introduced — but the player now gives it far more
prominence. Founder's call whether the mapping should change.

### 6.3 Naming the narrator — the pending disclosure ruling

ElevenReader names its voice ("Oliver Silk"), Speechify names its narrator
("MrBeast"). That real products name the voice is **evidence for** the founder's
pending ruling on disclosing that narration is synthesised, not a substitute for
it. Not built.

---

## 7. Not built, and why

- **Word/sentence-level read-along.** ElevenReader highlights the paragraph AND
  the word; Speechify the sentence. Needs per-word timings the render pipeline
  does not emit — the manifests carry chapter marks only (`{t, label, module}`).
  This is a **content-pipeline change, not a UI one.**
- **Named narrator** — §6.3.

**Correction on read-along:** the gap analysis originally listed section-level
read-along as missing. **It is not.** `NarrationPlayer` writes
`data-narrating="true"` onto `#devotional-section-N` as playback crosses each
section, and `globals.css` marks it with a 3px cobalt gutter rule (F-086 /
SA-035). Verified live: computes to `rgb(31, 42, 141)` at `3px`. The doc has been
corrected.

Noted while verifying: the accompanying wash,
`color-mix(in srgb, var(--color-gold) 3.5%, transparent)`, computes to fully
transparent (`oklab(0 0 0 / 0)`) rather than a faint tint, so it is currently
doing nothing. The gutter rule is the primary marker and works, so this is
cosmetic. Left unchanged rather than altering a design decision unasked.

---

## 8. Two claims I made and withdrew — do not re-inherit them

1. **"The browser cannot decode AAC."** Wrong. The blob that failed instantly was
   blocked by our own CSP (§4.1). Withdrawn. Properly isolated afterwards: with
   the service worker off, caches cleared and zero violations, an in-memory blob
   times out identically to the URL — so it is the media stack in that browser,
   not codecs, and not the site.
2. **"Section-level read-along is missing."** Wrong — it shipped months ago (§7).

Both were corrected in the docs and in `production-decisions.yaml` rather than
left standing.
