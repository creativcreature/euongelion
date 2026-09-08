import { describe, it, expect } from 'vitest'
import { latestFeaturedSeries } from '@/lib/home/latest-series'
import { SERIES_DATA, NEW_SERIES_ORDER } from '@/data/series'
import { DEVOTIONAL_PUBLISH_DATES } from '@/data/devotional-publish-dates'

/**
 * SA-136 (founder, 2026-09-08): "the featured devotional should be the latest
 * devotional added to the site. That should be a standing rule."
 *
 * SA-031 had already ruled this in 2026-07-26 and it drifted anyway, because
 * it lived as a hand-edited constant in `src/app/page.tsx`. Sought and Crowned
 * shipped on 2026-09-05 and the homepage went on featuring Drawing Near for
 * three days. A rule enforced by memory is not enforced.
 *
 * This is the enforcement. If a series ships and the homepage does not follow
 * it, this fails.
 */
describe('SA-136 — the homepage features the most recent series', () => {
  // The newest series by real publication date, computed independently of the
  // implementation so this is a check and not a restatement.
  const newestByDate = (() => {
    let bestSeries: string | null = null
    let bestDate = ''
    for (const [daySlug, rec] of Object.entries(DEVOTIONAL_PUBLISH_DATES)) {
      if (rec.source === 'first-seen') continue
      const series = NEW_SERIES_ORDER.find((s) =>
        daySlug.startsWith(`${s}-day-`),
      )
      if (!series || !SERIES_DATA[series]) continue
      if (rec.publishedAt > bestDate) {
        bestDate = rec.publishedAt
        bestSeries = series
      }
    }
    return { series: bestSeries, date: bestDate }
  })()

  it('picks the series with the newest publication date', () => {
    expect(newestByDate.series).not.toBeNull()
    expect(latestFeaturedSeries().series).toBe(newestByDate.series)
  })

  it('never features a series older than one that has shipped since', () => {
    const featured = latestFeaturedSeries().series
    const featuredDate = Object.entries(DEVOTIONAL_PUBLISH_DATES)
      .filter(([slug]) => slug.startsWith(`${featured}-day-`))
      .map(([, r]) => r.publishedAt)
      .sort()
      .pop()
    expect(featuredDate).toBe(newestByDate.date)
  })

  it('ignores first-seen dates, which record an import not a publication', () => {
    // A bulk import touching a legacy file must never take the homepage slot.
    const featured = latestFeaturedSeries().series
    const sources = Object.entries(DEVOTIONAL_PUBLISH_DATES)
      .filter(([slug]) => slug.startsWith(`${featured}-day-`))
      .map(([, r]) => r.source)
    expect(sources.some((s) => s !== 'first-seen')).toBe(true)
  })

  it('carries real series copy rather than placeholder text', () => {
    const f = latestFeaturedSeries()
    const info = SERIES_DATA[f.series]
    expect(f.title).toBe(info.title)
    expect(f.teaser).toBe(info.question)
    expect(f.daySlug).toBe(info.days[0].slug)
    expect(f.dayTitle).toBe(info.days[0].title)
    expect(f.kicker).toContain(`${info.days.length} DAYS`)
    expect(f.teaser.length).toBeGreaterThan(10)
  })

  it('points at art that exists on disk', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const art = latestFeaturedSeries().featuredArt
    expect(
      fs.existsSync(path.join(process.cwd(), 'public', art)),
      `featured art missing: ${art}`,
    ).toBe(true)
  })
})
