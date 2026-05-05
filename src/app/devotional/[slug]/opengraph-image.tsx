import { ImageResponse } from 'next/og'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'

/**
 * Per-devotional OG card for the canonical /devotional/[slug] surface.
 * The /wake-up/devotional/[slug] route has its own variant with WAKE-UP
 * framing; this one uses the main-product framing.
 */

export const runtime = 'nodejs'
export const alt = 'Euangelion Devotional'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function findDevotionalMeta(slug: string) {
  for (const seriesSlug of ALL_SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    if (!series) continue
    const day = series.days.find((d) => d.slug === slug)
    if (day) {
      const seriesIndex = ALL_SERIES_ORDER.indexOf(
        seriesSlug as (typeof ALL_SERIES_ORDER)[number],
      )
      return { series, seriesSlug, day, seriesNumber: seriesIndex + 1 }
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
  const meta = findDevotionalMeta(slug)

  if (!meta) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b1420',
          color: '#f7f3ed',
          fontSize: 32,
        }}
      >
        Devotional Not Found
      </div>,
      { ...size },
    )
  }

  const { series, day, seriesNumber } = meta

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        backgroundColor: '#0b1420',
        color: '#f7f3ed',
        fontFamily: 'serif',
      }}
    >
      {/* Day number as architectural element */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: 40,
          fontSize: 240,
          fontWeight: 100,
          color: 'rgba(196, 165, 114, 0.10)',
          lineHeight: 1,
        }}
      >
        {day.day}
      </div>

      <div
        style={{
          fontSize: 18,
          letterSpacing: '0.1em',
          color: '#c4a572',
          marginBottom: 16,
        }}
      >
        SERIES {String(seriesNumber).padStart(2, '0')} —{' '}
        {series.title.toUpperCase()} — DAY {day.day}
      </div>
      <div
        style={{
          fontSize: 60,
          fontWeight: 700,
          lineHeight: 1.1,
          maxWidth: '880px',
          marginBottom: 28,
        }}
      >
        {day.title}
      </div>
      <div
        style={{
          fontSize: 22,
          fontStyle: 'italic',
          color: 'rgba(247, 243, 237, 0.78)',
          maxWidth: '760px',
          lineHeight: 1.45,
        }}
      >
        {series.question}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 80,
          fontSize: 16,
          letterSpacing: '0.15em',
          color: 'rgba(247, 243, 237, 0.4)',
        }}
      >
        EUANGELION · {series.pathway.toUpperCase()} PATHWAY
      </div>
    </div>,
    { ...size },
  )
}
