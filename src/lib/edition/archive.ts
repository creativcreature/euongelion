/**
 * The Daily Bread archive (SA-114 / F-158). Founder: "the daily bread
 * should have an archived page area to see past daily bread content."
 *
 * Every past edition stays readable at /daily-bread/archive/[date] — the
 * same EditionPage the live paper uses, keyed to that date, so an archived
 * paper renders exactly as it printed (deterministic modules recompute from
 * the date; DB rows are already immutable history).
 */
import { effectiveEditionDate } from './deadline'

/** The engine's first paper — nothing before this exists to read. */
export const FIRST_EDITION = '2026-08-18'

/** Past editions, newest first: yesterday's (relative to the LIVE edition,
 *  which is not archive) back to the first paper, capped at a month. */
export function editionArchiveDates(now: Date = new Date()): string[] {
  const live = effectiveEditionDate(now)
  const dates: string[] = []
  const cursor = new Date(`${live}T00:00:00Z`)
  for (let i = 0; i < 31; i++) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    const iso = cursor.toISOString().slice(0, 10)
    if (iso < FIRST_EDITION) break
    dates.push(iso)
  }
  return dates
}

/** Is this date a readable archived edition? */
export function isArchivedEdition(
  dateIso: string,
  now: Date = new Date(),
): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(dateIso) &&
    dateIso >= FIRST_EDITION &&
    dateIso < effectiveEditionDate(now)
  )
}
