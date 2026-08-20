/**
 * The 3am rule (SA-111): drafts go live at 3:00am Eastern on their posting
 * day unless rejected. DST-safe on both sides of the year.
 */
import { describe, expect, it } from 'vitest'
import { deadlineUtc, draftIsLive } from '@/lib/edition/deadline'

describe('the 3am Eastern deadline', () => {
  it('is 07:00 UTC in summer (EDT)', () => {
    expect(deadlineUtc('2026-08-23').toISOString()).toBe(
      '2026-08-23T07:00:00.000Z',
    )
  })

  it('is 08:00 UTC in winter (EST)', () => {
    expect(deadlineUtc('2026-01-15').toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    )
  })

  it('holds a draft before the deadline and releases it after', () => {
    const day = '2026-08-23'
    expect(draftIsLive(day, new Date('2026-08-23T06:59:00Z'))).toBe(false)
    expect(draftIsLive(day, new Date('2026-08-23T07:00:00Z'))).toBe(true)
    expect(draftIsLive(day, new Date('2026-08-22T23:00:00Z'))).toBe(false)
    expect(draftIsLive(day, new Date('2026-08-24T00:00:00Z'))).toBe(true)
  })
})
