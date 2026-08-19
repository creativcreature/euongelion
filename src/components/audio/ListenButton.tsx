'use client'

import { getAudioElement } from '@/lib/audio/audio-element'
import { formatRuntime, queueDuration } from '@/lib/audio/queue-builder'
import {
  useAudioStore,
  type QueueItem,
  type QueueSource,
} from '@/stores/audioStore'

export interface ListenButtonProps {
  items: QueueItem[]
  index?: number
  source: QueueSource
  label?: string | null
  /** Shown before the runtime. Defaults to "Listen". */
  children?: React.ReactNode
  className?: string
}

/**
 * Start listening — the peer of the read call-to-action.
 *
 * Two things here are not incidental:
 *
 * 1. **`play()` is called synchronously inside the tap handler.** iOS grants a
 *    media element permission to sound only from within the gesture that asked
 *    for it. Awaiting anything first — a fetch, a router push, even a state
 *    update that defers — loses the grant, and playback silently does nothing
 *    on exactly the device most people listen on.
 * 2. **It states the runtime.** What a listener needs before committing is how
 *    long this is, and the whole catalogue currently hides that behind a play
 *    button. "Listen — 42 min" is a different offer from "Listen".
 *
 * Renders nothing when no item in the queue has a track, rather than offering
 * a control that would play silence.
 */
export default function ListenButton({
  items,
  index = 0,
  source,
  label = null,
  children = 'Listen',
  className,
}: ListenButtonProps) {
  const start = useAudioStore((s) => s.start)
  if (!items.length) return null

  return (
    <button
      type="button"
      className={className ?? 'listen-cta'}
      onClick={() => {
        start({ items, index, source, label })
        // Synchronous, inside the gesture. The host swaps `src` from an effect
        // a tick later; calling play() here still counts as user-initiated,
        // and the host resumes it when the source settles.
        const audio = getAudioElement()
        if (audio) void audio.play().catch(() => {})
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
      <span>{children}</span>
      <span className="listen-cta-time oldstyle-nums">
        {formatRuntime(queueDuration(items))}
      </span>

      <style jsx>{`
        .listen-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 44px;
          padding: 0.45rem 0.95rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-left: 3px solid var(--color-gold);
          color: var(--color-text-primary, var(--color-fg));
          font-size: 0.62rem;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .listen-cta:hover {
          background: var(--color-surface, transparent);
        }
        .listen-cta:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 2px;
        }
        .listen-cta-time {
          color: var(--color-text-muted, var(--color-text-secondary));
          font-variant-numeric: oldstyle-nums;
          letter-spacing: 0.06em;
        }
      `}</style>
    </button>
  )
}
