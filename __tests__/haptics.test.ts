/**
 * D-23 (F-074) — Haptics guard contract.
 *
 * Contract under test:
 *  - hapticTick() vibrates ~10ms when navigator.vibrate exists and the user
 *    has not asked for reduced motion.
 *  - No vibrate call (and no throw) when the API is missing (iOS Safari web).
 *  - Suppressed by the in-app toggle (html.reduce-motion) AND the OS setting
 *    (prefers-reduced-motion: reduce) — haptics follow motion preferences.
 *  - vibrate() throwing is swallowed: haptics are decoration, never behavior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HAPTIC_TICK_MS, hapticTick } from '@/lib/haptics'

function mockMatchMedia(reducedMatches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') && reducedMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

describe('hapticTick guard', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('reduce-motion')
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    // jsdom's navigator has no vibrate by default; clean up any stub.
    delete (navigator as unknown as Record<string, unknown>).vibrate
  })

  it('vibrates a 10ms tick when supported and motion is allowed', () => {
    const vibrate = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
      writable: true,
    })

    expect(hapticTick()).toBe(true)
    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_TICK_MS)
  })

  it('no-ops without throwing when navigator.vibrate is missing (iOS web)', () => {
    expect('vibrate' in navigator).toBe(false)
    expect(() => hapticTick()).not.toThrow()
    expect(hapticTick()).toBe(false)
  })

  it('is suppressed by the in-app html.reduce-motion toggle', () => {
    const vibrate = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
      writable: true,
    })
    document.documentElement.classList.add('reduce-motion')

    expect(hapticTick()).toBe(false)
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('is suppressed by the OS prefers-reduced-motion setting', () => {
    const vibrate = vi.fn().mockReturnValue(true)
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
      writable: true,
    })
    mockMatchMedia(true)

    expect(hapticTick()).toBe(false)
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('swallows a throwing vibrate() and reports false', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockImplementation(() => {
        throw new Error('blocked')
      }),
      configurable: true,
      writable: true,
    })

    expect(() => hapticTick()).not.toThrow()
    expect(hapticTick()).toBe(false)
  })
})
