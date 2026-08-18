'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The press impression (F-108).
 *
 * Founder 2026-08-16: "Show euangelion first white on blue, then animate to
 * system setting background (or user set background mode) and to normal site
 * state… I like how the logo animates small on scroll as well." Then, of the
 * first attempt: "The open animation is needing much more attention. It was
 * half assed."
 *
 * It was — a solid panel that faded a word in and slid away. That is a curtain,
 * and any site could wear it. This is the sequence a PRESS makes, which is the
 * one thing only this masthead can do:
 *
 *   1. INK      The sheet is solid cobalt and the wordmark is KNOCKED OUT of
 *               it — the letters are the paper showing through, not white type
 *               laid on top. That is how the real thing is printed.
 *   2. SET      The word arrives over-tracked and tightens to its final
 *               letter-spacing, the way type is set into a stick.
 *   3. REGISTER A crimson ghost of the wordmark sits a few pixels off and
 *               slides into alignment. Misregistration is this brand's actual
 *               signature — it is on every plate on the site — so the intro is
 *               made out of the identity rather than decorated with it.
 *   4. HAND OFF The ink lifts on a hard horizontal edge, and the wordmark does
 *               NOT fade: it flies to the exact position and size of the real
 *               masthead, measured at runtime, and hands over. The intro
 *               BECOMES the site instead of getting out of its way.
 *
 * SAFETY — unchanged from the first version and non-negotiable:
 * the overlay paints ON TOP of a fully rendered page, is `pointer-events: none`
 * and `aria-hidden` from the first frame, plays once per session on `/` only,
 * is skipped entirely under `prefers-reduced-motion`, and is torn down by a
 * hard timeout even if an animation never resolves. Nothing on the page is ever
 * hidden waiting for it.
 */

const SEEN_KEY = 'euangelion:masthead-intro'
/** Longest the curtain may ever remain, whatever else happens.
 *
 * The sequence finishes at ~2050ms: hand-off begins at 1050ms and the flight
 * runs 1000ms. 3200ms left roughly 1.15s of an inert, fully transparent overlay
 * sitting over a finished page — invisible, but it is the difference between an
 * intro that ends and one that lingers. Trimmed to just past the flight.
 * (Founder 2026-08-18: "The intro animation is a bit misstimed.") */
const HARD_STOP_MS = 2250

interface Handoff {
  /** Translation from the intro wordmark's centre to the real one's. */
  dx: number
  dy: number
  /** Scale that takes the intro wordmark to the real one's width. */
  scale: number
}

export default function MastheadIntro() {
  // Starts inert so the server and first client paint agree — no overlay, no
  // hydration mismatch on the most-visited page.
  const [phase, setPhase] = useState<'idle' | 'ink' | 'handoff'>('idle')
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const wordRef = useRef<HTMLSpanElement | null>(null)

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
      seen = false
    }
    if (seen) return
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Storage disabled; it will simply play again. Harmless.
    }

    const start = window.requestAnimationFrame(() => setPhase('ink'))

    // Measure the real masthead and fly to it. If it cannot be found — a
    // layout change, a different shell — the wordmark simply lifts with the
    // ink instead, which still reads as finished.
    const toHandoff = window.setTimeout(() => {
      const real = document.querySelector<HTMLElement>('.js-shell-masthead-fit')
      const mine = wordRef.current
      if (real && mine) {
        const r = real.getBoundingClientRect()
        const m = mine.getBoundingClientRect()
        if (r.width > 0 && m.width > 0) {
          setHandoff({
            dx: r.left + r.width / 2 - (m.left + m.width / 2),
            dy: r.top + r.height / 2 - (m.top + m.height / 2),
            scale: r.width / m.width,
          })
        }
      }
      setPhase('handoff')
    }, 1050)

    const done = window.setTimeout(() => setPhase('idle'), HARD_STOP_MS)

    return () => {
      window.cancelAnimationFrame(start)
      window.clearTimeout(toHandoff)
      window.clearTimeout(done)
    }
  }, [])

  if (phase === 'idle') return null

  const flying = phase === 'handoff' && handoff !== null

  return (
    <div
      className={`press ${phase === 'handoff' ? 'is-lifting' : ''}`}
      aria-hidden="true"
    >
      {/* The ink. A hard-edged field that retracts upward — a squeegee pulling
          off the sheet, not a panel sliding away. */}
      <span className="press-ink" />

      <span className="press-stage">
        {/* The crimson plate, offset and slightly late — the misregistration
            this whole brand is printed with. */}
        <span className="press-word press-word--slip" aria-hidden="true">
          EUANGELION
        </span>
        <span
          ref={wordRef}
          className="press-word press-word--key"
          style={
            flying
              ? {
                  transform: `translate3d(${handoff.dx.toFixed(1)}px, ${handoff.dy.toFixed(1)}px, 0) scale(${handoff.scale.toFixed(4)})`,
                }
              : undefined
          }
        >
          EUANGELION
        </span>
      </span>
    </div>
  )
}
