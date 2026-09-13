/**
 * Reader-path loaders for Daily Bread V2. Read-only, no generation, no
 * providers. Failures THROW (the route renders a visible failure state).
 */
import { getDailyBreadRepository, type DailyBreadRepository } from './repository'
import { editorialDate, isValidDateSlug, systemClock, type EditorialClock } from './time'
import type { ArchiveEntry, DailyEdition } from './types'

export interface LiveEditionView {
  edition: DailyEdition | null
  liveDate: string
  /** True when today's paper is not published yet and an older one is shown. */
  isFallbackToPrevious: boolean
  neighbors: { previous: ArchiveEntry | null; next: ArchiveEntry | null }
}

export async function loadLiveEdition(
  clock: EditorialClock = systemClock,
  repo: DailyBreadRepository = getDailyBreadRepository(),
): Promise<LiveEditionView> {
  const liveDate = editorialDate(clock.now())
  const edition = await repo.getLatestPublished(liveDate)
  const neighbors = edition
    ? await repo.getNeighbors(edition.editionDate)
    : { previous: null, next: null }
  return {
    edition,
    liveDate,
    isFallbackToPrevious: Boolean(edition && edition.editionDate !== liveDate),
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

export const ARCHIVE_PAGE_SIZE = 30

export async function loadArchivePage(
  before: string | undefined,
  repo: DailyBreadRepository = getDailyBreadRepository(),
): Promise<{ entries: ArchiveEntry[]; nextBefore: string | null }> {
  const cursor = before && isValidDateSlug(before) ? before : undefined
  const entries = await repo.listArchive({ limit: ARCHIVE_PAGE_SIZE + 1, before: cursor })
  const page = entries.slice(0, ARCHIVE_PAGE_SIZE)
  const nextBefore = entries.length > ARCHIVE_PAGE_SIZE ? page[page.length - 1].editionDate : null
  return { entries: page, nextBefore }
}

/** "Vol. 1 · No. 001" for native editions; archive entries are unnumbered. */
export function serialLabel(e: { archiveOrigin: string; volume: number | null; issue: number | null }): string {
  if (e.archiveOrigin !== 'native' || e.issue === null || e.volume === null) {
    return 'From the archive · unnumbered'
  }
  return `Vol. ${e.volume} · No. ${String(e.issue).padStart(3, '0')}`
}
