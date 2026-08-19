import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, within } from '@testing-library/react'
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
    // Version-stamped from the encoded size: audio is served immutable for a
    // year, so a re-render must change the URL or browsers pin a stale reading.
    expect(audio?.getAttribute('src')).toBe(
      '/audio/has-track-day-1.m4a?v=8001959',
    )
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
    // 1299.9s → 21:39. Since F-131 the meta leads with what is LEFT rather
    // than elapsed/total, so before playback the whole track is still to go and
    // the duration is still what the reader sees.
    expect(screen.getByText(/21:39 left/)).toBeTruthy()
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

/**
 * The mini bar is earned, not default.
 *
 * The founder had the section scrubber removed from the Audio Edition panel
 * (2026-07-28) because it made the page open like app chrome instead of an
 * editorial. A transport that follows the reader down the page is exactly the
 * thing that could undo that, so it may only exist once the reader has both
 * pressed play AND scrolled the panel away — and it must retire when the panel
 * returns.
 */
describe('NarrationMiniBar — appearance rules', () => {
  let observerCallback:
    | ((entries: { isIntersecting: boolean }[]) => void)
    | null = null

  beforeEach(() => {
    observerCallback = null
    // jsdom has no IntersectionObserver; capture the callback so a test can
    // drive the panel on and off screen.
    window.IntersectionObserver = class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        observerCallback = cb
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
      root = null
      rootMargin = ''
      thresholds = []
    } as unknown as typeof IntersectionObserver
  })

  const renderPlayer = () =>
    render(
      <AudioPlayer
        title="The Fruit of Lies"
        segments={SEGMENTS}
        slug="has-track-day-1"
      />,
    )

  const scrollPanelAway = () => {
    act(() => observerCallback?.([{ isIntersecting: false }]))
  }
  const scrollPanelBack = () => {
    act(() => observerCallback?.([{ isIntersecting: true }]))
  }
  const startPlaying = (container: HTMLElement) => {
    const audio = container.querySelector('audio') as HTMLAudioElement
    act(() => {
      audio.dispatchEvent(new Event('play'))
    })
  }

  it('stays hidden while the reader has never pressed play', () => {
    renderPlayer()
    scrollPanelAway()
    expect(screen.queryByLabelText('Audio edition, minimized')).toBeNull()
  })

  it('stays hidden while the panel is still on screen', () => {
    const { container } = renderPlayer()
    startPlaying(container)
    expect(screen.queryByLabelText('Audio edition, minimized')).toBeNull()
  })

  it('appears once playing and the panel has scrolled away', () => {
    const { container } = renderPlayer()
    startPlaying(container)
    scrollPanelAway()
    expect(screen.getByLabelText('Audio edition, minimized')).toBeTruthy()
    expect(screen.getByLabelText('Pause the reading')).toBeTruthy()
  })

  it('retires when the panel comes back into view', () => {
    const { container } = renderPlayer()
    startPlaying(container)
    scrollPanelAway()
    expect(screen.getByLabelText('Audio edition, minimized')).toBeTruthy()
    scrollPanelBack()
    expect(screen.queryByLabelText('Audio edition, minimized')).toBeNull()
  })

  it('drives the same audio element as the panel — never a second one', () => {
    const { container } = renderPlayer()
    startPlaying(container)
    scrollPanelAway()
    // The bar is portalled to document.body, so count across the whole document.
    expect(document.querySelectorAll('audio')).toHaveLength(1)
  })

  it('offers BOTH skip directions, at every breakpoint', () => {
    // Forward was desktop-only, which left the phone with a lone back control
    // and read as an omission rather than a choice. Both are unconditional now;
    // the time readout is what yields when space is tight.
    const { container } = renderPlayer()
    startPlaying(container)
    scrollPanelAway()
    const bar = screen.getByLabelText('Audio edition, minimized')
    expect(
      within(bar).getByRole('button', { name: /back 15 seconds/i }),
    ).toBeTruthy()
    expect(
      within(bar).getByRole('button', { name: /forward 15 seconds/i }),
    ).toBeTruthy()
  })

  it('shows remaining time, counting down', () => {
    const { container } = renderPlayer()
    startPlaying(container)
    scrollPanelAway()
    // 1299.9s track, nothing played yet → 21:39 still to go.
    // Remaining rather than elapsed: the useful question while working is
    // "how much longer", not "how far in".
    expect(screen.getByText('21:39 left')).toBeTruthy()
  })

  it('offers a way back to the full panel', () => {
    const { container } = renderPlayer()
    startPlaying(container)
    scrollPanelAway()
    expect(
      screen.getByLabelText('Back to the audio edition for The Fruit of Lies'),
    ).toBeTruthy()
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

/**
 * Leaving a reading by tapping through to another one must save the position.
 *
 * `pagehide` covers leaving the site, and it does NOT fire when Next swaps
 * routes — which is how a reader actually leaves a devotional most of the
 * time. Before this, everything since the last throttled write was lost, so
 * returning dropped you up to thirty seconds back.
 */
describe('NarrationPlayer — soft navigation', () => {
  it('flushes the position when the reader navigates away in-app', () => {
    const beacon = vi.fn((_url: string, _body?: BodyInit) => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon })

    const { container, unmount } = render(
      <AudioPlayer
        title="The Fruit of Lies"
        segments={SEGMENTS}
        slug="has-track-day-1"
      />,
    )
    const audio = container.querySelector('audio') as HTMLAudioElement
    act(() => {
      audio.dispatchEvent(new Event('play'))
    })

    expect(beacon).not.toHaveBeenCalled()
    // A client-side route change unmounts the reader without any page event.
    unmount()
    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0][0]).toBe('/api/listening-progress')

    vi.unstubAllGlobals()
  })

  it('does not record anything when a reading was merely opened', () => {
    const beacon = vi.fn((_url: string, _body?: BodyInit) => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon })

    const { unmount } = render(
      <AudioPlayer
        title="The Fruit of Lies"
        segments={SEGMENTS}
        slug="has-track-day-1"
      />,
    )
    // Never played. Opening a devotional must not count as listening — four
    // such rows reached production once and would have made opens look like
    // listens.
    unmount()
    expect(beacon).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
