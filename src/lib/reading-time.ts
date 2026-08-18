import audioManifest from '@/data/audio-manifest.json'

/**
 * Estimated reading time for a devotional (backlog #26).
 *
 * "Do I have time for this right now" is the actual question at 6am, and the
 * cards answered it only in days, never in minutes.
 * [Waking Up](https://mobbin.com/screens/ebca587a-c673-4ea4-8e73-8885604daee0)
 * puts a duration on every item in a course list for exactly this reason.
 *
 * WHERE THE NUMBER COMES FROM, AND WHAT IT IS NOT.
 *
 * `audio-manifest.json` already carries a real `words` count per devotional —
 * 535 of 575 — because the narration pipeline had to count them. Reusing it
 * avoids inventing a second index over the same corpus, and avoids reading
 * `public/devotionals` at runtime, which returns nothing on Workers.
 *
 * The caveat, stated rather than buried: that count is of the NARRATION SCRIPT,
 * and the audio segmenter deliberately omits pull quotes, captions, CTAs and
 * art blocks. So this is a slight UNDERESTIMATE of the full page, not a
 * measurement of it. That is the right direction to be wrong in for a "do I
 * have time" signal, and it is why the label says "min read" rather than a
 * precise duration.
 *
 * Devotionals with no entry return `null` and the caller shows nothing. A
 * missing estimate is better than a fabricated one.
 */

/** Adult silent-reading pace for prose of this density. */
const WORDS_PER_MINUTE = 200

type ManifestEntry = { words?: number }

const MANIFEST = audioManifest as unknown as Record<string, ManifestEntry>

export function readingMinutes(devotionalSlug: string): number | null {
  const words = MANIFEST[devotionalSlug]?.words
  if (typeof words !== 'number' || words <= 0) return null
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

/** `"9 min read"`, or null when the corpus has no word count for this slug. */
export function readingTimeLabel(devotionalSlug: string): string | null {
  const minutes = readingMinutes(devotionalSlug)
  return minutes === null ? null : `${minutes} min read`
}
