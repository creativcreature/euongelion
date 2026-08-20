import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import { __resetThrottle, pushPosition } from '@/lib/audio/listening-progress'
import { useAudioStore } from '@/stores/audioStore'

/**
 * SA-116 — the continuity bug that survived the refactor by moving.
 *
 * `NarrationPlayer` has saved on `pagehide` and `visibilitychange` since it
 * owned the audio element. SA-115 hoisted playback to `GlobalAudioHost` and the
 * handler did not come with it, so everything played outside the reader panel —
 * the drawer queue, the occasion picker, /today, the Edition — could lose up to
 * thirty seconds of position on the way out. Both push sites also sent a
 * hard-coded `listenedDelta: 0`, so that listening accumulated no total at all.
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

const ITEM = {
  slug: 'has-track-day-1',
  title: 'The Fruit of Lies',
  src: '/audio/has-track-day-1.m4a?v=8001959',
  duration: 1299.9,
  href: '/devotional/has-track-day-1',
  context: 'A Series',
}

let beacons: string[] = []

beforeEach(() => {
  localStorage.clear()
  __resetThrottle()
  useAudioStore.getState().clear()
  beacons = []
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    writable: true,
    value: (url: string) => {
      beacons.push(url)
      return true
    },
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the account write is not thrown away', () => {
  it('reports whether the server actually took the write', () => {
    // First write goes; the next is inside the 30s throttle and does not.
    expect(
      pushPosition({ slug: 'a', seconds: 10, duration: 600, listenedDelta: 5 }),
    ).toBe(true)
    expect(
      pushPosition({ slug: 'a', seconds: 15, duration: 600, listenedDelta: 5 }),
    ).toBe(false)
  })

  it('throttles per track, so a queue does not starve the track it left', () => {
    expect(
      pushPosition({ slug: 'a', seconds: 10, duration: 600, listenedDelta: 1 }),
    ).toBe(true)
    // A different track is a different budget — moving between slugs must not
    // consume the next one's first write.
    expect(
      pushPosition({ slug: 'b', seconds: 10, duration: 600, listenedDelta: 1 }),
    ).toBe(true)
  })

  it('always writes locally, throttled or not', () => {
    pushPosition({ slug: 'a', seconds: 10, duration: 600, listenedDelta: 1 })
    pushPosition({ slug: 'a', seconds: 22, duration: 600, listenedDelta: 1 })
    const raw = localStorage.getItem('euangelion:narration-position')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string).a.seconds).toBe(22)
  })
})

describe('the global host saves on the way out', () => {
  it('registers the exit handlers the reader panel has always had', () => {
    const added: string[] = []
    const onWindow = vi.spyOn(window, 'addEventListener')
    const onDoc = vi.spyOn(document, 'addEventListener')
    onWindow.mockImplementation(((type: string) => {
      added.push(type)
    }) as never)
    onDoc.mockImplementation(((type: string) => {
      added.push(type)
    }) as never)

    render(<GlobalAudioHost />)

    expect(added).toContain('pagehide')
    expect(added).toContain('visibilitychange')
    onWindow.mockRestore()
    onDoc.mockRestore()
  })

  it('writes nothing when nothing has played', () => {
    render(<GlobalAudioHost />)
    // The element is mounted on every route whether or not anyone presses play.
    // Without the guard, merely loading the site writes a row at position 0 and
    // counts an open as a listen.
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(beacons).toHaveLength(0)
    expect(localStorage.getItem('euangelion:narration-position')).toBeNull()
  })

  it('writes the position it last saw once something has played', () => {
    const { container } = render(<GlobalAudioHost />)
    act(() => {
      useAudioStore
        .getState()
        .start({ items: [ITEM], source: 'daily', label: 'For right now' })
    })

    const audio = container.querySelector('audio') as HTMLAudioElement
    Object.defineProperty(audio, 'paused', {
      configurable: true,
      value: false,
    })
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      writable: true,
      value: 140,
    })
    Object.defineProperty(audio, 'duration', {
      configurable: true,
      value: 1299.9,
    })

    act(() => {
      audio.dispatchEvent(new Event('timeupdate'))
    })
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    const raw = localStorage.getItem('euangelion:narration-position')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string)[ITEM.slug].seconds).toBe(140)

    // The point of the fix: the ACCOUNT gets it too, through sendBeacon,
    // because a fetch is cancelled with the page at exactly the moment the
    // position matters most. Before SA-116 no beacon left this host at all.
    expect(beacons).toContain('/api/listening-progress')
  })

  it('backgrounding the app counts as leaving', () => {
    const { container } = render(<GlobalAudioHost />)
    act(() => {
      useAudioStore
        .getState()
        .start({ items: [ITEM], source: 'daily', label: 'For right now' })
    })
    const audio = container.querySelector('audio') as HTMLAudioElement
    Object.defineProperty(audio, 'paused', { configurable: true, value: false })
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      value: 90,
    })
    act(() => {
      audio.dispatchEvent(new Event('timeupdate'))
    })

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // On mobile this is the far more common way listening ends.
    expect(beacons).toContain('/api/listening-progress')
  })
})
