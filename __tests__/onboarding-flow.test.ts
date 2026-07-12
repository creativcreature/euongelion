/**
 * Phase 1d — account-onboarding bookend state machine (pattern doc §4,
 * founder picks §7.3/§7.7; F-065 extension).
 *
 * Contracts under test:
 *  - the beat order is fixed: welcome → window → reminders → bridge
 *    (two capture beats max, one decision per screen);
 *  - beat A offers exactly the three NAMED windows Morning/Midday/Evening;
 *  - the exit always lands IN CONTENT, never a menu: explicit redirect
 *    (incl. the held-generation resume) → active plan route →
 *    Daily Bread; '/' is never a destination.
 */
import { describe, expect, it } from 'vitest'
import {
  ONBOARDING_BEATS,
  ONBOARDING_WINDOW_CHOICES,
  beatIndex,
  isLastBeat,
  isOnboardingWindowChoice,
  nextBeat,
  previousBeat,
  resolveOnboardingDestination,
} from '@/lib/auth/onboarding-flow'
import { REMINDER_WINDOWS } from '@/lib/push/reminder-window'

describe('onboarding beat machine', () => {
  it('is the fixed bookend sequence — two capture beats, no quiz inflation', () => {
    expect(ONBOARDING_BEATS).toEqual([
      'welcome',
      'window',
      'reminders',
      'bridge',
    ])
  })

  it('advances and retreats one beat at a time, clamped at the ends', () => {
    expect(nextBeat('welcome')).toBe('window')
    expect(nextBeat('window')).toBe('reminders')
    expect(nextBeat('reminders')).toBe('bridge')
    expect(nextBeat('bridge')).toBe('bridge')

    expect(previousBeat('bridge')).toBe('reminders')
    expect(previousBeat('welcome')).toBe('welcome')

    expect(beatIndex('welcome')).toBe(0)
    expect(isLastBeat('bridge')).toBe(true)
    expect(isLastBeat('reminders')).toBe(false)
  })
})

describe('onboarding window choices (§7.3)', () => {
  it('offers exactly Morning / Midday / Evening as named windows', () => {
    expect(ONBOARDING_WINDOW_CHOICES).toEqual(['morning', 'midday', 'evening'])
    // Each choice is a REAL reminder window the sender understands.
    for (const code of ONBOARDING_WINDOW_CHOICES) {
      expect(REMINDER_WINDOWS[code]).toBeDefined()
    }
  })

  it('recognizes only the three onboarding choices', () => {
    expect(isOnboardingWindowChoice('morning')).toBe(true)
    expect(isOnboardingWindowChoice('evening')).toBe(true)
    // early_morning exists in the system but is a Settings refinement.
    expect(isOnboardingWindowChoice('early_morning')).toBe(false)
    expect(isOnboardingWindowChoice('midnight')).toBe(false)
    expect(isOnboardingWindowChoice(null)).toBe(false)
  })
})

describe('onboarding destination — lands in content, never a menu', () => {
  it('honors an explicit redirect (the held-generation resume path)', () => {
    expect(
      resolveOnboardingDestination({
        redirect: '/soul-audit/results?resume=1',
        activePlanRoute: '/daily-bread',
      }),
    ).toBe('/soul-audit/results?resume=1')
  })

  it('falls through to the active plan route when the redirect is the landing page', () => {
    expect(
      resolveOnboardingDestination({
        redirect: '/',
        activePlanRoute: '/daily-bread?planToken=abc&day=1',
      }),
    ).toBe('/daily-bread?planToken=abc&day=1')
  })

  it('defaults to Daily Bread — the reading home — with nothing else', () => {
    expect(
      resolveOnboardingDestination({ redirect: null, activePlanRoute: null }),
    ).toBe('/daily-bread')
    expect(
      resolveOnboardingDestination({ redirect: '/', activePlanRoute: '' }),
    ).toBe('/daily-bread')
  })

  it("never returns '/' — skipping everything still lands in content", () => {
    const cases = [
      { redirect: '/', activePlanRoute: null },
      { redirect: null, activePlanRoute: null },
      { redirect: '', activePlanRoute: '  ' },
      { redirect: undefined, activePlanRoute: undefined },
    ]
    for (const params of cases) {
      expect(resolveOnboardingDestination(params)).not.toBe('/')
    }
  })

  it('rejects non-path values defensively', () => {
    expect(
      resolveOnboardingDestination({
        redirect: 'https://evil.example.com',
        activePlanRoute: 'javascript:alert(1)',
      }),
    ).toBe('/daily-bread')
  })
})
