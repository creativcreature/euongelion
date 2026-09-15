/**
 * Reader-path loaders for Daily Bread V2. Read-only, no generation, no
 * providers. Failures THROW (the route renders a visible failure state).
 */
import { getDailyBreadRepository, type DailyBreadRepository } from './repository'
import {
  addDays,
  editorialDate,
  isValidDateSlug,
  PRESS_GRACE_MINUTES,
  rolloverInstant,
  systemClock,
  type EditorialClock,
} from './time'
import type { ArchiveEntry, DailyEdition } from './types'

/**
 * Plan §31. `current`: today's paper. `on-press`: inside the grace window
 * after rollover, the previous paper is shown while today's is published.
 * `last-known-good`: past the grace window with no paper for today, which is a
 * failure. The previous paper is shown under its own date, and the route raises
 * a critical alert. The route resolves by query (the newest published paper on
 * or before today), so there is no separate pointer to drift out of step.
 */
export type LiveEditionStatus = 'current' | 'on-press' | 'last-known-good'

export interface LiveEditionView {
  edition: DailyEdition | null
  liveDate: string
  status: LiveEditionStatus
  /** True when today's paper is not published yet and an older one is shown. */
  isFallbackToPrevious: boolean
  /** Minutes since today's rollover (negative never happens: liveDate has rolled over). */
  minutesAfterRollover: number
  neighbors: { previous: ArchiveEntry | null; next: ArchiveEntry | null }
}

export async function loadLiveEdition(
  clock: EditorialClock = systemClock,
  repo: DailyBreadRepository = getDailyBreadRepository(),
): Promise<LiveEditionView> {
  const now = clock.now()
  const liveDate = editorialDate(now)
  const edition = await repo.getLatestPublished(liveDate)
  const neighbors = edition
    ? await repo.getNeighbors(edition.editionDate)
    : { previous: null, next: null }
  const minutesAfterRollover = Math.floor((now.getTime() - rolloverInstant(liveDate).getTime()) / 60_000)
  const isToday = edition?.editionDate === liveDate
  const isFallbackToPrevious = Boolean(edition) && !isToday
  return {
    edition,
    liveDate,
    status: isToday ? 'current' : minutesAfterRollover < PRESS_GRACE_MINUTES ? 'on-press' : 'last-known-good',
    isFallbackToPrevious,
    minutesAfterRollover,
    neighbors,
  }
}

export async function loadEditionForDate(
  date: string,
  repo: DailyBreadRepository = getDailyBreadRepository(),
): Promise<{ edition: DailyEdition; neighbors: { previous: ArchiveEntry | null; next: ArchiveEntry | null } } | null> {
  if (!isValidDateSlug(date)) return null
  const edition = await repo.getEdition(date)
  if (!edition) return null
  const neighbors = await repo.getNeighbors(date)
  return { edition, neighbors }
}

/** A month key, YYYY-MM. */
export function isValidMonthSlug(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

function firstOfNextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

/** "September 2026". */
export function formatArchiveMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export interface ArchiveMonthView {
  /** The month shown; null only when nothing has been published. */
  month: string | null
  /** That month's editions in date order (1st → last). */
  entries: ArchiveEntry[]
  /** The nearest earlier / later month that has an edition. */
  previousMonth: string | null
  nextMonth: string | null
}

/**
 * The archive, one month at a time (plan §14). No month (or an invalid one)
 * means the newest month with an edition. Adjacent-month links skip months
 * with nothing in them, so they never lead to an empty page.
 */
export async function loadArchiveMonth(
  month: string | undefined,
  repo: DailyBreadRepository = getDailyBreadRepository(),
): Promise<ArchiveMonthView> {
  let shown = isValidMonthSlug(month) ? month : undefined
  if (!shown) {
    const [latest] = await repo.listArchive({ limit: 1 })
    if (!latest) return { month: null, entries: [], previousMonth: null, nextMonth: null }
    shown = latest.editionDate.slice(0, 7)
  }
  const start = `${shown}-01`
  const nextStart = firstOfNextMonth(shown)
  const [inMonth, earlier, neighbors] = await Promise.all([
    repo.listArchive({ limit: 31, onOrAfter: start, before: nextStart }),
    repo.listArchive({ limit: 1, before: start }),
    repo.getNeighbors(addDays(nextStart, -1)),
  ])
  return {
    month: shown,
    entries: [...inMonth].reverse(),
    previousMonth: earlier[0]?.editionDate.slice(0, 7) ?? null,
    nextMonth: neighbors.next?.editionDate.slice(0, 7) ?? null,
  }
}

/** "Vol. 1 · No. 001" for native editions; archive entries are unnumbered. */
export function serialLabel(e: { archiveOrigin: string; volume: number | null; issue: number | null }): string {
  if (e.archiveOrigin !== 'native' || e.issue === null || e.volume === null) {
    return 'From the archive · unnumbered'
  }
  return `Vol. ${e.volume} · No. ${String(e.issue).padStart(3, '0')}`
}
