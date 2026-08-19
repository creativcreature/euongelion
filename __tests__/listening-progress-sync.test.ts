/**
 * SA-058 — where you stopped follows you between devices.
 *
 * Founder-approved 2026-08-16, including the production DDL it needs
 * (migration 018), which is the named approval SA-039 §2 requires.
 *
 * The conflict rule is the whole design, so it is what gets pinned. The
 * obvious implementation — take the FURTHEST position — is wrong in a way that
 * only shows up in real use: a reader who deliberately restarts a devotional on
 * their phone would be dragged back to wherever the laptop stopped, silently
 * undoing the thing they just chose to do. Newest write wins instead.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetThrottle,
  pushPosition,
  readLocalPosition,
  resolvePosition,
  writeLocalPosition,
} from '@/lib/audio/listening-progress'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('resolvePosition', () => {
  it('takes the newer write, not the further position', () => {
    const laptop = { seconds: 900, at: 1_000 }
    const phone = { seconds: 12, at: 2_000 }
    expect(resolvePosition(phone, laptop)).toBe(12)
    // Order of arguments must not matter — it is the timestamp that decides.
    expect(resolvePosition(laptop, phone)).toBe(12)
  })

  it('takes the server when the server is newer', () => {
    expect(
      resolvePosition({ seconds: 30, at: 1_000 }, { seconds: 600, at: 5_000 }),
    ).toBe(600)
  })

  it('falls back to whichever side exists', () => {
    expect(resolvePosition({ seconds: 40, at: 1 }, null)).toBe(40)
    expect(resolvePosition(null, { seconds: 90, at: 1 })).toBe(90)
    expect(resolvePosition(null, null)).toBeNull()
  })

  it('prefers the server on an exact timestamp tie', () => {
    // Ties are possible when a device writes both sides in the same tick. The
    // server is the shared truth, so it breaks the tie.
    expect(
      resolvePosition({ seconds: 10, at: 500 }, { seconds: 20, at: 500 }),
    ).toBe(20)
  })
})

describe('the local cache', () => {
  it('round-trips a position with a timestamp', () => {
    writeLocalPosition('jabez-day-1', 128.4)
    const row = readLocalPosition('jabez-day-1')
    expect(row?.seconds).toBeCloseTo(128.4, 1)
    expect(typeof row?.at).toBe('number')
  })

  it('keeps devotionals separate', () => {
    writeLocalPosition('jabez-day-1', 100)
    writeLocalPosition('jabez-day-2', 200)
    expect(readLocalPosition('jabez-day-1')?.seconds).toBe(100)
    expect(readLocalPosition('jabez-day-2')?.seconds).toBe(200)
  })

  it('returns null for an unknown devotional', () => {
    expect(readLocalPosition('never-played')).toBeNull()
  })

  it('survives corrupt storage rather than throwing', () => {
    localStorage.setItem('euangelion:narration-position', '{not json')
    expect(readLocalPosition('jabez-day-1')).toBeNull()
    // And a later write repairs it.
    writeLocalPosition('jabez-day-1', 50)
    expect(readLocalPosition('jabez-day-1')?.seconds).toBe(50)
  })

  it('reads a legacy bare-number entry from before timestamps existed', () => {
    // The old shape was { slug: seconds }. Readers upgrading mid-devotional
    // must not lose their place, so a bare number is treated as "oldest
    // possible write" — any timestamped write wins over it.
    localStorage.setItem(
      'euangelion:narration-position',
      JSON.stringify({ 'jabez-day-1': 321 }),
    )
    const row = readLocalPosition('jabez-day-1')
    expect(row?.seconds).toBe(321)
    expect(row?.at).toBe(0)
    expect(resolvePosition(row, { seconds: 10, at: 1 })).toBe(10)
  })
})

/**
 * The throttle is per reading, not per session.
 *
 * A single module-global timestamp leaked the 30s window across slugs: finish
 * one devotional, open another within half a minute, and the new reading's
 * first server write was swallowed by the previous reading's window. The
 * position most likely to be dropped was the one the reader had just moved to.
 * A queue moves between slugs constantly, so this gets worse, not better.
 */
describe('the server-write throttle', () => {
  beforeEach(() => {
    __resetThrottle()
    localStorage.clear()
  })

  const push = (slug: string) =>
    pushPosition({ slug, seconds: 42, duration: 600, listenedDelta: 5 })

  it('does not let one reading suppress another reading’s first write', () => {
    const beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    push('series-a-day-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Immediately after, a DIFFERENT reading must still reach the server.
    push('series-b-day-1')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('still throttles repeat writes within the same reading', () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', {})

    push('series-a-day-1')
    push('series-a-day-1')
    push('series-a-day-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('always writes the local cache, throttled or not', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true })),
    )
    vi.stubGlobal('navigator', {})
    push('series-a-day-1')
    push('series-a-day-1')
    expect(readLocalPosition('series-a-day-1')?.seconds).toBe(42)
  })
})
