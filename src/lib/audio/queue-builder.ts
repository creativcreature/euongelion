import { SERIES_DATA } from '@/data/series'
import { getNarrationTrack } from '@/lib/audio/tracks'
import type { QueueItem } from '@/stores/audioStore'

/**
 * Turning content into something playable.
 *
 * One rule governs every builder here: **a queue only ever contains readings
 * that actually have a track.** A queue that hits a silent item is worse than
 * a shorter queue, because it reads as the player being broken rather than the
 * catalogue being partial. Filtering happens here, once, rather than being
 * rediscovered at each call site.
 */

export function itemForSlug(
  slug: string,
  title: string,
  context?: string,
): QueueItem | null {
  const track = getNarrationTrack(slug)
  if (!track) return null
  return {
    slug,
    title,
    src: track.src,
    duration: track.duration,
    href: `/devotional/${slug}`,
    context,
  }
}

/** Every delivered day of a series, in order. */
export function buildSeriesQueue(seriesSlug: string): QueueItem[] {
  const series = SERIES_DATA[seriesSlug]
  if (!series) return []
  return series.days
    .map((day) => itemForSlug(day.slug, day.title, series.title))
    .filter((item): item is QueueItem => item !== null)
}

/**
 * A series queue starting at a given day.
 *
 * Returns the index alongside the items because the day a reader picked may
 * not be the nth delivered one — any undelivered day before it shifts the
 * position, and starting at the wrong reading is the kind of bug that looks
 * like the queue ignoring you.
 */
export function seriesQueueFrom(
  seriesSlug: string,
  slug: string,
): { items: QueueItem[]; index: number } {
  const items = buildSeriesQueue(seriesSlug)
  const index = items.findIndex((i) => i.slug === slug)
  return { items, index: index === -1 ? 0 : index }
}

/** Total runtime of a queue, in seconds. */
export function queueDuration(items: QueueItem[]): number {
  return items.reduce((total, item) => total + item.duration, 0)
}

/** "42 min" / "1 hr 12 min" — the length a listener is committing to. */
export function formatRuntime(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`
}

/**
 * A series queue that BEGINS at a given day and runs to the end.
 *
 * Distinct from `seriesQueueFrom`, which keeps the whole series and moves the
 * cursor. On /today the reader's place in a series is the point, and offering
 * to replay days already behind them would be a different, worse product — so
 * here the earlier days are dropped rather than skipped.
 *
 * Falls back to the whole series when the day has no track of its own, because
 * an unnarrated day mid-series should not silence everything after it.
 */
export function queueFromDay(seriesSlug: string, slug: string): QueueItem[] {
  const all = buildSeriesQueue(seriesSlug)
  const from = all.findIndex((item) => item.slug === slug)
  return from === -1 ? all : all.slice(from)
}

/**
 * The queue for a reading opened on its own page.
 *
 * Founder: "The sidebar (universal player) should also que other devotionals,
 * not just the chapters." Registering only the reading you pressed play on left
 * Up Next permanently empty — a queue of one. This finds the series the reading
 * belongs to and queues it FROM that day, so day three does not offer to replay
 * days one and two.
 *
 * Falls back to the reading alone when it belongs to no series in `SERIES_DATA`
 * (a generated day, an archive piece), because a lone reading is still a valid
 * thing to be playing.
 */
export function queueForReading(
  slug: string,
  title: string,
): { items: QueueItem[]; label: string | null } {
  for (const seriesSlug of Object.keys(SERIES_DATA)) {
    const series = SERIES_DATA[seriesSlug]
    if (!series?.days?.some((day) => day.slug === slug)) continue
    const items = queueFromDay(seriesSlug, slug)
    if (items.length) return { items, label: series.title }
  }
  const solo = itemForSlug(slug, title)
  return { items: solo ? [solo] : [], label: null }
}
