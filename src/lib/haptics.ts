/**
 * D-23 (F-074) — Haptic feedback.
 *
 * One subtle ~10ms tick on key confirmations only:
 *   1. marking a day complete   (DailyBreadView)
 *   2. mobile tab bar tap       (MobileTabBar)
 *   3. "Aa" reading-theme pick  (ReaderThemeControl)
 *
 * Progressive enhancement by design (task-authorized): the Vibration API
 * exists on Android Chrome; iOS Safari/web has no `navigator.vibrate`, so
 * this is a silent no-op there — never a fallback UI, never an error.
 *
 * Respects reduced motion in both site conventions: the OS setting
 * (`prefers-reduced-motion`) and the in-app Settings toggle
 * (`html.reduce-motion`, stamped by Providers). A reader who turned motion
 * off should not get buzzed either.
 */

/** Duration of the standard confirmation tick, in milliseconds. */
export const HAPTIC_TICK_MS = 10

/** True when the user has asked for reduced motion (OS or in-app). */
function reducedMotionRequested(): boolean {
  if (document.documentElement.classList.contains('reduce-motion')) {
    return true
  }
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Fire one subtle haptic tick. Returns true when a vibration was actually
 * requested, false when skipped (SSR, unsupported browser, reduced motion).
 */
export function hapticTick(durationMs: number = HAPTIC_TICK_MS): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }
  if (typeof navigator.vibrate !== 'function') {
    return false
  }
  if (reducedMotionRequested()) {
    return false
  }
  // vibrate() can throw/return false when blocked (e.g. no user gesture yet);
  // haptics are decoration, never behavior — swallow and report false.
  try {
    return navigator.vibrate(durationMs) === true
  } catch {
    return false
  }
}
