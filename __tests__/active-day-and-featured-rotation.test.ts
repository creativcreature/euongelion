/**
 * F-090 — the reader's active day, and the rotating homepage feature.
 *
 * Both fix "the surface knows the right answer and shows a different one":
 * the library printed "Day 3" above a link to day 1, and the homepage pinned
 * a lead series in a literal that went stale two releases ago.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SERIES_DATA, NEW_SERIES_ORDER } from '@/data/series'
import {
  activeDayHref,
  activeDayLabel,
  locateDay,
  nextUnreadDay,
} from '@/lib/reading/active-day'
import {
  COMMISSIONED_SERIES,
  featuredForServer,
  latestEligibleSeries,
  rotateFeatured,
} from '@/lib/home/featured-rotation'

const SERIES = 'looking-at-the-sun'

describe('active day', () => {
  it('locates a day inside its series', () => {
    const found = locateDay('looking-at-the-sun-day-3')
    expect(found).toMatchObject({ seriesSlug: SERIES, day: 3, dayCount: 7 })
  })

  it('carries the historical identity-crisis rename', () => {
    const found = locateDay('identity-crisis-day-1')
    expect(found?.seriesSlug).toBe('identity')
  })

  it('returns null for a slug that only looks like a day', () => {
    expect(locateDay('not-a-real-series-day-2')).toBeNull()
    expect(locateDay('looking-at-the-sun')).toBeNull()
  })

  it('links to the active day, not day 1', () => {
    expect(activeDayHref(SERIES, 4)).toBe(
      `/devotional/${SERIES_DATA[SERIES].days[3].slug}`,
    )
  })

  it('falls back to the SERIES page, never silently to day 1', () => {
    // Day 99 does not exist — the honest answer is the whole arc.
    expect(activeDayHref(SERIES, 99)).toBe(`/series/${SERIES}`)
    expect(activeDayHref(SERIES, null)).toBe(`/series/${SERIES}`)
    expect(activeDayHref('no-such-series', 1)).toBe('/series/no-such-series')
  })

  it('labels the day with its total', () => {
    expect(activeDayLabel(SERIES, 3)).toBe('Day 3 of 7')
    expect(activeDayLabel(SERIES, null)).toBeNull()
  })

  it('next unread day is the first GAP, not last-completed + 1', () => {
    const days = SERIES_DATA[SERIES].days
    // Read day 1 and day 3, skipping 2. The next read must be 2.
    const done = new Set([days[0].slug, days[2].slug])
    expect(nextUnreadDay(SERIES, done)?.day).toBe(2)
  })

  it('returns null once the series is finished', () => {
    const done = new Set(SERIES_DATA[SERIES].days.map((d) => d.slug))
    expect(nextUnreadDay(SERIES, done)).toBeNull()
  })
})

describe('homepage featured rotation', () => {
  afterEach(() => vi.restoreAllMocks())

  it('leads with the newest series that is eligible', () => {
    const lead = latestEligibleSeries()
    expect(SERIES_DATA[lead]).toBeDefined()
    expect(COMMISSIONED_SERIES.has(lead)).toBe(false)
  })

  it('never leads with a commissioned series (SA-036(4))', () => {
    // looking-at-the-sun is commissioned and must never lead, wherever it
    // sits in NEW_SERIES_ORDER. Pinning it to the last slot made this test
    // fail the moment a later series was appended (rekindled, SA-075/F-119);
    // the contract is eligibility, not array position.
    expect(NEW_SERIES_ORDER).toContain(SERIES)
    expect(COMMISSIONED_SERIES.has(SERIES)).toBe(true)
    expect(latestEligibleSeries()).not.toBe(SERIES)
  })

  it('keeps commissioned series out of the rotating tail as well', () => {
    for (let i = 0; i < 40; i += 1) {
      expect(rotateFeatured()).not.toContain(SERIES)
    }
  })

  it('server render is deterministic so hydration cannot mismatch', () => {
    expect(featuredForServer()).toEqual(featuredForServer())
  })

  it('rotation keeps the lead pinned and varies the tail', () => {
    const lead = latestEligibleSeries()
    const runs = Array.from({ length: 12 }, () => rotateFeatured())
    for (const run of runs) {
      expect(run[0]).toBe(lead)
      expect(new Set(run).size).toBe(run.length) // no duplicates
    }
    // Across a dozen refreshes the tail must actually differ at least once.
    const tails = runs.map((r) => r.slice(1).join(','))
    expect(new Set(tails).size).toBeGreaterThan(1)
  })

  it('returns the requested number of cards', () => {
    expect(rotateFeatured(7)).toHaveLength(7)
    expect(featuredForServer(7)).toHaveLength(7)
  })

  it('is deterministic when given a seeded random', () => {
    const seeded = () => 0.42
    expect(rotateFeatured(7, seeded)).toEqual(rotateFeatured(7, seeded))
  })
})
