import { describe, it, expect } from 'vitest'
import {
  isSeriesSaved,
  isSeriesSlug,
  savedSlugsForSeries,
  seriesSlugOf,
  shelfFromSaved,
} from '@/lib/library/series-save'

/**
 * SA-039: the unit of saving is a series. The load-bearing requirement is that
 * legacy per-day rows still count — nobody's library may empty on deploy.
 */
describe('series-save', () => {
  it('derives a series slug from a day slug', () => {
    expect(seriesSlugOf('he-cannot-deny-himself-day-5')).toBe(
      'he-cannot-deny-himself',
    )
    expect(seriesSlugOf('bible-365-day-200')).toBe('bible-365')
  })

  it('maps the historical identity-crisis rename', () => {
    expect(seriesSlugOf('identity-crisis-day-1')).toBe('identity')
  })

  it('returns null for a slug that is not a day', () => {
    expect(seriesSlugOf('he-cannot-deny-himself')).toBeNull()
  })

  it('recognises a real series slug', () => {
    expect(isSeriesSlug('he-cannot-deny-himself')).toBe(true)
    expect(isSeriesSlug('he-cannot-deny-himself-day-5')).toBe(false)
    expect(isSeriesSlug('not-a-series-at-all')).toBe(false)
  })

  it('counts a series as saved when the series row exists', () => {
    expect(
      isSeriesSaved(['he-cannot-deny-himself'], 'he-cannot-deny-himself'),
    ).toBe(true)
  })

  // The migration requirement, expressed as a test.
  it('counts a series as saved from a legacy per-day row alone', () => {
    expect(
      isSeriesSaved(['he-cannot-deny-himself-day-3'], 'he-cannot-deny-himself'),
    ).toBe(true)
  })

  it('does not count an unrelated series', () => {
    expect(isSeriesSaved(['bible-365-day-1'], 'he-cannot-deny-himself')).toBe(
      false,
    )
    expect(isSeriesSaved([], 'he-cannot-deny-himself')).toBe(false)
    expect(isSeriesSaved(['he-cannot-deny-himself'], null)).toBe(false)
  })

  it('collects every row belonging to a series so unsave clears them all', () => {
    const saved = [
      'he-cannot-deny-himself',
      'he-cannot-deny-himself-day-2',
      'he-cannot-deny-himself-day-6',
      'bible-365-day-1',
    ]
    expect(savedSlugsForSeries(saved, 'he-cannot-deny-himself')).toEqual([
      'he-cannot-deny-himself',
      'he-cannot-deny-himself-day-2',
      'he-cannot-deny-himself-day-6',
    ])
  })

  it('folds day rows and the series row into one shelf entry', () => {
    const shelf = shelfFromSaved([
      { devotionalSlug: 'he-cannot-deny-himself-day-2', savedAt: '2026-08-01' },
      { devotionalSlug: 'he-cannot-deny-himself', savedAt: '2026-08-14' },
      { devotionalSlug: 'bible-365-day-9', savedAt: '2026-08-10' },
    ])
    expect(shelf).toHaveLength(2)
    const hcdh = shelf.find((s) => s.seriesSlug === 'he-cannot-deny-himself')
    expect(hcdh?.savedAt).toBe('2026-08-14') // most recent of the folded rows
    expect(hcdh?.dayCount).toBeGreaterThan(0)
  })

  it('sorts the shelf newest first', () => {
    const shelf = shelfFromSaved([
      { devotionalSlug: 'bible-365', savedAt: '2026-01-01' },
      { devotionalSlug: 'he-cannot-deny-himself', savedAt: '2026-08-14' },
    ])
    expect(shelf[0].seriesSlug).toBe('he-cannot-deny-himself')
  })

  it('keeps an unknown slug rather than dropping it silently', () => {
    const shelf = shelfFromSaved([
      { devotionalSlug: 'a-deleted-devotional', savedAt: '2026-08-14' },
    ])
    expect(shelf).toHaveLength(1)
    expect(shelf[0].seriesSlug).toBe('a-deleted-devotional')
  })
})
