import { ImageResponse } from 'next/og'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

export const alt = 'Wake Up Series'
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
          backgroundColor: '#1a1612',
          color: '#f7f3ed',
        }}
      >
        Series Not Found
      </div>,
      { ...size },
    )
  }

  const seriesIndex = SERIES_ORDER.indexOf(
    slug as (typeof SERIES_ORDER)[number],
  )
  const number = String(seriesIndex + 1).padStart(2, '0')

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
            color: '#c19a6b',
          }}
        >
          WAKE UP — QUESTION {number}
        </span>
      </div>
      <div
        style={{
          fontSize: 52,
          fontStyle: 'italic',
          lineHeight: 1.2,
          maxWidth: '900px',
          marginBottom: 32,
        }}
      >
        {series.question}
      </div>
      <div
        style={{
          fontSize: 18,
          color: '#c19a6b',
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
        EUANGELION
      </div>
    </div>,
    { ...size },
  )
}
