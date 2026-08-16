'use client'

import { useEffect, useState } from 'react'

/**
 * The masthead intro (F-107).
 *
 * Founder 2026-08-16: "Show euangelion first white on blue, then animate to
 * system setting background (or user set background mode) and to normal site
 * state." Reference: telhaclarke.com.au.
 *
 * A press has one moment where the ink is the only thing on the sheet. That is
 * what this is: the wordmark reversed out of a full-bleed cobalt field, which
 * then lifts to reveal the page already sitting underneath in whatever theme
 * the reader is actually in.
 *
 * FIVE RULES IT KEEPS, in rough order of how badly each would hurt if broken:
 *
 * 1. IT NEVER HIDES THE PAGE. The overlay is a sibling painted ON TOP of a
 *    fully-rendered document. If the JS fails, the overlay simply never
 *    mounts. There is no `opacity: 0` on the real page waiting to be undone —
 *    the failure mode of every intro animation that has ever eaten a site.
 * 2. ONCE PER SESSION, home only. It plays on `/` on a fresh arrival and is
 *    remembered in sessionStorage, so navigating back home mid-session does
 *    not replay it. A curtain you have to sit through twice is a toll booth.
 * 3. It is short — under a second of hold, then a lift.
 * 4. `prefers-reduced-motion` skips it entirely.
 * 5. It is inert to assistive tech and to the pointer: `aria-hidden` and
 *    `pointer-events: none` from the first frame, so a screen reader hears the
 *    page and a fast reader can click straight through it.
 */

const SEEN_KEY = 'euangelion:masthead-intro'

export default function MastheadIntro() {
  // Starts false so the server and the first client paint agree: no overlay.
  // Anything else risks a hydration mismatch on the most-visited page.
  const [phase, setPhase] = useState<'idle' | 'holding' | 'lifting'>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.pathname !== '/') return

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let seen = false
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      // Private mode or storage disabled. Treat as "not seen" rather than
      // failing — the intro is harmless, a thrown error is not.
      seen = false
    }
    if (seen) return

    try {
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Nothing to do; it will simply play again next navigation.
    }

    // Scheduled on the next frame rather than set synchronously in the effect
    // body: a synchronous set here cascades a render, and starting the curtain
    // one frame late is invisible.
    const start = window.requestAnimationFrame(() => setPhase('holding'))
    const lift = window.setTimeout(() => setPhase('lifting'), 900)
    const done = window.setTimeout(() => setPhase('idle'), 2000)
    return () => {
      window.cancelAnimationFrame(start)
      window.clearTimeout(lift)
      window.clearTimeout(done)
    }
  }, [])

  if (phase === 'idle') return null

  return (
    <div
      className={`masthead-intro ${phase === 'lifting' ? 'is-lifting' : ''}`}
      aria-hidden="true"
    >
      <span className="masthead-intro-word">EUANGELION</span>
    </div>
  )
}
