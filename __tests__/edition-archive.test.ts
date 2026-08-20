/**
 * SA-114 / F-158 — founder: "the daily bread should have an archived page
 * area to see past daily bread content."
 *
 * The archive lists every past edition from the engine's first paper to
 * YESTERDAY's (the live paper is not the archive), newest first, capped at
 * a month of links per page of the index.
 */
import { describe, expect, it } from 'vitest'
import { editionArchiveDates, FIRST_EDITION } from '@/lib/edition/archive'

describe('the edition archive', () => {
  it('runs newest-first from yesterday back toward the first edition, capped at 31', () => {
    const dates = editionArchiveDates(new Date('2026-08-20T15:00:00Z')) // post-flip Aug 20
    expect(dates[0]).toBe('2026-08-19')
    expect(dates.at(-1)).toBe(FIRST_EDITION)
    expect(dates.length).toBeLessThanOrEqual(31)
    expect(dates).not.toContain('2026-08-20') // the live paper is not archive
  })

  it('before the 7am flip, the still-live yesterday edition is not archived yet', () => {
    const dates = editionArchiveDates(new Date('2026-08-20T09:00:00Z')) // 5am ET — live edition is Aug 19
    expect(dates[0]).toBe('2026-08-18')
    expect(dates).not.toContain('2026-08-19')
  })

  it('answers empty (never throws) when the paper is too young to have an archive', () => {
    expect(editionArchiveDates(new Date('2026-08-18T15:00:00Z'))).toEqual([])
  })
})
