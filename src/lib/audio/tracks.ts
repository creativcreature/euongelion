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
  // immutable cache (see public/_headers) — necessary because a 22-minute
  // track is ~8 MB, and because Cloudflare satisfies the Range requests that
  // make seeking cheap by slicing its OWN cached copy, which requires the
  // response to be cacheable. Immutable would otherwise pin a stale reading in
  // browsers after a re-render, so changing audio changes the URL.
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
