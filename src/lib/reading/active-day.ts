/**
 * The reader's ACTIVE DAY — where they actually are in their active series.
 *
 * Founder, 2026-08-14: "The Active devotional should always show the active day
 * as well. Not just default to day one. If I mark it done, the next day should
 * show."
 *
 * Two halves were both missing, and each is useless without the other:
 *
 *  1. NOTHING ADVANCED THE DAY. `PATCH /api/devotionals/active` has accepted a
 *     `currentDay` since 2026-05-14 and clamps it to the series length, but no
 *     client ever called it. `active_series.current_day` therefore sat at
 *     whatever it was set to when the series was started — usually 1 — no
 *     matter how many days the reader finished. Completion was recorded only in
 *     localStorage (`euangelion-progress`), which the server never sees.
 *
 *  2. NOTHING LINKED TO IT. Surfaces that knew the day still linked past it:
 *     the library's ACTIVE card printed "Day 3" above a button to a bare
 *     `/daily-bread`, and a saved series row resolved to `/series/<slug>`,
 *     which opens the arc at the top. The reader was told where they were and
 *     then sent somewhere else.
 *
 * This module owns both halves so they cannot drift apart again.
 *
 * It deliberately does NOT fall back to day 1. A day that cannot be resolved
 * returns null and the caller links to the series page, which is honest about
 * being the whole arc. Silently substituting day 1 is what made the bug look
 * like working software.
 */
import { SERIES_DATA } from '@/data/series'
import { seriesSlugOf } from '@/lib/library/series-save'

export interface DayLocation {
  seriesSlug: string
  day: number
  slug: string
  title: string
  /** Total days in the series — callers render "Day 3 of 7" from this. */
  dayCount: number
}

/**
 * Locate a devotional slug inside its series.
 *
 * Resolution goes through `seriesSlugOf` (which carries the one historical
 * `identity-crisis` -> `identity` rename) and is then CONFIRMED against
 * SERIES_DATA rather than trusted. A slug that parses like a day but is not
 * actually in the series returns null instead of a plausible-looking guess.
 */
export function locateDay(devotionalSlug: string): DayLocation | null {
  const seriesSlug = seriesSlugOf(devotionalSlug)
  if (!seriesSlug) return null
  const series = SERIES_DATA[seriesSlug]
  if (!series) return null
  const day = series.days.find((entry) => entry.slug === devotionalSlug)
  if (!day) return null
  return {
    seriesSlug,
    day: day.day,
    slug: day.slug,
    title: day.title,
    dayCount: series.days.length,
  }
}

/** The devotional slug for day `day` of `seriesSlug`, or null if it has no such day. */
export function daySlugFor(seriesSlug: string, day: number): string | null {
  const series = SERIES_DATA[seriesSlug]
  if (!series) return null
  return series.days.find((entry) => entry.day === day)?.slug ?? null
}

/**
 * Where "continue reading" should point for a reader on `currentDay` of
 * `seriesSlug`.
 *
 * Falls back to the SERIES page — never to day 1 — when the day cannot be
 * resolved, so a data problem reads as "here is the whole series" rather than
 * quietly restarting someone three days in.
 */
export function activeDayHref(
  seriesSlug: string,
  currentDay: number | null | undefined,
): string {
  if (typeof currentDay === 'number' && Number.isFinite(currentDay)) {
    const slug = daySlugFor(seriesSlug, Math.floor(currentDay))
    if (slug) return `/devotional/${slug}`
  }
  return `/series/${seriesSlug}`
}

/** "Day 3 of 7" — or "Day 3" when the total is unknown. */
export function activeDayLabel(
  seriesSlug: string,
  currentDay: number | null | undefined,
): string | null {
  if (typeof currentDay !== 'number' || !Number.isFinite(currentDay)) return null
  const total = SERIES_DATA[seriesSlug]?.days.length
  const day = Math.floor(currentDay)
  return total ? `Day ${day} of ${total}` : `Day ${day}`
}

/**
 * The day the reader should land on next, given what they have finished.
 *
 * `completedSlugs` is the local progress set. The answer is the first day of
 * the series that is NOT complete — not "last completed + 1", which skips a
 * gap when someone reads out of order and then lands them past unread material.
 * Returns null when the series is finished.
 */
export function nextUnreadDay(
  seriesSlug: string,
  completedSlugs: ReadonlySet<string>,
): DayLocation | null {
  const series = SERIES_DATA[seriesSlug]
  if (!series) return null
  const next = series.days.find((entry) => !completedSlugs.has(entry.slug))
  if (!next) return null
  return {
    seriesSlug,
    day: next.day,
    slug: next.slug,
    title: next.title,
    dayCount: series.days.length,
  }
}

// ---------------------------------------------------------------------------
// Advancing the server's active day
// ---------------------------------------------------------------------------

/** Dispatched when the server day could not be advanced. Surfaced, never swallowed. */
export const ACTIVE_DAY_ADVANCE_FAILED = 'activeDayAdvanceFailed'

/** Dispatched after the server day moves, so open surfaces can refresh. */
export const ACTIVE_DAY_ADVANCED = 'activeDayAdvanced'

export type AdvanceOutcome =
  | { status: 'advanced'; seriesSlug: string; currentDay: number }
  | { status: 'not-applicable'; reason: string }
  | { status: 'failed'; error: unknown }

interface ActiveSeriesResponse {
  active?: { seriesSlug?: string; currentDay?: number } | null
}

/**
 * Advance `active_series.current_day` after the reader finishes a day.
 *
 * Runs only when the finished day belongs to the reader's active series and is
 * at or past the day the server currently thinks they are on — re-reading day 2
 * of a series you have read to day 5 must not drag you backwards.
 *
 * Anonymous readers have no active_series row; the GET simply returns no active
 * series and this reports `not-applicable`. That is a real state, not a failure.
 *
 * A genuine write failure is reported and announced on the window. It is NOT
 * swallowed: the local completion still stands, but the caller can tell the
 * reader their place did not save rather than pretending it did.
 */
export async function advanceActiveDayAfterCompletion(
  completedSlug: string,
): Promise<AdvanceOutcome> {
  if (typeof window === 'undefined') {
    return { status: 'not-applicable', reason: 'server' }
  }

  const location = locateDay(completedSlug)
  if (!location) {
    return { status: 'not-applicable', reason: 'not-a-series-day' }
  }

  try {
    const currentResponse = await fetch('/api/devotionals/active', {
      credentials: 'same-origin',
    })
    // 401/403 = signed out. Anonymous readers keep local progress only.
    if (currentResponse.status === 401 || currentResponse.status === 403) {
      return { status: 'not-applicable', reason: 'signed-out' }
    }
    if (!currentResponse.ok) {
      throw new Error(`GET /api/devotionals/active ${currentResponse.status}`)
    }

    const current = (await currentResponse.json()) as ActiveSeriesResponse
    const activeSlug = current.active?.seriesSlug
    if (!activeSlug) {
      return { status: 'not-applicable', reason: 'no-active-series' }
    }
    if (activeSlug !== location.seriesSlug) {
      return { status: 'not-applicable', reason: 'different-series' }
    }

    const serverDay = current.active?.currentDay ?? 1
    if (location.day < serverDay) {
      // Re-reading an earlier day. Leave their place alone.
      return { status: 'not-applicable', reason: 'behind-current-day' }
    }

    // The endpoint clamps to the series length, so finishing the final day
    // holds at the last day rather than running off the end.
    const nextDay = location.day + 1
    const patchResponse = await fetch('/api/devotionals/active', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentDay: nextDay }),
    })
    if (!patchResponse.ok) {
      throw new Error(`PATCH /api/devotionals/active ${patchResponse.status}`)
    }

    const updated = (await patchResponse.json()) as ActiveSeriesResponse
    const confirmedDay = updated.active?.currentDay ?? nextDay
    window.dispatchEvent(
      new CustomEvent(ACTIVE_DAY_ADVANCED, {
        detail: { seriesSlug: location.seriesSlug, currentDay: confirmedDay },
      }),
    )
    // The library listens to this to refetch its ACTIVE card.
    window.dispatchEvent(new CustomEvent('libraryUpdated'))

    return {
      status: 'advanced',
      seriesSlug: location.seriesSlug,
      currentDay: confirmedDay,
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        evt: 'active_day.advance_failed',
        completedSlug,
        seriesSlug: location.seriesSlug,
        day: location.day,
        message: error instanceof Error ? error.message : String(error),
      }),
    )
    window.dispatchEvent(
      new CustomEvent(ACTIVE_DAY_ADVANCE_FAILED, {
        detail: { completedSlug, seriesSlug: location.seriesSlug },
      }),
    )
    return { status: 'failed', error }
  }
}
