import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Euangelion — Daily bread for the cluttered, hungry soul'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1612',
        color: '#f7f3ed',
        fontFamily: 'serif',
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: '0.2em',
          color: '#c19a6b',
          marginBottom: 24,
        }}
      >
        EU·AN·GE·LION
      </div>
      <div
        style={{
          fontSize: 80,
          fontWeight: 400,
          letterSpacing: '0.15em',
          marginBottom: 32,
        }}
      >
        EUANGELION
      </div>
      <div
        style={{
          fontSize: 24,
          fontStyle: 'italic',
          color: 'rgba(247, 243, 237, 0.7)',
          maxWidth: '600px',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Daily bread for the cluttered, hungry soul.
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 16,
          letterSpacing: '0.1em',
          color: 'rgba(247, 243, 237, 0.4)',
        }}
      >
        EUANGELION.APP
      </div>
    </div>,
    { ...size },
  )
}
