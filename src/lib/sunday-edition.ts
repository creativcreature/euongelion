/**
 * sunday-edition.ts
 *
 * Deterministic weekly selection for the Sunday Edition long-form surface.
 *
 * Algorithm: pool of long-form series slugs (series with 5+ days and rich
 * theological depth, ranked by content size). Each ISO week number (0-indexed)
 * selects a series, then within the series each week rotates through days.
 * Same ISO week always returns the same piece — server, client, and crawler
 * all agree with no database round-trip.
 *
 * Content loading mirrors today-devotional.ts:
 *   Strategy 1 → Node fs.readFile (dev / Node runtime)
 *   Strategy 2 → self-fetch via NEXT_PUBLIC_APP_URL (Cloudflare Workers)
 */

import type { Devotional } from '@/types'

// ---------------------------------------------------------------------------
// Long-form Sunday pool — series ordered by content depth + theological range.
// Each entry: [seriesSlug, daySlug].  We pre-specify WHICH day from each
// series is the Sunday pick so the editorial intent is explicit rather than
// purely algorithmic.
// ---------------------------------------------------------------------------

export interface SundayEditionEntry {
  seriesSlug: string
  daySlug: string
  /** Series title — used for archive display without loading JSON. */
  seriesTitle: string
  /** ISO week label when this entry is "current" — computed at render time. */
  label?: string
}

/**
 * Curated Sunday rotation.  51 entries (one per week, cycling annually).
 * Weighted toward the deepest doctrinal series.  Bible-365 days are excluded
 * (they are daily-canonical, not long-form magazine pieces).
 */
export const SUNDAY_ROTATION: SundayEditionEntry[] = [
  // The Work of God (6 days of rich depth)
  {
    seriesSlug: 'the-work-of-god',
    daySlug: 'the-work-of-god-day-1',
    seriesTitle: 'The Work of God',
  },
  {
    seriesSlug: 'the-work-of-god',
    daySlug: 'the-work-of-god-day-2',
    seriesTitle: 'The Work of God',
  },
  {
    seriesSlug: 'the-work-of-god',
    daySlug: 'the-work-of-god-day-3',
    seriesTitle: 'The Work of God',
  },
  {
    seriesSlug: 'the-work-of-god',
    daySlug: 'the-work-of-god-day-4',
    seriesTitle: 'The Work of God',
  },
  {
    seriesSlug: 'the-work-of-god',
    daySlug: 'the-work-of-god-day-5',
    seriesTitle: 'The Work of God',
  },
  {
    seriesSlug: 'the-work-of-god',
    daySlug: 'the-work-of-god-day-6',
    seriesTitle: 'The Work of God',
  },
  // What Happens When You Repeatedly Sin (6 days)
  {
    seriesSlug: 'what-happens-when-you-repeatedly-sin',
    daySlug: 'what-happens-when-you-repeatedly-sin-day-2',
    seriesTitle: 'What Happens When You Repeatedly Sin?',
  },
  {
    seriesSlug: 'what-happens-when-you-repeatedly-sin',
    daySlug: 'what-happens-when-you-repeatedly-sin-day-3',
    seriesTitle: 'What Happens When You Repeatedly Sin?',
  },
  {
    seriesSlug: 'what-happens-when-you-repeatedly-sin',
    daySlug: 'what-happens-when-you-repeatedly-sin-day-4',
    seriesTitle: 'What Happens When You Repeatedly Sin?',
  },
  {
    seriesSlug: 'what-happens-when-you-repeatedly-sin',
    daySlug: 'what-happens-when-you-repeatedly-sin-day-5',
    seriesTitle: 'What Happens When You Repeatedly Sin?',
  },
  {
    seriesSlug: 'what-happens-when-you-repeatedly-sin',
    daySlug: 'what-happens-when-you-repeatedly-sin-day-6',
    seriesTitle: 'What Happens When You Repeatedly Sin?',
  },
  // What Does It Mean to Believe
  {
    seriesSlug: 'what-does-it-mean-to-believe',
    daySlug: 'what-does-it-mean-to-believe-day-1',
    seriesTitle: 'What Does It Mean to Believe?',
  },
  {
    seriesSlug: 'what-does-it-mean-to-believe',
    daySlug: 'what-does-it-mean-to-believe-day-3',
    seriesTitle: 'What Does It Mean to Believe?',
  },
  {
    seriesSlug: 'what-does-it-mean-to-believe',
    daySlug: 'what-does-it-mean-to-believe-day-4',
    seriesTitle: 'What Does It Mean to Believe?',
  },
  {
    seriesSlug: 'what-does-it-mean-to-believe',
    daySlug: 'what-does-it-mean-to-believe-day-6',
    seriesTitle: 'What Does It Mean to Believe?',
  },
  // What Is Christianity
  {
    seriesSlug: 'what-is-christianity',
    daySlug: 'what-is-christianity-day-1',
    seriesTitle: 'What Is Christianity?',
  },
  {
    seriesSlug: 'what-is-christianity',
    daySlug: 'what-is-christianity-day-3',
    seriesTitle: 'What Is Christianity?',
  },
  {
    seriesSlug: 'what-is-christianity',
    daySlug: 'what-is-christianity-day-5',
    seriesTitle: 'What Is Christianity?',
  },
  // Signs, Boldness, Opposition, Integrity
  {
    seriesSlug: 'signs-boldness-opposition-integrity',
    daySlug: 'signs-boldness-opposition-integrity-day-1',
    seriesTitle: 'Signs, Boldness, Opposition, Integrity',
  },
  // Witness Under Pressure
  {
    seriesSlug: 'witness-under-pressure-expansion',
    daySlug: 'witness-under-pressure-expansion-day-1',
    seriesTitle: 'Witness Under Pressure & Expansion',
  },
  // What Is the Gospel
  {
    seriesSlug: 'what-is-the-gospel',
    daySlug: 'what-is-the-gospel-day-1',
    seriesTitle: 'What Is the Gospel?',
  },
  {
    seriesSlug: 'what-is-the-gospel',
    daySlug: 'what-is-the-gospel-day-2',
    seriesTitle: 'What Is the Gospel?',
  },
  {
    seriesSlug: 'what-is-the-gospel',
    daySlug: 'what-is-the-gospel-day-3',
    seriesTitle: 'What Is the Gospel?',
  },
  {
    seriesSlug: 'what-is-the-gospel',
    daySlug: 'what-is-the-gospel-day-4',
    seriesTitle: 'What Is the Gospel?',
  },
  {
    seriesSlug: 'what-is-the-gospel',
    daySlug: 'what-is-the-gospel-day-5',
    seriesTitle: 'What Is the Gospel?',
  },
  // Why Jesus
  {
    seriesSlug: 'why-jesus',
    daySlug: 'why-jesus-day-1',
    seriesTitle: 'Why Jesus?',
  },
  {
    seriesSlug: 'why-jesus',
    daySlug: 'why-jesus-day-2',
    seriesTitle: 'Why Jesus?',
  },
  {
    seriesSlug: 'why-jesus',
    daySlug: 'why-jesus-day-3',
    seriesTitle: 'Why Jesus?',
  },
  {
    seriesSlug: 'why-jesus',
    daySlug: 'why-jesus-day-4',
    seriesTitle: 'Why Jesus?',
  },
  {
    seriesSlug: 'why-jesus',
    daySlug: 'why-jesus-day-5',
    seriesTitle: 'Why Jesus?',
  },
  // What Is Carrying a Cross
  {
    seriesSlug: 'what-is-carrying-a-cross',
    daySlug: 'what-is-carrying-a-cross-day-1',
    seriesTitle: 'What Is Carrying a Cross?',
  },
  {
    seriesSlug: 'what-is-carrying-a-cross',
    daySlug: 'what-is-carrying-a-cross-day-2',
    seriesTitle: 'What Is Carrying a Cross?',
  },
  {
    seriesSlug: 'what-is-carrying-a-cross',
    daySlug: 'what-is-carrying-a-cross-day-3',
    seriesTitle: 'What Is Carrying a Cross?',
  },
  // The Nature of Belief
  {
    seriesSlug: 'the-nature-of-belief',
    daySlug: 'the-nature-of-belief-day-1',
    seriesTitle: 'The Nature of Belief',
  },
  {
    seriesSlug: 'the-nature-of-belief',
    daySlug: 'the-nature-of-belief-day-2',
    seriesTitle: 'The Nature of Belief',
  },
  {
    seriesSlug: 'the-nature-of-belief',
    daySlug: 'the-nature-of-belief-day-3',
    seriesTitle: 'The Nature of Belief',
  },
  // Abiding in His Presence
  {
    seriesSlug: 'abiding-in-his-presence',
    daySlug: 'abiding-in-his-presence-day-1',
    seriesTitle: 'Abiding in His Presence',
  },
  {
    seriesSlug: 'abiding-in-his-presence',
    daySlug: 'abiding-in-his-presence-day-2',
    seriesTitle: 'Abiding in His Presence',
  },
  {
    seriesSlug: 'abiding-in-his-presence',
    daySlug: 'abiding-in-his-presence-day-3',
    seriesTitle: 'Abiding in His Presence',
  },
  {
    seriesSlug: 'abiding-in-his-presence',
    daySlug: 'abiding-in-his-presence-day-4',
    seriesTitle: 'Abiding in His Presence',
  },
  // Hearing God in the Noise
  {
    seriesSlug: 'hearing-god-in-the-noise',
    daySlug: 'hearing-god-in-the-noise-day-1',
    seriesTitle: 'Hearing God in the Noise',
  },
  {
    seriesSlug: 'hearing-god-in-the-noise',
    daySlug: 'hearing-god-in-the-noise-day-2',
    seriesTitle: 'Hearing God in the Noise',
  },
  {
    seriesSlug: 'hearing-god-in-the-noise',
    daySlug: 'hearing-god-in-the-noise-day-3',
    seriesTitle: 'Hearing God in the Noise',
  },
  // Once Saved Always Saved
  {
    seriesSlug: 'once-saved-always-saved',
    daySlug: 'once-saved-always-saved-day-1',
    seriesTitle: 'Once Saved, Always Saved?',
  },
  {
    seriesSlug: 'once-saved-always-saved',
    daySlug: 'once-saved-always-saved-day-2',
    seriesTitle: 'Once Saved, Always Saved?',
  },
  // In the Beginning
  {
    seriesSlug: 'in-the-beginning-week-1',
    daySlug: 'in-the-beginning-week-1-day-1',
    seriesTitle: 'In the Beginning',
  },
  {
    seriesSlug: 'in-the-beginning-week-1',
    daySlug: 'in-the-beginning-week-1-day-2',
    seriesTitle: 'In the Beginning',
  },
  // The Word Before Words
  {
    seriesSlug: 'the-word-before-words',
    daySlug: 'the-word-before-words-day-1',
    seriesTitle: 'The Word Before Words',
  },
  {
    seriesSlug: 'the-word-before-words',
    daySlug: 'the-word-before-words-day-2',
    seriesTitle: 'The Word Before Words',
  },
  // Genesis: Two Stories of Creation
  {
    seriesSlug: 'genesis-two-stories-of-creation',
    daySlug: 'genesis-two-stories-of-creation-day-1',
    seriesTitle: 'Genesis: Two Stories of Creation',
  },
  // The Blueprint of Community
  {
    seriesSlug: 'the-blueprint-of-community',
    daySlug: 'the-blueprint-of-community-day-1',
    seriesTitle: 'The Blueprint of Community',
  },
] as const

// ---------------------------------------------------------------------------
// ISO week number (1-indexed, follows ISO 8601)
// ---------------------------------------------------------------------------

/**
 * Returns the ISO 8601 week number for the given date.
 * Week 1 = the week containing the year's first Thursday.
 */
export function isoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  // Set to nearest Thursday: current date + 4 - current day number; Monday = 1
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** ISO year (may differ from calendar year in early Jan / late Dec) */
export function isoWeekYear(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  return d.getUTCFullYear()
}

/**
 * Pick this week's Sunday Edition entry.
 * Deterministic: same ISO week → same entry, every time, on every runtime.
 */
export function pickSundayEntry(date: Date = new Date()): SundayEditionEntry {
  const week = isoWeekNumber(date)
  const year = isoWeekYear(date)
  // Mix year+week into a stable index so different years don't repeat
  // the exact same weekly sequence (but do cycle after SUNDAY_ROTATION.length years).
  const combined = (year * 53 + (week - 1)) % SUNDAY_ROTATION.length
  return SUNDAY_ROTATION[combined]!
}

/**
 * Returns the last N Sunday Edition entries (most recent first),
 * used for the archive grid.
 */
export function getSundayArchive(
  fromDate: Date = new Date(),
  count: number = 12,
): Array<SundayEditionEntry & { isoWeek: number; isoYear: number }> {
  const results: Array<
    SundayEditionEntry & { isoWeek: number; isoYear: number }
  > = []
  const d = new Date(
    Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
    ),
  )

  for (let i = 0; i < count; i++) {
    const entry = pickSundayEntry(d)
    results.push({
      ...entry,
      isoWeek: isoWeekNumber(d),
      isoYear: isoWeekYear(d),
    })
    // Step back 7 days
    d.setUTCDate(d.getUTCDate() - 7)
  }
  return results
}

// ---------------------------------------------------------------------------
// "Week of Month Day, Year" label — e.g. "Week of June 8, 2026"
// ---------------------------------------------------------------------------

export function formatSundayEditionDate(date: Date = new Date()): string {
  // Rewind to the Monday of the current ISO week
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (day - 1)) // Monday
  return `Week of ${d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })}`
}

// ---------------------------------------------------------------------------
// Content fetch (mirrors today-devotional.ts strategy)
// ---------------------------------------------------------------------------

export async function fetchSundayDevotional(
  slug: string,
): Promise<Devotional | null> {
  // Strategy 1: Node fs (dev + Node runtimes)
  try {
    const { promises: fs } = await import('node:fs')
    const { join } = await import('node:path')
    const filePath = join(
      process.cwd(),
      'public',
      'devotionals',
      `${slug}.json`,
    )
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as Devotional
  } catch {
    // Workers runtime — fall through to self-fetch.
  }

  // Strategy 2: self-fetch via NEXT_PUBLIC_APP_URL (Cloudflare Workers)
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
  ).replace(/\/$/, '')

  try {
    const res = await fetch(`${baseUrl}/devotionals/${slug}.json`, {
      next: { revalidate: 86_400 }, // 24 h — content is weekly
    })
    if (!res.ok) return null
    return (await res.json()) as Devotional
  } catch {
    return null
  }
}
