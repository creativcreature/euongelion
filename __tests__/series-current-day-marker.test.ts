/**
 * SA-103 / F-149 — the series page says WHERE YOU ARE, not just what exists.
 *
 * Every unread day rendered READ NOW, so day 1 and day 7 of an untouched series
 * were typographically identical: the card wall answered "what is in this
 * series" and never "where am I".
 *
 * The marker resolves through `nextUnreadDay`, the same primitive the Library
 * and /today use, so the three surfaces cannot disagree about where the reader
 * stands. These assert that primitive's contract directly — the component test
 * would only re-assert React.
 */
import { describe, expect, it } from 'vitest'
import { nextUnreadDay } from '@/lib/reading/active-day'
import { SERIES_DATA } from '@/data/series'

const SLUG = 'hope'
const days = SERIES_DATA[SLUG].days

describe('series current-day marker', () => {
  it('an untouched series starts the reader at day 1', () => {
    expect(nextUnreadDay(SLUG, new Set())?.day).toBe(1)
  })

  it('advances to the first unread day, not the highest read one', () => {
    const done = new Set([days[0].slug, days[1].slug])
    expect(nextUnreadDay(SLUG, done)?.day).toBe(3)
  })

  it('a gap is honoured — the reader is sent back to what they skipped', () => {
    // read day 1 and day 3; day 2 is still the next unread thing
    const done = new Set([days[0].slug, days[2].slug])
    expect(nextUnreadDay(SLUG, done)?.day).toBe(2)
  })

  it('a finished series marks no current day rather than looping to day 1', () => {
    expect(nextUnreadDay(SLUG, new Set(days.map((d) => d.slug)))).toBeNull()
  })
})
