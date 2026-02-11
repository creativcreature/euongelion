import { ImageResponse } from 'next/og'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

export const runtime = 'nodejs'
export const alt = 'Wake Up Devotional'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function findDevotionalMeta(slug: string) {
  for (const seriesSlug of SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    const day = series.days.find((d) => d.slug === slug)
    if (day) {
      const seriesIndex = SERIES_ORDER.indexOf(
        seriesSlug as (typeof SERIES_ORDER)[number],
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
          backgroundColor: '#1a1612',
          color: '#f7f3ed',
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
        backgroundColor: '#1a1612',
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
          fontSize: 200,
          fontWeight: 100,
          color: 'rgba(247, 243, 237, 0.08)',
          lineHeight: 1,
        }}
      >
        {day.day}
      </div>

      <div
        style={{
          fontSize: 18,
          letterSpacing: '0.1em',
          color: '#c19a6b',
          marginBottom: 16,
        }}
      >
        SERIES {String(seriesNumber).padStart(2, '0')} —{' '}
        {series.title.toUpperCase()} — DAY {day.day}
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1.1,
          maxWidth: '800px',
          marginBottom: 24,
        }}
      >
        {day.title}
      </div>
      <div
        style={{
          fontSize: 22,
          fontStyle: 'italic',
          color: 'rgba(247, 243, 237, 0.7)',
          maxWidth: '700px',
          lineHeight: 1.5,
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
        EUANGELION
      </div>
    </div>,
    { ...size },
  )
}
