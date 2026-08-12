import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'
import { formatTime } from '@/lib/audio/tracks'

/**
 * Audio Edition reader selection.
 *
 * Why this matters: `speechSynthesis` is not a media element, so the browser
 * never treats it as playing audio — no lock-screen controls, no background
 * playback, and iOS stops it when the screen sleeps. Listening while working
 * was impossible by construction. A pre-rendered track is a real `<audio>`
 * element and fixes all three.
 *
 * Contract:
 *  - a devotional WITH a pre-rendered track plays that track
 *  - a devotional WITHOUT one still falls back to synthesised speech, so
 *    nothing regresses while the catalog is being rendered
 */

vi.mock('../public/audio/manifest.json', () => ({
  default: {
    'has-track-day-1': {
      src: '/audio/has-track-day-1.m4a',
      duration: 1299.9,
      words: 3501,
      voice: 'am_michael',
      engine: 'kokoro',
      bytes: 8001959,
    },
  },
}))

const SEGMENTS = [
  { id: 'seg-0', label: 'Title', text: 'The Fruit of Lies.' },
  { id: 'seg-1', label: 'Scripture', text: 'For you are fully aware.' },
]

beforeEach(() => {
  localStorage.clear()
  // jsdom has no matchMedia; the Web Speech fallback reads
  // prefers-reduced-motion through it.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
})

// The shared setup does not enable RTL auto-cleanup, so renders would
// otherwise stack across tests in this file.
afterEach(cleanup)

describe('AudioPlayer reader selection', () => {
  it('plays the pre-rendered track through a real audio element', () => {
    const { container } = render(
      <AudioPlayer
        title="The Fruit of Lies"
        segments={SEGMENTS}
        slug="has-track-day-1"
      />,
    )
    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio?.getAttribute('src')).toBe('/audio/has-track-day-1.m4a')
    // Transport belongs to the media element, not a section scrubber.
    expect(screen.getByRole('slider', { name: /seek/i })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /back 15 seconds/i }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /forward 15 seconds/i }),
    ).toBeTruthy()
  })

  it('shows the track duration before playback starts', () => {
    render(
      <AudioPlayer
        title="The Fruit of Lies"
        segments={SEGMENTS}
        slug="has-track-day-1"
      />,
    )
    // 1299.9s → 21:39
    expect(screen.getByText(/0:00 \/ 21:39/)).toBeTruthy()
  })

  it('falls back to synthesised speech when no track exists yet', () => {
    const { container } = render(
      <AudioPlayer
        title="Not Rendered"
        segments={SEGMENTS}
        slug="no-track-day-9"
      />,
    )
    expect(container.querySelector('audio')).toBeNull()
  })

  it('falls back when no slug is supplied at all', () => {
    const { container } = render(
      <AudioPlayer title="No Slug" segments={SEGMENTS} />,
    )
    expect(container.querySelector('audio')).toBeNull()
  })
})

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(9)).toBe('0:09')
    expect(formatTime(61)).toBe('1:01')
    expect(formatTime(1299.9)).toBe('21:39')
  })

  it('never renders NaN or negative time', () => {
    expect(formatTime(Number.NaN)).toBe('0:00')
    expect(formatTime(-5)).toBe('0:00')
  })
})
