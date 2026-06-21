'use client'

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
 */
export default function ComposingPaths() {
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

      <p className="text-serif-italic vw-body-lg text-center text-secondary">
        Building your paths...
      </p>

      <style>{`
        @keyframes gatherDot {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.15); }
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
