'use client'

import TransportSheet from '@/components/audio/TransportSheet'
import { formatTime } from '@/lib/audio/tracks'

export const SLEEP_MINUTES = [5, 10, 15, 30] as const
export type SleepMinutes = (typeof SLEEP_MINUTES)[number]

/**
 * What the timer is set to. `end-of-chapter` is not a duration — it resolves
 * against the track's own boundaries — so the mode is a union rather than a
 * number with a magic sentinel.
 */
export type SleepMode = SleepMinutes | 'end-of-chapter'
export type SleepSelection = SleepMode | 'off'

export interface SleepTimerProps {
  active: SleepMode | null
  /** Milliseconds left, for the countdown. Null for end-of-chapter. */
  remainingMs: number | null
  onSelect: (selection: SleepSelection) => void
  onClose: () => void
}

export default function SleepTimer({
  active,
  remainingMs,
  onSelect,
  onClose,
}: SleepTimerProps) {
  return (
    <TransportSheet
      eyebrow="Sleep"
      title="Stop playing after"
      onClose={onClose}
    >
      {/* aria-live so a reader who opens the sheet mid-countdown is told what
          is left rather than having to see it. */}
      <p className="sleep-status" role="status" aria-live="polite">
        {active === 'end-of-chapter'
          ? 'Playing to the end of this chapter.'
          : active !== null && remainingMs !== null
            ? `${formatTime(remainingMs / 1000)} left.`
            : 'No timer set.'}
      </p>

      <div className="sleep-group" role="group" aria-label="Sleep timer">
        {SLEEP_MINUTES.map((minutes) => {
          const isCurrent = active === minutes
          return (
            <button
              key={minutes}
              type="button"
              className={`sleep-chip${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => {
                onSelect(minutes)
                onClose()
              }}
            >
              {minutes} minutes
            </button>
          )
        })}

        <button
          type="button"
          className={`sleep-chip${active === 'end-of-chapter' ? ' is-current' : ''}`}
          aria-current={active === 'end-of-chapter' ? 'true' : undefined}
          onClick={() => {
            onSelect('end-of-chapter')
            onClose()
          }}
        >
          End of chapter
        </button>

        {/* Only offered when there is something to turn off — an Off button
            beside "No timer set" is a control that does nothing. */}
        {active !== null && (
          <button
            type="button"
            className="sleep-chip"
            onClick={() => {
              onSelect('off')
              onClose()
            }}
          >
            Off
          </button>
        )}
      </div>

      <p className="sleep-note">
        The reading fades out rather than stopping mid-sentence.
      </p>

      <style jsx>{`
        .sleep-status {
          margin-bottom: 1rem;
          font-size: 0.82rem;
          font-variant-numeric: oldstyle-nums;
          color: var(
            --color-text-secondary,
            var(--color-text-primary, var(--color-fg))
          );
        }

        .sleep-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .sleep-chip {
          min-height: 44px;
          min-width: 44px;
          padding-inline: 0.9rem;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary, var(--color-fg));
          font-size: 0.82rem;
          font-variant-numeric: oldstyle-nums;
          line-height: 1;
        }
        .sleep-chip:hover {
          border-color: var(
            --color-text-secondary,
            var(--color-text-primary, var(--color-fg))
          );
        }
        /* Ground and border, never colour alone — see SA-047. */
        .sleep-chip.is-current {
          border-color: var(--color-text-primary, var(--color-fg));
          background: var(--color-text-primary, var(--color-fg));
          color: var(--color-bg);
        }
        .sleep-chip:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 2px;
        }

        .sleep-note {
          margin-top: 1.25rem;
          font-size: 0.72rem;
          line-height: 1.5;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
      `}</style>
    </TransportSheet>
  )
}
