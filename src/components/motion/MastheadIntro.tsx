'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * The press impression (F-108, rebuilt SA-124).
 *
 * Founder 2026-08-16: "Show euangelion first white on blue, then animate to
 * system setting background… I like how the logo animates small on scroll."
 * Founder 2026-08-24: "The homepage animation is not working at all the way it
 * should. This is the intro animation I want [https://telhaclarke.com.au/].
 * I need 2 versions - one for Darkmode, one for Light Mode. The Color of the
 * euangelion needs to match the mode color. If Light Mode, Euangelion should be
 * Blue, if Dark Mode it should be white."
 *
 * WHAT WAS WRONG: there was only ever ONE version. The sheet was cobalt and the
 * wordmark was knocked out of it in BOTH themes, resolving to the mode's colour
 * only in the final frame of the hand-off. In light mode you watched a cream
 * word for the whole intro and it turned blue as it left.
 *
 * THE REFERENCE, and what is taken from it (its sequence, our materials):
 *   1. LETTER ROLL  Each letter sits in its own overflow mask with a duplicate
 *                   stacked beneath. The top copy rolls up and out while the
 *                   bottom copy rolls up into place, staggered letter by letter.
 *                   Telha Clarke does this with GSAP over SVG paths at 2s /
 *                   47.5ms stagger; this is CSS over real text at 720ms / 36ms,
 *                   because the founder has already called this intro "a bit
 *                   misstimed" once and the page underneath is the heaviest on
 *                   the site.
 *   2. CURTAIN      The ground leaves on a clip-path inset, not an opacity
 *                   fade — the reference reveals its page by opening a clip
 *                   curtain, and a hard edge is also how a squeegee comes off
 *                   a sheet.
 *   3. HAND OFF     Ours, kept: the wordmark flies to the exact position and
 *                   size of the real masthead. It no longer needs to change
 *                   colour on the way, because it was the mode's colour from
 *                   the first frame — which is the founder's actual ask.
 *
 * The crimson register ghost is gone. It was the old sequence's argument for
 * itself (misregistration as identity), but it only ever read against a solid
 * cobalt sheet; over paper, in light mode, a red word sitting behind a blue one
 * is just a red word, and the founder asked for the reference's sequence.
 *
 * SAFETY — non-negotiable, unchanged: the overlay paints ON TOP of a fully
 * rendered page, is `pointer-events: none` and `aria-hidden` from the first
 * frame, plays once per session on `/` only, is skipped entirely under
 * `prefers-reduced-motion` (the reference ships no reduced-motion handling at
 * all; we do not copy that), and is torn down by a hard timeout even if an
 * animation never resolves. Nothing on the page is ever hidden waiting for it.
 */

const SEEN_KEY = 'euangelion:masthead-intro'

const WORD = 'EUANGELION'

/** The roll runs 720ms with a 36ms stagger, so the last of ten letters lands at
 * ~1044ms. The hand-off begins at 1080ms and the flight runs 900ms — the same
 * 900ms beat the rest of the sequence is cut to — finishing at ~1980ms. */
const HANDOFF_AT_MS = 1080
/** Longest the curtain may ever remain, whatever else happens. */
const HARD_STOP_MS = 2050

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
    // ground instead, which still reads as finished.
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
    }, HANDOFF_AT_MS)

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
      className={[
        'press',
        phase === 'handoff' ? 'is-lifting' : '',
        // No measured destination ⇒ the word has nowhere to BECOME, so CSS
        // falls back to lifting it with the ground rather than parking it on
        // the page in a position that means nothing.
        phase === 'handoff' && handoff === null ? 'is-unmeasured' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {/* The ground. Painted in the MODE's own colour — paper in light, the
          deep blue in dark — and it leaves on a hard clip edge. */}
      <span className="press-ink" />

      <span className="press-stage">
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
          {WORD.split('').map((letter, i) => (
            <span
              // The word is fixed and never reorders, so the index IS the
              // identity here — and it is also the stagger position.
              key={`${letter}-${i}`}
              className="press-letter"
              style={{ '--i': i } as CSSProperties}
            >
              {/* Two stacked copies inside one mask: the top rolls up and out
                  as the bottom rolls up into place. */}
              <span className="press-letter-roll">
                <span className="press-letter-face">{letter}</span>
                <span className="press-letter-face">{letter}</span>
              </span>
            </span>
          ))}
        </span>
      </span>
    </div>
  )
}
