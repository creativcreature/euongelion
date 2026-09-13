/**
 * Pre-rendered narration tracks.
 *
 * The Audio Edition originally spoke through the browser's Web Speech API.
 * That has two hard limits: it sounds like a screen reader, and because
 * `speechSynthesis` is not a media element the browser will not treat it as
 * playing audio — so there is no lock-screen control, no background playback,
 * and iOS stops it the moment the screen sleeps. Reading while working was
 * therefore impossible by construction.
 *
 * Pre-rendered files fix both: a real `<audio>` element gets OS transport
 * controls, keeps playing in the background, and can be cached for offline.
 *
 * The manifest is written by `euangelion-voice-prototype/spec/render_kokoro.py
 * --publish`, which also encodes each track to AAC (~48 kbps mono, about
 * 8 MB for 22 minutes — well inside the 25 MiB Cloudflare Workers asset limit).
 * Devotionals with no track fall back to the Web Speech reader, so nothing
 * regresses while the catalog is still being rendered.
 */
import manifest from '@/data/audio-manifest.json'

/**
 * A navigable point in a reading.
 *
 * Derived from real render timings, never estimated from word counts — an
 * estimate drifts tens of seconds over a 20-minute track and lands mid
 * sentence. See `spec/build_chapters.py`, which refuses to emit a devotional
 * whose re-extraction does not match what was actually spoken.
 */
export interface NarrationChapter {
  /** Start time in seconds. */
  t: number
  /** The devotional's own heading where it has one, else the section's name. */
  label: string
  /** 1-based module index, matching the reader's `#devotional-section-N`
   *  anchors. 0 is the title, which precedes every module. */
  module: number
}

export interface NarrationTrack {
  /** Public URL of the encoded audio. */
  src: string
  /** Length in seconds — lets the player show duration before metadata loads. */
  duration: number
  /** Words narrated, for reference in tooling. */
  words: number
  /** Narrator voice id (e.g. "am_michael"). */
  voice: string
  /** Engine that produced it. */
  engine: string
  /** Encoded size in bytes. */
  bytes: number
  /** Navigable sections, earliest first. Absent on tracks rendered before
   *  chapters existed, or whose timings could not be verified. */
  chapters?: NarrationChapter[]
  /** Reading contract the track was rendered with (SA-141). Absent means 1,
   *  which is every track rendered before 2026-09-13. */
  contract?: number
}

const TRACKS = manifest as Record<string, NarrationTrack>

/** The pre-rendered track for a devotional slug, or null when not yet rendered. */
export function getNarrationTrack(
  slug: string | undefined,
): NarrationTrack | null {
  if (!slug) return null
  const track = TRACKS[slug]
  if (!track) return null
  // Version stamp from the encoded byte size. Audio is served with a one-year
  // immutable cache (see public/_headers), which matters because a 22-minute
  // track is ~8 MB and the default revalidation refetched it on every visit.
  // Immutable would otherwise pin a stale reading in browsers after a
  // re-render, so changing audio changes the URL.
  //
  // NOTE (2026-08-19, measured): a previous version of this comment claimed
  // Cloudflare satisfies Range requests by slicing its own cached copy. It
  // does not. A real GET carrying `Range: bytes=1000000-1000999` returns 200
  // and the ENTIRE body, cache hit or not, because Workers' static-asset layer
  // does not implement 206 Partial Content. `_headers` advertises
  // `Accept-Ranges: bytes` anyway, so every browser is told seeking is cheap
  // when each seek refetches the whole track. Serving audio from R2, which
  // reads byte ranges natively, is the fix — see docs/plans/AUDIO-FORWARD-STRATEGY.md.
  return track.src.includes('?')
    ? track
    : { ...track, src: `${track.src}?v=${track.bytes}` }
}

/** How many devotionals currently have narration. Used by tooling and tests. */
export function narrationTrackCount(): number {
  return Object.keys(TRACKS).length
}

/** Format seconds as m:ss for the transport display. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Labels that are module furniture rather than an editorial title.
 *
 * Measured over all 6,132 chapter marks in the manifest: Scripture 687,
 * Reflect 592, Word study 590, Opening 568, Prayer 520, Takeaway 487, plus 4
 * "Reflection" and 3 "Title" — 3,451 marks, 56.3% of the catalog. And 13% of
 * readings repeat a label;
 * `bible-365-day-1` says "Scripture" seven times.
 *
 * This matters because the player asks a listener to navigate by section NAME.
 * A name appearing three times in one reading cannot be the thing they aim at,
 * so these stay reachable — you may well want the prayer — but they never own
 * the headline, they take the short tick on the section rule, and they carry a
 * timecode to tell the repeats apart.
 *
 * Deliberately a fixed list rather than a heuristic: these come from the module
 * types in `narration_extract.py`, so the set is known instead of guessed, and
 * a new module type shows up as a failing tier test rather than as a chapter
 * that quietly changes tier. `__tests__/audio-chapter-tiers.test.ts` pins both
 * the 6,132/3,444 split and the two readings this leaves with a single
 * editorial chapter.
 */
const STRUCTURAL_LABELS = new Set([
  'opening',
  'title',
  'scripture',
  'word study',
  'reflect',
  'reflection',
  'prayer',
  'takeaway',
])

/** True when a chapter label is module furniture rather than an editorial title. */
export function isStructuralChapter(label: string): boolean {
  return STRUCTURAL_LABELS.has(label.trim().toLowerCase())
}

/**
 * The chapter containing `seconds`, or null before the first one.
 *
 * A linear scan is deliberate: chapter lists top out around two dozen entries,
 * so this costs less than the bookkeeping a binary search would need, and it
 * runs at most once per `timeupdate` tick.
 */
export function chapterAt(
  chapters: NarrationChapter[] | undefined,
  seconds: number,
): NarrationChapter | null {
  if (!chapters?.length) return null
  let found: NarrationChapter | null = null
  for (const chapter of chapters) {
    if (chapter.t <= seconds + 0.001) found = chapter
    else break
  }
  return found
}

/**
 * The current chapter WITH its boundaries.
 *
 * `chapterAt` answers "which chapter", which is enough to mark the section
 * being read. Two things need more than that: stepping between chapters, and
 * telling the reader how much of this one is left. Both need to know where the
 * chapter ends, and the last chapter has no successor to borrow that from —
 * hence `duration` as the closing boundary.
 *
 * Kept beside `chapterAt` and deliberately using the same `+ 0.001` comparison:
 * two functions answering "which chapter is this" from different arithmetic
 * would eventually disagree, and the reader would see the highlighted section
 * and the transport label point at different places.
 */
export function chapterBounds(
  chapters: NarrationChapter[] | undefined,
  seconds: number,
  duration: number,
): { index: number; start: number; end: number } | null {
  if (!chapters?.length) return null
  let index = 0
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].t <= seconds + 0.001) index = i
    else break
  }
  return {
    index,
    start: chapters[index].t,
    end: chapters[index + 1]?.t ?? duration,
  }
}

/**
 * Where "back a section" should land.
 *
 * Restart the current section unless it has only just begun, which is what
 * every audiobook player does and what a listener means by "back". Shared by
 * the section rule and drive mode so the grace period cannot drift between
 * two copies of the same rule.
 *
 * Returns null when there are no chapters, rather than guessing a position.
 */
export function sectionBack(
  chapters: NarrationChapter[] | undefined,
  seconds: number,
  duration: number,
  graceSeconds = 4,
): number | null {
  const bounds = chapterBounds(chapters, seconds, duration)
  if (!bounds || !chapters?.length) return null
  if (seconds - bounds.start > graceSeconds) return bounds.start
  return chapters[bounds.index - 1]?.t ?? bounds.start
}
