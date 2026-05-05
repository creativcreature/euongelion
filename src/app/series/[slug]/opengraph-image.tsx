import { ImageResponse } from 'next/og'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'

/**
 * Per-series OG card for the canonical /series/[slug] surface. The
 * /wake-up/series/[slug] route has its own variant with the WAKE UP
 * question framing; this one uses the main-product framing.
 *
 * Same dimensions + content type as Open Graph spec recommends
 * (1200x630). When a series URL is shared on social, this card
 * surfaces the series title, framework verse, and pathway tag
 * instead of the global site OG card.
 */

export const alt = 'Euangelion Series'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const series = SERIES_DATA[slug]

  if (!series) {
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
        Series Not Found
      </div>,
      { ...size },
    )
  }

  const seriesIndex = ALL_SERIES_ORDER.indexOf(
    slug as (typeof ALL_SERIES_ORDER)[number],
  )
  const number =
    seriesIndex >= 0 ? String(seriesIndex + 1).padStart(2, '0') : '—'
  const dayCount = series.days.length

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: 24,
        }}
      >
        <span
          style={{
            fontSize: 20,
            letterSpacing: '0.1em',
            color: '#c4a572',
          }}
        >
          EUANGELION SERIES {number} · {dayCount} DAYS
        </span>
      </div>
      <div
        style={{
          fontSize: 64,
          fontStyle: 'italic',
          lineHeight: 1.15,
          maxWidth: '960px',
          marginBottom: 28,
        }}
      >
        {series.title}
      </div>
      <div
        style={{
          fontSize: 22,
          lineHeight: 1.4,
          color: 'rgba(247, 243, 237, 0.78)',
          maxWidth: '900px',
          marginBottom: 32,
        }}
      >
        {series.question}
      </div>
      <div
        style={{
          fontSize: 18,
          color: '#c4a572',
          letterSpacing: '0.05em',
        }}
      >
        {series.framework}
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
