/**
 * Per-devotional OG card for /devotional/[slug].
 *
 * A devotional has no artwork of its own, so it borrows its series' lead —
 * which is what a reader sees at the top of the page anyway. Falls back to the
 * typographic card when the series twin is missing.
 */

import { makeOgImageResponseWithLead, OG_SIZES } from '@/lib/og-card'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'

export const runtime = 'nodejs'
export const alt = 'Euangelion Devotional'
export const size = OG_SIZES.landscape
export const contentType = 'image/png'

function findDevotional(slug: string) {
  for (const seriesSlug of ALL_SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    if (!series) continue
    const day = series.days.find((d) => d.slug === slug)
    if (day) {
      return {
        series,
        seriesSlug,
        day,
        seriesNumber: ALL_SERIES_ORDER.indexOf(seriesSlug) + 1,
      }
    }
  }
  return null
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = findDevotional(slug)

  if (!meta) {
    return makeOgImageResponseWithLead({
      title: 'Euangelion',
      kicker: 'DEVOTIONAL',
      url: 'EUANGELION.APP',
      format: 'landscape',
    })
  }

  const { series, seriesSlug, day, seriesNumber } = meta

  return makeOgImageResponseWithLead({
    title: day.title,
    kicker: `SERIES ${String(seriesNumber).padStart(2, '0')} · ${series.title.toUpperCase()} · DAY ${day.day}`,
    verse: series.question,
    verseRef: series.framework,
    url: `EUANGELION.APP/DEVOTIONAL/${slug.toUpperCase()}`,
    format: 'landscape',
    imagePath: `/images/og-lead/series-${seriesSlug}.jpg`,
  })
}
