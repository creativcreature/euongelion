import type { ReminderWindow } from '@/lib/push/reminder-window'

/**
 * onboarding-flow — the account-onboarding bookend state machine
 * (pattern doc §4, founder picks §7.3/§7.7; F-065 extension).
 *
 * Structure is fixed: a warm framing screen in, TWO capture beats
 * (reminder window, reminders opt-in), a bridge screen out. One decision
 * per screen. Skipping any beat — or everything — still lands the reader
 * in content with defaults.
 */

export const ONBOARDING_BEATS = [
  'welcome',
  'window',
  'reminders',
  'bridge',
] as const

export type OnboardingBeat = (typeof ONBOARDING_BEATS)[number]

/**
 * Founder pick §7.3: the onboarding beat offers the three NAMED windows —
 * Morning / Midday / Evening. (Early morning remains available as a
 * refinement in Settings → Reminders.)
 */
export const ONBOARDING_WINDOW_CHOICES = [
  'morning',
  'midday',
  'evening',
] as const satisfies readonly ReminderWindow[]

export type OnboardingWindowChoice = (typeof ONBOARDING_WINDOW_CHOICES)[number]

export function isOnboardingWindowChoice(
  value: unknown,
): value is OnboardingWindowChoice {
  return (ONBOARDING_WINDOW_CHOICES as readonly string[]).includes(
    value as string,
  )
}

export function beatIndex(beat: OnboardingBeat): number {
  return ONBOARDING_BEATS.indexOf(beat)
}

export function nextBeat(beat: OnboardingBeat): OnboardingBeat {
  const index = beatIndex(beat)
  return ONBOARDING_BEATS[Math.min(index + 1, ONBOARDING_BEATS.length - 1)]
}

export function previousBeat(beat: OnboardingBeat): OnboardingBeat {
  const index = beatIndex(beat)
  return ONBOARDING_BEATS[Math.max(index - 1, 0)]
}

export function isLastBeat(beat: OnboardingBeat): boolean {
  return beatIndex(beat) === ONBOARDING_BEATS.length - 1
}

/**
 * Where onboarding lands the reader — IN CONTENT, never a menu (§4).
 *
 *  1. An explicit continuation wins: a sanitized redirect that isn't the
 *     landing page (this is how the held-generation resume returns to
 *     /soul-audit/results?resume=1 → the composing interstitial).
 *  2. Otherwise the active plan's own route, when one exists.
 *  3. Otherwise Daily Bread — the reading home.
 *
 * '/' (the landing page) is never returned: skipping everything still
 * lands in content with defaults.
 */
export function resolveOnboardingDestination(params: {
  redirect: string | null | undefined
  activePlanRoute: string | null | undefined
}): string {
  const redirect = params.redirect?.trim() || null
  if (redirect && redirect !== '/' && redirect.startsWith('/')) {
    return redirect
  }
  const planRoute = params.activePlanRoute?.trim() || null
  if (planRoute && planRoute.startsWith('/')) {
    return planRoute
  }
  return '/daily-bread'
}
