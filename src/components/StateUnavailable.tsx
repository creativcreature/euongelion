'use client'

/**
 * Reusable "we could not confirm this" state.
 *
 * Founder direction 2026-07-28 (roadmap item #5): several interfaces hid a
 * failed read or rendered nothing at all, so an outage was indistinguishable
 * from deleted data — the reader concluded their selection had been lost. The
 * canonical current-reading resolver now reports `unavailable` as a first-class
 * state (never rewritten as "empty"), and this component is how that state is
 * spoken to the reader.
 *
 * Two promises the copy must always keep:
 *   1. Say plainly that we could not CONFIRM something — not that it is gone.
 *   2. Say explicitly that nothing the reader chose has been changed.
 * Then give one obvious action.
 */
export default function StateUnavailable({
  subject = 'your current devotional',
  onRetry,
  retrying = false,
  className = '',
}: {
  /** What could not be confirmed, e.g. "your current devotional", "your library". */
  subject?: string
  /** Retry handler. When omitted the action is not rendered. */
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  return (
    <div
      className={`state-unavailable ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <p className="text-label vw-small text-gold state-unavailable-kicker">
        NOT CONFIRMED
      </p>
      <p className="vw-body state-unavailable-body">
        We couldn&rsquo;t confirm {subject}.{' '}
        <span className="state-unavailable-reassure">
          Your selection has not been changed.
        </span>
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="cta-major text-label vw-small state-unavailable-action"
        >
          {retrying ? 'TRYING…' : 'TRY AGAIN'}
        </button>
      )}
    </div>
  )
}
