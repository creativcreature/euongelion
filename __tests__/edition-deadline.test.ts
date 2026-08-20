/**
 * The 7am rule (SA-114): the edition flips at 7:00am Eastern — before that,
 * yesterday's paper is live; at the flip the new day arrives whole,
 * unrejected drafts included. DST-safe on both sides of the year.
 */
import { describe, expect, it } from 'vitest'
import { draftIsLive, effectiveEditionDate } from '@/lib/edition/deadline'

describe('the 7am Eastern edition flip', () => {
  it('serves yesterday before 7am ET in summer (EDT: flip = 11:00 UTC)', () => {
    expect(effectiveEditionDate(new Date('2026-08-23T10:59:00Z'))).toBe(
      '2026-08-22',
    )
    expect(effectiveEditionDate(new Date('2026-08-23T11:00:00Z'))).toBe(
      '2026-08-23',
    )
  })

  it('serves yesterday before 7am ET in winter (EST: flip = 12:00 UTC)', () => {
    expect(effectiveEditionDate(new Date('2026-01-15T11:59:00Z'))).toBe(
      '2026-01-14',
    )
    expect(effectiveEditionDate(new Date('2026-01-15T12:00:00Z'))).toBe(
      '2026-01-15',
    )
  })

  it('evening still serves the same day (no premature flip at midnight UTC)', () => {
    // 11pm ET Aug 22 = 03:00 UTC Aug 23 — a UTC-keyed paper would already
    // have flipped; the 7am rule keeps Aug 22 live.
    expect(effectiveEditionDate(new Date('2026-08-23T03:00:00Z'))).toBe(
      '2026-08-22',
    )
  })

  it('drafts print exactly when their edition becomes live', () => {
    expect(draftIsLive('2026-08-23', new Date('2026-08-23T10:59:00Z'))).toBe(
      false,
    )
    expect(draftIsLive('2026-08-23', new Date('2026-08-23T11:00:00Z'))).toBe(
      true,
    )
    expect(draftIsLive('2026-08-23', new Date('2026-08-24T02:00:00Z'))).toBe(
      true,
    )
  })
})
