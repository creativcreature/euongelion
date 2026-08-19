'use client'

import { useMemo, useState } from 'react'
import { getAudioElement } from '@/lib/audio/audio-element'
import {
  ACTIVITIES,
  BUDGETS,
  buildOccasionQueue,
  type Activity,
  type Budget,
} from '@/lib/audio/occasion'
import { formatRuntime, queueDuration } from '@/lib/audio/queue-builder'
import { useAudioStore, type QueueItem } from '@/stores/audioStore'

const ACTIVITY_LABEL: Record<Activity, string> = {
  commuting: 'Commuting',
  working: 'Working',
  walking: 'Walking',
  resting: 'Resting',
}

const BUDGET_LABEL: Record<Budget, string> = {
  5: 'Under 5',
  10: 'About 10',
  20: 'About 20',
  60: 'An hour+',
}

/**
 * The listening front door.
 *
 * The reading side asks *what are you wrestling with?* This asks the question
 * a listener actually has — **how long have you got, and what are you doing?**
 * — because those are the two facts that decide what is playable right now, and
 * because someone reaching for audio usually has their hands full. Two taps,
 * then play. No questionnaire.
 *
 * When a choice returns nothing it says so plainly rather than quietly
 * substituting something else. "An hour or more" currently returns nothing at
 * all, and that is the honest state of the catalogue: nothing runs past 28
 * minutes. Hiding that would make the picker feel broken instead of making the
 * gap visible.
 */
export default function OccasionPicker({ pool }: { pool: QueueItem[] }) {
  const [minutes, setMinutes] = useState<Budget | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const start = useAudioStore((s) => s.start)

  const queue = useMemo(() => {
    if (minutes === null || activity === null) return []
    return buildOccasionQueue({ minutes, activity }, new Date(), pool)
  }, [minutes, activity, pool])

  const ready = minutes !== null && activity !== null

  return (
    <section className="op" aria-labelledby="op-heading">
      <p className="op-eyebrow">Listen</p>
      <h2 id="op-heading" className="op-title">
        How long have you got?
      </h2>

      <div className="op-row" role="group" aria-label="How long have you got">
        {BUDGETS.map((b) => (
          <button
            key={b}
            type="button"
            className={`op-chip${minutes === b ? ' is-on' : ''}`}
            aria-pressed={minutes === b}
            onClick={() => setMinutes(b)}
          >
            {BUDGET_LABEL[b]}
          </button>
        ))}
      </div>

      <h3 className="op-sub">And what are you doing?</h3>
      <div className="op-row" role="group" aria-label="What are you doing">
        {ACTIVITIES.map((a) => (
          <button
            key={a}
            type="button"
            className={`op-chip${activity === a ? ' is-on' : ''}`}
            aria-pressed={activity === a}
            onClick={() => setActivity(a)}
          >
            {ACTIVITY_LABEL[a]}
          </button>
        ))}
      </div>

      {ready && queue.length > 0 && (
        <button
          type="button"
          className="op-go"
          onClick={() => {
            start({ items: queue, source: 'daily', label: 'For right now' })
            // Synchronous inside the tap, or iOS drops the grant.
            const audio = getAudioElement()
            if (audio) void audio.play().catch(() => {})
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
          <span>
            Play {queue.length} {queue.length === 1 ? 'reading' : 'readings'}
          </span>
          <span className="op-go-time oldstyle-nums">
            {formatRuntime(queueDuration(queue))}
          </span>
        </button>
      )}

      {ready && queue.length === 0 && (
        <p className="op-none">
          Nothing that length yet. The catalogue tops out at 28 minutes — the
          longer formats are still to be made.
        </p>
      )}

      <style jsx>{`
        .op {
          border-top: 2px solid var(--color-gold);
          padding-top: 1rem;
          margin: 2rem 0;
        }
        .op-eyebrow {
          font-size: 0.55rem;
          letter-spacing: 0.17em;
          text-transform: uppercase;
          color: var(--color-gold);
          margin-bottom: 0.2rem;
        }
        .op-title {
          font-family: var(--font-family-serif, Georgia, serif);
          font-style: italic;
          font-size: 1.5rem;
          line-height: 1.15;
          color: var(--color-text-primary, var(--color-fg));
          margin-bottom: 0.7rem;
        }
        .op-sub {
          font-size: 0.58rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
          margin: 1rem 0 0.5rem;
        }
        .op-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .op-chip {
          min-height: 44px;
          padding: 0.4rem 0.85rem;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary, var(--color-fg));
          font-size: 0.62rem;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .op-chip.is-on {
          border-color: var(--color-gold);
          box-shadow: inset 0 0 0 1px var(--color-gold);
        }
        .op-chip:focus-visible,
        .op-go:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 2px;
        }
        .op-go {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1.1rem;
          min-height: 44px;
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-left: 3px solid var(--color-gold);
          color: var(--color-text-primary, var(--color-fg));
          font-size: 0.62rem;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .op-go-time {
          color: var(--color-text-muted, var(--color-text-secondary));
          font-variant-numeric: oldstyle-nums;
          letter-spacing: 0.06em;
        }
        .op-none {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: var(--color-text-muted, var(--color-text-secondary));
          max-width: 32rem;
        }
      `}</style>
    </section>
  )
}
