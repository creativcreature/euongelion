/**
 * Daily Bread V2 editorial clock (SA-142 / F-184): the 7am New York rollover,
 * DST on both sides, parity with the SA-114 rule, strict date slugs, and the
 * scheduler's build window.
 */
import { describe, expect, it } from 'vitest'
import { effectiveEditionDate } from '@/lib/edition/deadline'
import {
  addDays,
  editorialDate,
  fixedClock,
  isValidDateSlug,
  rolloverInstant,
  schedulePlan,
  zoneOffsetMinutes,
} from '@/lib/daily-bread/time'

describe('editorial clock', () => {
  it('flips at 07:00 EDT (11:00Z) in summer and 07:00 EST (12:00Z) in winter', () => {
    expect(editorialDate(new Date('2026-09-14T10:59:59Z'))).toBe('2026-09-13')
    expect(editorialDate(new Date('2026-09-14T11:00:00Z'))).toBe('2026-09-14')
    expect(editorialDate(new Date('2026-01-15T11:59:59Z'))).toBe('2026-01-14')
    expect(editorialDate(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01-15')
  })

  it('rollover instants are 11:00Z in EDT and 12:00Z in EST, including DST change days', () => {
    expect(rolloverInstant('2026-09-14').toISOString()).toBe('2026-09-14T11:00:00.000Z')
    expect(rolloverInstant('2026-01-15').toISOString()).toBe('2026-01-15T12:00:00.000Z')
    // 2026 DST: starts Mar 8, ends Nov 1 (both at 2am local, before 7am).
    expect(rolloverInstant('2026-03-08').toISOString()).toBe('2026-03-08T11:00:00.000Z')
    expect(rolloverInstant('2026-11-01').toISOString()).toBe('2026-11-01T12:00:00.000Z')
    expect(zoneOffsetMinutes(new Date('2026-07-01T12:00:00Z'))).toBe(-240)
    expect(zoneOffsetMinutes(new Date('2026-12-01T12:00:00Z'))).toBe(-300)
  })

  it('agrees with the SA-114 effectiveEditionDate every 37 minutes across a year', () => {
    const start = Date.parse('2026-01-01T00:00:00Z')
    const end = Date.parse('2027-01-01T00:00:00Z')
    for (let t = start; t < end; t += 37 * 60_000) {
      const at = new Date(t)
      expect(editorialDate(at)).toBe(effectiveEditionDate(at))
    }
  })

  it('accepts only real calendar dates as slugs', () => {
    expect(isValidDateSlug('2026-09-14')).toBe(true)
    expect(isValidDateSlug('2028-02-29')).toBe(true)
    for (const bad of ['2026-02-30', '2026-13-01', '2026-9-14', '20260914', '2026-09-14/../x', '', null, 42, '1999-12-31']) {
      expect(isValidDateSlug(bad)).toBe(false)
    }
    expect(() => addDays('nope', 1)).toThrow()
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  })

  it('the build window opens 12 hours before the next rollover', () => {
    const outside = schedulePlan(fixedClock('2026-09-14T11:05:00Z'))
    expect(outside).toMatchObject({ liveDate: '2026-09-14', nextDate: '2026-09-15', inBuildWindow: false })
    const inside = schedulePlan(fixedClock('2026-09-14T23:30:00Z'))
    expect(inside).toMatchObject({ liveDate: '2026-09-14', nextDate: '2026-09-15', inBuildWindow: true })
  })
})
