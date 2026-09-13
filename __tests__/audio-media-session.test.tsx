/**
 * The lock screen and the car.
 *
 * The founder's report was that the player is hard to navigate "especially when
 * I am driving" — and the most useful answer is the one that needs no screen at
 * all. Before this, the host registered four handlers (play, pause, next,
 * previous): there was no skip-back anywhere on a lock screen, a steering-wheel
 * control or a head unit, the OS progress bar was empty because nothing called
 * `setPositionState`, and the artwork square was blank.
 *
 * jsdom has no Media Session, so these tests prove REGISTRATION and the
 * arithmetic behind each handler. They prove nothing about a real car; that
 * check is a device check and is reported separately.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import { useAudioStore } from '@/stores/audioStore'

type Details = { seekTime?: number; seekOffset?: number }
const handlers = new Map<string, (d?: Details) => void>()
const positions: unknown[] = []

afterEach(cleanup)

beforeEach(() => {
  handlers.clear()
  positions.length = 0
  // @ts-expect-error — jsdom implements neither of these
  globalThis.MediaMetadata = class {
    constructor(init: Record<string, unknown>) {
      Object.assign(this, init)
    }
  }
  // @ts-expect-error — jsdom has no mediaSession
  navigator.mediaSession = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: (action: string, handler: (d?: Details) => void | null) => {
      if (handler) handlers.set(action, handler)
      else handlers.delete(action)
    },
    setPositionState: (state: unknown) => positions.push(state),
  }
  useAudioStore.getState().start({
    items: [
      {
        slug: 'abiding-in-his-presence-day-1',
        title: 'From Visiting to Dwelling',
        src: '/audio/abiding-in-his-presence-day-1-c2ec679c80.m4a',
        duration: 405,
        href: '/devotional/abiding-in-his-presence-day-1',
        context: 'Abiding in His Presence',
      },
    ],
    source: 'single',
    label: 'Abiding in His Presence',
  })
})

function mount() {
  const view = render(<GlobalAudioHost />)
  const audio = view.container.querySelector('audio') as HTMLAudioElement
  // jsdom reports duration NaN, and every clamp here depends on it.
  Object.defineProperty(audio, 'duration', { value: 405, configurable: true })
  return { view, audio }
}

describe('the actions a head unit sends', () => {
  it('registers seek alongside the four it already had', () => {
    mount()
    expect([...handlers.keys()].sort()).toEqual(
      [
        'nexttrack',
        'pause',
        'play',
        'previoustrack',
        'seekbackward',
        'seekforward',
        'seekto',
      ].sort(),
    )
  })

  it('seekbackward clamps at zero rather than going negative', () => {
    const { audio } = mount()
    audio.currentTime = 5
    handlers.get('seekbackward')!({})
    expect(audio.currentTime).toBe(0)
  })

  it('seekbackward defaults to the same 15s as the in-app skip', () => {
    const { audio } = mount()
    audio.currentTime = 100
    handlers.get('seekbackward')!({})
    expect(audio.currentTime).toBe(85)
  })

  it('honours the offset the OS supplies over our default', () => {
    const { audio } = mount()
    audio.currentTime = 100
    handlers.get('seekforward')!({ seekOffset: 30 })
    expect(audio.currentTime).toBe(130)
  })

  it('seekforward clamps at the end of the reading', () => {
    const { audio } = mount()
    audio.currentTime = 400
    handlers.get('seekforward')!({})
    expect(audio.currentTime).toBe(405)
  })

  it('seekto takes the OS position WITHOUT snapping it to a section', () => {
    const { audio } = mount()
    handlers.get('seekto')!({ seekTime: 123 })
    // The OS bar is continuous. The in-app rule snaps to sections; rounding a
    // driver's nudge of the car's own bar would give them a jump they did not
    // ask for.
    expect(audio.currentTime).toBe(123)
  })

  it('ignores a seekto with no position instead of jumping to zero', () => {
    const { audio } = mount()
    audio.currentTime = 200
    handlers.get('seekto')!({})
    expect(audio.currentTime).toBe(200)
  })
})

describe('the OS progress bar', () => {
  it('is fed a position, so seekto has something to aim at', () => {
    const { audio } = mount()
    audio.currentTime = 42
    audio.dispatchEvent(new Event('loadedmetadata'))
    expect(positions.at(-1)).toMatchObject({ duration: 405, position: 42 })
  })

  it('never reports a position past the duration', () => {
    const { audio } = mount()
    audio.currentTime = 500
    audio.dispatchEvent(new Event('timeupdate'))
    expect(positions.at(-1)).toMatchObject({ position: 405 })
  })

  it('stays silent while the duration is unknown', () => {
    const view = render(<GlobalAudioHost />)
    const audio = view.container.querySelector('audio') as HTMLAudioElement
    Object.defineProperty(audio, 'duration', { value: NaN, configurable: true })
    audio.dispatchEvent(new Event('timeupdate'))
    // A NaN duration throws in Safari rather than no-opping.
    expect(positions).toHaveLength(0)
  })
})

describe('what the lock screen says', () => {
  it('leads with the section being read, and keeps the reading beneath it', () => {
    mount()
    // Founder decision, reversible in one line: the biggest text on a car's
    // Now Playing screen carries where you ARE, which is what a driver needs.
    expect(navigator.mediaSession.metadata).toMatchObject({
      title: 'Opening',
      artist: 'From Visiting to Dwelling',
    })
  })

  it('sets artwork, so the OS stops drawing a blank square', () => {
    mount()
    const artwork = (navigator.mediaSession.metadata as unknown as { artwork: unknown[] }).artwork
    expect(artwork.length).toBeGreaterThan(0)
    expect(artwork[0]).toMatchObject({ src: expect.stringMatching(/\S/) })
  })
})
