'use client'

import TransportSheet from '@/components/audio/TransportSheet'

/**
 * Playback speeds, chosen rather than cycled.
 *
 * The old control stepped 0.8 → 1 → 1.25 → 1.5 and wrapped, so 2× did not
 * exist and any value cost up to four taps. Eight discrete choices, one tap
 * each. 3× is the top because past that the narration stops being listenable
 * rather than merely fast.
 */
export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const
export type Speed = (typeof SPEEDS)[number]

/**
 * 15s is the default, NOT Audible's 30s: this prose is dense and a good number
 * of readings run under five minutes, where 30s overshoots the thing you were
 * trying to hear again. 30 is one tap away for anyone who disagrees.
 */
export const SKIP_CHOICES = [15, 30] as const
export type SkipSeconds = (typeof SKIP_CHOICES)[number]

export interface SpeedSheetProps {
  speed: number
  skipSeconds: SkipSeconds
  onSelectSpeed: (speed: Speed) => void
  onSelectSkip: (seconds: SkipSeconds) => void
  onClose: () => void
}

export default function SpeedSheet({
  speed,
  skipSeconds,
  onSelectSpeed,
  onSelectSkip,
  onClose,
}: SpeedSheetProps) {
  return (
    <TransportSheet eyebrow="Playback" title="Speed" onClose={onClose}>
      <div className="speed-group" role="group" aria-label="Playback speed">
        {SPEEDS.map((option) => {
          const isCurrent = option === speed
          return (
            <button
              key={option}
              type="button"
              className={`speed-chip${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => {
                onSelectSpeed(option)
                onClose()
              }}
            >
              {option}&times;
            </button>
          )
        })}
      </div>

      <p className="speed-label">Skip by</p>
      <div className="speed-group" role="group" aria-label="Skip interval">
        {SKIP_CHOICES.map((option) => {
          const isCurrent = option === skipSeconds
          return (
            <button
              key={option}
              type="button"
              className={`speed-chip${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => onSelectSkip(option)}
            >
              {option} seconds
            </button>
          )
        })}
      </div>

      <style jsx>{`
        .speed-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .speed-label {
          margin: 1.5rem 0 0.6rem;
          font-size: 0.52rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
        }

        .speed-chip {
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
        .speed-chip:hover {
          border-color: var(
            --color-text-secondary,
            var(--color-text-primary, var(--color-fg))
          );
        }
        /* The active chip is marked by a filled ground AND its border, never by
           colour alone — SA-047's rule, since --color-gold is cobalt in light
           mode and a colour-only cue disappears in one theme or the other. */
        .speed-chip.is-current {
          border-color: var(--color-text-primary, var(--color-fg));
          background: var(--color-text-primary, var(--color-fg));
          color: var(--color-bg);
        }
        .speed-chip:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 2px;
        }
      `}</style>
    </TransportSheet>
  )
}
