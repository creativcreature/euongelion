'use client'

import { useState } from 'react'
import { useAudioStore, type QueueItem } from '@/stores/audioStore'

/**
 * Add a reading to what is queued, without interrupting what is playing.
 *
 * Founder, 2026-08-19: as a reader moves around the site they should be able to
 * add to the queue. This is the `+` every studied queue uses on a browse row
 * (NYTimes Audio, Apple Podcasts' "Play Next"), and the important part is what
 * it does NOT do: it never starts playback, never navigates, and never takes
 * over from whatever is already sounding. Adding is a quiet act.
 *
 * It confirms, briefly, because an add with no feedback reads as a dead button —
 * Apple Podcasts shows a "Playing Next" toast for the same reason.
 */
export default function AddToQueue({
  item,
  className,
}: {
  item: QueueItem | null
  className?: string
}) {
  const enqueue = useAudioStore((s) => s.enqueue)
  const queue = useAudioStore((s) => s.queue)
  const [flash, setFlash] = useState<'added' | 'already' | null>(null)

  // No track, no control — never offer something that would queue silence.
  if (!item) return null

  const queued = queue.some((q) => q.slug === item.slug)

  return (
    <button
      type="button"
      className={`atq${queued ? ' is-queued' : ''}${className ? ` ${className}` : ''}`}
      aria-label={
        queued
          ? `${item.title} is already queued`
          : `Add ${item.title} to the queue`
      }
      onClick={(event) => {
        // Rows are often wrapped in a link; adding must not follow it.
        event.preventDefault()
        event.stopPropagation()
        setFlash(enqueue(item) ? 'added' : 'already')
        window.setTimeout(() => setFlash(null), 1600)
      }}
    >
      {queued || flash === 'added' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
        </svg>
      )}
      <span className="sr-only" aria-live="polite">
        {flash === 'added'
          ? 'Added to the queue'
          : flash === 'already'
            ? 'Already queued'
            : ''}
      </span>

      <style jsx>{`
        .atq {
          display: grid;
          place-items: center;
          min-width: 44px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-text-muted, var(--color-text-secondary));
          cursor: pointer;
        }
        .atq svg {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }
        .atq.is-queued {
          color: var(--color-gold);
        }
        .atq:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }
      `}</style>
    </button>
  )
}
