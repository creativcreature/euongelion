'use client'

import { useEffect, useRef } from 'react'

interface PastoralSwitchModalProps {
  open: boolean
  currentSeriesTitle: string | null
  currentDayNumber?: number
  newSeriesTitle: string
  onQueueMonday: () => void
  onReplaceToday: () => void
  onCancel: () => void
  busy?: boolean
}

export default function PastoralSwitchModal({
  open,
  currentSeriesTitle,
  currentDayNumber,
  newSeriesTitle,
  onQueueMonday,
  onReplaceToday,
  onCancel,
  busy = false,
}: PastoralSwitchModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    // Focus the primary affirmative on open.
    const frame = window.requestAnimationFrame(() => {
      firstButtonRef.current?.focus()
    })
    return () => {
      document.removeEventListener('keydown', handleEsc)
      window.cancelAnimationFrame(frame)
    }
  }, [open, busy, onCancel])

  if (!open) return null

  const currentLabel = currentSeriesTitle ?? 'your current devotional'

  return (
    <div
      className="library-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pastoral-switch-title"
      aria-describedby="pastoral-switch-desc"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div ref={dialogRef} className="library-modal-panel">
        <p className="text-label vw-small text-gold mb-2">
          SWITCHING DEVOTIONALS
        </p>
        <h2 id="pastoral-switch-title" className="vw-heading-md mb-3">
          You&rsquo;re in the middle of {currentLabel}
          {typeof currentDayNumber === 'number' && currentDayNumber > 0
            ? ` (Day ${currentDayNumber})`
            : ''}
          .
        </h2>
        <p id="pastoral-switch-desc" className="vw-body text-secondary mb-5">
          Would you like to finish what you&rsquo;ve started, or move into{' '}
          <strong>{newSeriesTitle}</strong> now? Either way, {currentLabel} will
          be saved to your library so you can return to it.
        </p>

        <div className="library-modal-actions">
          <button
            ref={firstButtonRef}
            type="button"
            className="cta-major text-label vw-small px-5 py-2"
            onClick={onQueueMonday}
            disabled={busy}
          >
            START ON MONDAY
          </button>
          <button
            type="button"
            className="cta-major text-label vw-small px-5 py-2 library-modal-secondary"
            onClick={onReplaceToday}
            disabled={busy}
          >
            REPLACE TODAY
          </button>
          <button
            type="button"
            className="text-label vw-small link-highlight library-modal-tertiary"
            onClick={onCancel}
            disabled={busy}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}
