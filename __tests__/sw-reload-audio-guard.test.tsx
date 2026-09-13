/**
 * A service-worker update must not reload the page out from under someone
 * listening.
 *
 * Founder, from the installed PWA: "when in web app (save to ios) and I switch
 * tabs- the audio stops." The tab switch was never the cause. There is one
 * `<audio>` element for the whole site, mounted in the root layout (SA-115), so
 * a client-side route change cannot touch it — but `window.location.reload()`
 * destroys the document, and the element with it. `registration.update()` runs
 * on mount and a waiting worker is promoted immediately, so whenever an update
 * landed mid-reading the page reloaded and playback died. In a standalone PWA
 * there is no browser chrome to make that legible; it reads as the audio simply
 * stopping.
 *
 * These tests drive the real component, because the defect is a behaviour and
 * not a string.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { registerAudioElement } from '@/lib/audio/audio-element'

afterEach(() => {
  cleanup()
  registerAudioElement(null)
  vi.unstubAllEnvs()
})

/**
 * A media element that behaves like one for the two properties we read.
 *
 * `paused` and `ended` must be LIVE, not frozen at construction. A real element
 * flips `paused` to true before it fires `pause`, and the guard re-reads them
 * when it wakes — a fake that cannot change state makes the guard defer for
 * ever and reads as a product bug. The first version of this file did exactly
 * that and failed two of its own tests.
 */
function fakeAudio(playing: boolean) {
  const el = document.createElement('audio')
  const state = { paused: !playing, ended: false }
  Object.defineProperty(el, 'paused', {
    get: () => state.paused,
    configurable: true,
  })
  Object.defineProperty(el, 'ended', {
    get: () => state.ended,
    configurable: true,
  })
  return Object.assign(el, {
    /** Stop the way the platform does: set state, then announce it. */
    stop(event: 'pause' | 'ended') {
      state.paused = true
      state.ended = event === 'ended'
      el.dispatchEvent(new Event(event))
    },
  })
}

let reload: ReturnType<typeof vi.fn>
let controllerListeners: Array<() => void>

beforeEach(() => {
  reload = vi.fn()
  controllerListeners = []

  // jsdom's location is not writable; replace it wholesale.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  })

  // A controller is already present, which is what makes a controllerchange a
  // REAL update rather than a first install claiming the page. The first-visit
  // case is exempt on purpose (the 2026-07-10 LCP loop found reloading there
  // made every new visitor parse the document twice).
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller: {},
      addEventListener: (type: string, fn: () => void) => {
        if (type === 'controllerchange') controllerListeners.push(fn)
      },
      removeEventListener: () => {},
      getRegistrations: () => Promise.resolve([]),
      register: () => new Promise(() => {}),
    },
  })

  vi.stubEnv('NODE_ENV', 'production')
})

const takeControl = () => controllerListeners.forEach((fn) => fn())

describe('a service-worker update while a reading is playing', () => {
  it('does not reload the page', () => {
    registerAudioElement(fakeAudio(true))
    render(<ServiceWorkerRegistration />)
    takeControl()
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once the reader pauses', () => {
    const audio = fakeAudio(true)
    registerAudioElement(audio)
    render(<ServiceWorkerRegistration />)
    takeControl()
    expect(reload).not.toHaveBeenCalled()

    audio.stop('pause')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads when the reading ends', () => {
    const audio = fakeAudio(true)
    registerAudioElement(audio)
    render(<ServiceWorkerRegistration />)
    takeControl()

    audio.stop('ended')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads only once, however many times control changes', () => {
    registerAudioElement(fakeAudio(false))
    render(<ServiceWorkerRegistration />)
    takeControl()
    takeControl()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

describe('a reader who is not listening', () => {
  // The deferral must not become a way for anyone to get stuck on a stale
  // build. With nothing playing, behaviour is exactly what it was.
  it('still reloads immediately when nothing is playing', () => {
    registerAudioElement(fakeAudio(false))
    render(<ServiceWorkerRegistration />)
    takeControl()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('still reloads when there is no audio element at all', () => {
    registerAudioElement(null)
    render(<ServiceWorkerRegistration />)
    takeControl()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
