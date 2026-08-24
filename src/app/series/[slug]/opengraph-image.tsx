/**
 * Per-series OG card for /series/[slug].
 *
 * Picture-led: the series' own hero artwork rides the top of the card, so a
 * shared series link looks like the series. The lead is the JPEG twin built by
 * `npm run build:og-leads` — Satori cannot decode the webp the site ships.
 *
 * If that twin is missing the card degrades to the typographic layout rather
 * than failing, so a link always previews as something.
 */

import { makeOgImageResponseWithLead, OG_SIZES } from '@/lib/og-card'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'

export const runtime = 'nodejs'
export const alt = 'Euangelion Series'
export const size = OG_SIZES.landscape
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const series = SERIES_DATA[slug]

  if (!series) {
    return makeOgImageResponseWithLead({
      title: 'Euangelion',
      kicker: 'SERIES',
      url: 'EUANGELION.APP/SERIES',
      format: 'landscape',
    })
  }

  const index = ALL_SERIES_ORDER.indexOf(
    slug as (typeof ALL_SERIES_ORDER)[number],
  )
  const number = index >= 0 ? String(index + 1).padStart(2, '0') : '—'

  return makeOgImageResponseWithLead({
    title: series.title,
    kicker: `SERIES ${number} · ${series.days.length} DAYS · ${series.pathway.toUpperCase()} PATHWAY`,
    verse: series.question,
    verseRef: series.framework,
    url: `EUANGELION.APP/SERIES/${slug.toUpperCase()}`,
    format: 'landscape',
    imagePath: `/images/og-lead/series-${slug}.jpg`,
  })
}
