'use client'

import { useEffect } from 'react'

/**
 * One ref-counted owner of the page scroll lock (backlog #59).
 *
 * THE BUG THIS EXISTS TO KILL. Seven components each did their own naive
 * save/restore of `document.body.style.overflow`. Because every one of them
 * captured "the previous value" at its own open, nested opens leaked:
 *
 *   menu opens        → saves ''        → sets hidden
 *   search opens      → saves 'hidden'  → sets hidden
 *   menu closes FIRST → restores ''     → THE PAGE SCROLLS BEHIND OPEN SEARCH
 *
 * Reachable in two taps on mobile, because the search button sits outside the
 * menu panel: tapping it closes the menu and opens search in the same tick.
 *
 * The fix is depth, not cleverness. The FIRST lock captures the real previous
 * value; nested locks only increment. The LAST release restores. A component
 * closing out of order can no longer speak for the whole page.
 *
 * DELIBERATELY STILL `body { overflow: hidden }`. That is what all seven owners
 * already did, and this change is about ownership, not mechanism. Note the
 * known limitation, because it is easy to misread this as a full lock: the
 * scrolling element here is `<html>`, so on some platforms the page can still
 * be moved. Locking `<html>` instead DOES hold — and breaks `position: sticky`
 * on the topbar, measured at bottom 53px → −1346px in F-118. Changing the
 * mechanism is a separate decision with its own testing; this one only stops
 * the owners fighting each other.
 */

let depth = 0
let release: (() => void) | null = null

function engage(): () => void {
  const { body } = document
  const previousOverflow = body.style.overflow
  body.style.overflow = 'hidden'
  return () => {
    body.style.overflow = previousOverflow
  }
}

/** True while any component currently holds the lock. */
export function isScrollLocked(): boolean {
  return depth > 0
}

/**
 * Hold the page scroll lock while `active` is true.
 *
 * Safe to call from several components at once; the page unlocks when the last
 * one lets go.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return

    depth += 1
    if (depth === 1) release = engage()

    return () => {
      depth -= 1
      if (depth === 0) {
        release?.()
        release = null
      }
    }
  }, [active])
}
