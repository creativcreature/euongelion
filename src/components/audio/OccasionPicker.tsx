'use client'

import { useMemo, useState } from 'react'
import { getAudioElement } from '@/lib/audio/audio-element'
import {
  ACTIVITIES,
  BUDGETS,
  buildOccasionQueue,
  longFormFor,
  type Activity,
  type Budget,
} from '@/lib/audio/occasion'
import { formatRuntime, queueDuration } from '@/lib/audio/queue-builder'
import { buildBookQueue } from '@/lib/audio/scripture-whole'
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
 * substituting something else — a gap made visible is a gap that gets closed.
 *
 * "An hour or more" was the gap, and it is now answered honestly rather than
 * cosmetically: `bible-365` read in canonical order is long-form already, so
 * the budget offers whole books rather than a shuffle of eleven-minute days.
 * The remaining empty state is real and stays — the short end still has
 * nothing, because the Office has not been recorded.
 */
export default function OccasionPicker({
  pool,
  compact = false,
}: {
  pool: QueueItem[]
  /** Inside the audio sidebar, where it is a section rather than a surface. */
  compact?: boolean
}) {
  const [minutes, setMinutes] = useState<Budget | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const start = useAudioStore((s) => s.start)

  const queue = useMemo(() => {
    if (minutes === null || activity === null) return []
    return buildOccasionQueue({ minutes, activity }, new Date(), pool)
  }, [minutes, activity, pool])

  /**
   * Whole books, for the budget the devotional pool cannot answer. Empty for
   * every other occasion, so nothing below changes shape for them.
   */
  const books = useMemo(() => {
    if (minutes === null || activity === null) return []
    return longFormFor({ minutes, activity })
  }, [minutes, activity])

  const ready = minutes !== null && activity !== null

  return (
    <section
      className={`op${compact ? ' is-compact' : ''}`}
      aria-labelledby="op-heading"
    >
      {!compact && <p className="op-eyebrow">Listen</p>}
      <h2 id="op-heading" className="op-title">
        {compact ? 'Find something' : 'How long have you got?'}
      </h2>
      {compact && <h3 className="op-sub">How long have you got?</h3>}

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

      {ready && books.length > 0 && (
        <div className="op-books">
          <h3 className="op-sub">Or a book, end to end</h3>
          <ul className="op-book-list">
            {books.map((run) => (
              <li key={`${run.book}-${run.days[0]}`}>
                <button
                  type="button"
                  className="op-book"
                  onClick={() => {
                    const items = buildBookQueue(run)
                    if (items.length === 0) return
                    start({ items, source: 'series', label: run.name })
                    // Synchronous inside the tap, or iOS drops the grant.
                    const audio = getAudioElement()
                    if (audio) void audio.play().catch(() => {})
                  }}
                >
                  <span className="op-book-name">{run.name}</span>
                  <span className="op-book-time oldstyle-nums">
                    {formatRuntime(run.duration)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ready && queue.length === 0 && books.length === 0 && (
        <p className="op-none">
          Nothing that length yet. The readings top out at 28 minutes — the
          shorter and longer formats are still to be made.
        </p>
      )}

      <style jsx>{`
        .op {
          border-top: 2px solid var(--color-gold);
          padding-top: 1rem;
          margin: 2rem 0;
        }
        /* In the sidebar it is a section, not a surface: no rule of its own,
           smaller heading, tighter rhythm. */
        .op.is-compact {
          border-top: 0;
          padding-top: 0;
          margin: 0;
        }
        .op.is-compact .op-title {
          font-size: 1.05rem;
          font-style: normal;
          font-family: inherit;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          font-size: 0.58rem;
          color: var(--color-text-muted, var(--color-text-secondary));
          margin-bottom: 0.6rem;
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
        .op-books {
          margin-top: 1.1rem;
        }
        .op-book-list {
          list-style: none;
          margin: 0;
          padding: 0;
          /* Long enough to scroll, short enough not to bury the play button
             under three dozen books in the sidebar. */
          max-height: 15rem;
          overflow-y: auto;
        }
        .op-book {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          width: 100%;
          min-height: 44px;
          padding: 0.5rem 0.15rem;
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text-primary, var(--color-fg));
          text-align: left;
          cursor: pointer;
        }
        .op-book:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 2px;
        }
        .op-book-name {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 1rem;
        }
        .op-book-time {
          font-size: 0.62rem;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
          font-variant-numeric: oldstyle-nums;
          white-space: nowrap;
        }
      `}</style>
    </section>
  )
}
