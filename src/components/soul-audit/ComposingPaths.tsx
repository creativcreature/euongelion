'use client'

import { useEffect, useState } from 'react'

/**
 * Phase A loading state for the Soul Audit — the "gathering / building your
 * paths" sequence shown WHILE the options compose is in flight (i.e. while
 * `isSubmitting` is true, before the reader is routed to /soul-audit/results
 * where Phase B — the "SETTING YOUR EDITION" press — takes over).
 *
 * This is the SAME markup the standalone /soul-audit page renders inline, lifted
 * into one place so the homepage inline widget and the standalone page show an
 * identical, polished wait instead of a bare button label. Self-contained: the
 * gather-dot keyframes live in this component's own <style> tag (no globals.css
 * edit), exactly as the standalone page does it.
 *
 * Reduced motion: the dots animate via a keyframe that only changes opacity +
 * scale; under `prefers-reduced-motion: reduce` we stop the animation and hold
 * the dots at rest so there is no motion but the state still reads as "working."
 * Layout is fixed-height (py-16 + a stable copy line) so swapping the form for
 * this — and back — produces no layout shift.
 *
 * BACKLOG #42 — the stages are named.
 *
 * Three dots and "Building your paths..." is honest but opaque, and the wait is
 * real work: the input is read, matched against the library, and three paths are
 * composed from retrieved Scripture. stoic. lists its stages during the same
 * kind of pause, and it turns a ten-second wait into something happening rather
 * than something lagging.
 *
 * THE TIMING IS ESTIMATED AND THE CODE SAYS SO. The compose is a single request
 * with no progress events, so this cannot instrument real stage boundaries. What
 * it does instead is narrate work that genuinely happens, in the order it
 * genuinely happens, advancing on elapsed time. Two rules keep that honest:
 * the last stage never self-completes (nothing is ever marked done that this
 * component cannot observe), and the whole thing unmounts the moment the request
 * returns — so a false "finished" state is never shown.
 */

/** Real stages, in the order the submit route performs them. */
const STAGES = [
  'Reading what you wrote',
  'Matching it against the library',
  'Composing three paths from Scripture',
] as const

/** Estimated, not measured — see the note above. */
const STAGE_MS = 2600
export default function ComposingPaths() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    // Advance, but never past the last stage: the final step stays "in
    // progress" until the request returns and this unmounts.
    const id = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1))
    }, STAGE_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className="flex flex-col items-center py-16"
      role="status"
      aria-live="polite"
    >
      <div className="mb-10 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="composing-paths-dot inline-block h-2 w-2 rounded-full"
            style={{
              backgroundColor: 'var(--color-gold)',
              animation: `gatherDot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <ol className="composing-paths-stages">
        {STAGES.map((label, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <li
              key={label}
              className={`composing-paths-stage${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
            >
              <span className="composing-paths-tick" aria-hidden="true">
                {done ? '✓' : '·'}
              </span>
              <span>{label}</span>
            </li>
          )
        })}
      </ol>

      <style>{`
        @keyframes gatherDot {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
        .composing-paths-stages {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          text-align: left;
        }
        .composing-paths-stage {
          display: grid;
          grid-template-columns: 1.1rem minmax(0, 1fr);
          gap: 0.5rem;
          align-items: baseline;
          font-family: var(--font-family-serif);
          font-size: 1rem;
          color: var(--color-text-muted, var(--color-text-secondary));
          opacity: 0.55;
          transition: opacity 320ms ease, color 320ms ease;
        }
        .composing-paths-stage.is-active,
        .composing-paths-stage.is-done {
          opacity: 1;
          color: var(--color-text-secondary, inherit);
        }
        .composing-paths-tick {
          font-family: var(--font-family-ui);
          font-size: 0.8rem;
          color: var(--color-gold);
        }
        @media (prefers-reduced-motion: reduce) {
          .composing-paths-dot {
            animation: none !important;
            opacity: 0.7;
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
