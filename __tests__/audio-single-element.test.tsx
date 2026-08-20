import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import { useAudioStore } from '@/stores/audioStore'

/**
 * There is ONE audio element on this site.
 *
 * `GlobalAudioHost` mounts one in the root layout so playback survives a route
 * change. The reader's panel renders its own as well, so on a devotional page
 * there are two — two independent playback engines on one screen. Whichever one
 * a control happens to hold is the one that responds, and a queue playing
 * through the global element keeps sounding when the reader presses play on its
 * own. There is no arrangement of two media elements that behaves correctly.
 */
vi.mock('@/data/audio-manifest.json', () => ({
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
  useAudioStore.getState().clear()
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
afterEach(cleanup)

describe('one audio element, site-wide', () => {
  it('does not add a second element when the reader is open', () => {
    render(
      <>
        <GlobalAudioHost />
        <AudioPlayer
          title="The Fruit of Lies"
          segments={SEGMENTS}
          slug="has-track-day-1"
        />
      </>,
    )
    expect(document.querySelectorAll('audio')).toHaveLength(1)
  })
})
