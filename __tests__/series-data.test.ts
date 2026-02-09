import { describe, it, expect } from 'vitest'
import {
  SERIES_DATA,
  SERIES_ORDER,
  DEVOTIONAL_SERIES,
  WAKEUP_SERIES_ORDER,
  ALL_SERIES_ORDER,
} from '@/data/series'

describe('Series Data', () => {
  it('has 26 series in SERIES_ORDER (ALL_SERIES_ORDER)', () => {
    expect(SERIES_ORDER).toHaveLength(26)
    expect(ALL_SERIES_ORDER).toHaveLength(26)
  })

  it('has 7 Wake-Up series', () => {
    expect(WAKEUP_SERIES_ORDER).toHaveLength(7)
  })

  it('every series in SERIES_ORDER exists in SERIES_DATA', () => {
    for (const slug of SERIES_ORDER) {
      expect(SERIES_DATA[slug]).toBeDefined()
      expect(SERIES_DATA[slug].title).toBeTruthy()
      expect(SERIES_DATA[slug].question).toBeTruthy()
      expect(SERIES_DATA[slug].days.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('Wake-Up series each have 5 days', () => {
    for (const slug of WAKEUP_SERIES_ORDER) {
      expect(SERIES_DATA[slug].days).toHaveLength(5)
    }
  })

  it('DEVOTIONAL_SERIES has 7 entries with correct numbers', () => {
    expect(DEVOTIONAL_SERIES).toHaveLength(7)
    expect(DEVOTIONAL_SERIES[0].number).toBe('01')
    expect(DEVOTIONAL_SERIES[6].number).toBe('07')
  })

  it('kingdom is marked as center', () => {
    const kingdom = DEVOTIONAL_SERIES.find((s) => s.slug === 'kingdom')
    expect(kingdom?.isCenter).toBe(true)
  })

  it('all day slugs follow naming convention', () => {
    for (const slug of SERIES_ORDER) {
      const series = SERIES_DATA[slug]
      for (const day of series.days) {
        expect(day.slug).toMatch(/^[a-z0-9-]+-day-\d+$/)
        expect(day.day).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('total devotionals across all series is at least 100', () => {
    const total = SERIES_ORDER.reduce(
      (sum, slug) => sum + SERIES_DATA[slug].days.length,
      0,
    )
    // 7 Wake-Up (35 days) + 19 Substack (81+ days)
    expect(total).toBeGreaterThanOrEqual(100)
  })

  it('every series has a pathway', () => {
    for (const slug of SERIES_ORDER) {
      expect(['Sleep', 'Awake', 'Shepherd']).toContain(
        SERIES_DATA[slug].pathway,
      )
    }
  })

  it('every series has keywords', () => {
    for (const slug of SERIES_ORDER) {
      expect(SERIES_DATA[slug].keywords.length).toBeGreaterThan(0)
    }
  })
})
