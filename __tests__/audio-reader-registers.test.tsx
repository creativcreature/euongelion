import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import { useAudioStore } from '@/stores/audioStore'

/**
 * Pressing play in the reader must make the reading reachable from anywhere.
 *
 * Playback survives navigation by design — the element lives in the layout. But
 * the drawer handle, which carries the only pause control outside the reader,
 * appears only when the store holds something. The reader drove the shared
 * element directly and told the store nothing, so leaving a reading left audio
 * sounding with NO WAY TO PAUSE IT anywhere on the site. Measured in Chrome:
 * navigate away mid-reading and `pauseControls` is empty while `paused` is
 * false.
 *
 * The reading has to register itself when it starts.
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

const renderReader = () =>
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

describe('a reading registers itself when it starts', () => {
  it('puts what is playing into the store, so it is reachable off-page', () => {
    renderReader()
    const audio = document.querySelector('audio') as HTMLAudioElement
    act(() => {
      audio.dispatchEvent(new Event('play'))
    })
    const state = useAudioStore.getState()
    expect(state.queue.map((q) => q.slug)).toEqual(['has-track-day-1'])
    expect(state.started).toBe(true)
  })

  it('registers nothing before the reader has pressed play', () => {
    renderReader()
    // Merely opening a reading must not claim the transport.
    expect(useAudioStore.getState().queue).toHaveLength(0)
    expect(useAudioStore.getState().started).toBe(false)
  })
})
