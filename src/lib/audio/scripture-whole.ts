/**
 * A book of scripture, read end to end.
 *
 * This is the one audio-native-shaped format that needs no new recording, and
 * the reason is already in the catalogue: `bible-365` is 365 delivered tracks
 * whose readings run in canonical order. Grouped by book rather than by day,
 * consecutive days become a long-form piece — and long-form is precisely what
 * the measured catalogue does not have. Nothing in the library runs past 28
 * minutes; 36 of the runs below clear 40, and 26 land inside the 40–90 minute
 * band the format is specified for.
 *
 * The unit of length here is the QUEUE, not the track. Each item is still an
 * eleven-minute reading, so it still satisfies the occasion picker's per-piece
 * ceiling, still resumes per track, and still survives being stopped halfway.
 * A single 90-minute file would do none of that.
 *
 * Book identity comes from `parseReference`, which is the site's only scripture
 * reference parser. That matters for correctness rather than tidiness: a naive
 * "strip the trailing numbers" split treats the corpus's thematic headings —
 * `Sabbath`, `Selected`, `Amos, Hosea, Micah` — as books, and would offer a
 * listener a "book" that is not one. `lookupBookId` rejects all three.
 */
import B365_REFS from '@/data/bible-365-refs.json'
import { BIBLE_BOOK_META, type BibleBookId } from '@/lib/bible/books'
import { parseReference } from '@/lib/bible/parseReference'
import { getNarrationTrack } from '@/lib/audio/tracks'
import type { QueueItem } from '@/stores/audioStore'

const REFS = B365_REFS as Record<string, string>

/** Days run 1..365; the map is keyed by the day number as a string. */
const DAY_COUNT = 365

export interface ScriptureBookRun {
  book: BibleBookId
  name: string
  testament: 'OT' | 'NT'
  /** Day numbers, ascending and consecutive. */
  days: number[]
  /** Total runtime in seconds, from the manifest. */
  duration: number
}

/**
 * Consecutive runs of days covering the same book.
 *
 * Runs, not sets. A book the plan revisits later in the year is a second run,
 * and merging them would produce a queue that jumps years of reading context to
 * stitch together something nobody asked for. Each run is a thing you can
 * listen to from beginning to end.
 */
/**
 * Computed once. The inputs are two static imports, so the answer cannot change
 * within a session — and this runs in the browser, where recomputing 365
 * reference parses on every occasion change is a cost a phone would feel.
 */
let cached: ScriptureBookRun[] | null = null

export function scriptureBookRuns(): ScriptureBookRun[] {
  if (cached) return cached
  const runs: ScriptureBookRun[] = []

  for (let day = 1; day <= DAY_COUNT; day += 1) {
    const reference = REFS[String(day)]
    if (!reference) continue
    const parsed = parseReference(reference)
    // Thematic headings that are not books resolve to null, and are skipped —
    // which also breaks the run, correctly: they are not part of the book
    // either side of them.
    if (!parsed) continue

    const track = getNarrationTrack(`bible-365-day-${day}`)
    if (!track) continue

    const last = runs[runs.length - 1]
    const contiguous = last && last.days[last.days.length - 1] === day - 1
    if (last && last.book === parsed.book && contiguous) {
      last.days.push(day)
      last.duration += track.duration
      continue
    }

    const meta = BIBLE_BOOK_META[parsed.book]
    runs.push({
      book: parsed.book,
      name: meta.name,
      testament: meta.testament,
      days: [day],
      duration: track.duration,
    })
  }

  cached = runs
  return runs
}

/**
 * Book runs long enough to be worth offering as long-form.
 *
 * The floor is the format's own, from `FORMAT_META['scripture-whole']`. A
 * fourteen-minute "book" offered as a long drive is a broken promise, so short
 * runs stay where they already work — inside the year plan, a day at a time.
 */
export function longFormBookRuns(minMinutes = 40): ScriptureBookRun[] {
  return scriptureBookRuns().filter((run) => run.duration >= minMinutes * 60)
}

/** A run as a playable queue, in canonical order. */
export function buildBookQueue(run: ScriptureBookRun): QueueItem[] {
  const items: QueueItem[] = []
  for (const day of run.days) {
    const slug = `bible-365-day-${day}`
    const track = getNarrationTrack(slug)
    // Cannot happen for a run built above, which only admits delivered days —
    // but a queue that hits a silent item reads as the player being broken, so
    // the guarantee is enforced here too rather than assumed.
    if (!track) continue
    items.push({
      slug,
      title: REFS[String(day)] ?? `Day ${day}`,
      src: track.src,
      duration: track.duration,
      href: `/devotional/${slug}`,
      context: run.name,
    })
  }
  return items
}

/** The longest run of a given book, or null when the book is not covered. */
export function bookRun(book: BibleBookId): ScriptureBookRun | null {
  const runs = scriptureBookRuns().filter((run) => run.book === book)
  if (runs.length === 0) return null
  return runs.reduce((longest, run) =>
    run.duration > longest.duration ? run : longest,
  )
}
