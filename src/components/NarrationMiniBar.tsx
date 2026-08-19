'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatTime } from '@/lib/audio/tracks'
import { PauseIcon, PlayIcon } from '@/components/audio/TransportIcons'

export interface NarrationMiniBarProps {
  title: string
  playing: boolean
  current: number
  duration: number
  onToggle: () => void
  onSkip: (delta: number) => void
  onSeek: (seconds: number) => void
  /** Scrolls the reader back to the full Audio Edition panel. */
  onReturnToPanel: () => void
  skipSeconds: number
  /** The section being read, shown in place of a generic "Listening" label. */
  chapterLabel?: string | null
  /** Opens the chapter sheet. Absent on tracks with no chapters. */
  onOpenChapters?: () => void
}

/**
 * The reading rule — narration transport that follows the reader down the page.
 *
 * Two constraints shaped this and they pull against each other. The founder
 * listens while working, so control has to stay reachable after the Audio
 * Edition panel scrolls away. But the founder also had the section scrubber
 * removed from that panel (2026-07-28) because listing sections "read as a
 * table of contents" and made the page open like app chrome instead of an
 * editorial. A persistent media widget is precisely the thing that could undo
 * that.
 *
 * So it is built as a bookmark ribbon, not a player:
 *
 * - The bar has no top border. Its top edge IS the progress line — a cobalt
 *   rule filling left to right across the full viewport, which reads as a
 *   place-marker in a book. It doubles as the seek control, the rare case
 *   where the quietest element is also the largest target.
 * - Content sits on the reader's grid rather than the viewport: the play
 *   control lands on the same vertical as the "AUDIO EDITION" label in the
 *   panel it replaces. That one alignment is what keeps it reading as page
 *   furniture instead of a browser strip. Near-alignment would be worse than
 *   none, so the padding reproduces the shell's container chain rather than
 *   approximating it.
 * - It never appears unprompted: only after the reader presses play AND
 *   scrolls the panel away, retiring the moment the panel returns.
 */
export default function NarrationMiniBar({
  title,
  playing,
  current,
  duration,
  onToggle,
  onSkip,
  onSeek,
  onReturnToPanel,
  skipSeconds,
  chapterLabel,
  onOpenChapters,
}: NarrationMiniBarProps) {
  // Flag the document while the bar is up so the floating reader-theme button
  // and chat button can lift clear of it (see globals.css). Without this they
  // sit on top of the bar in both bottom corners.
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-narration-bar', 'true')
    return () => root.removeAttribute('data-narration-bar')
  }, [])

  // No mounted-flag dance: the parent renders this only after a play event and
  // an IntersectionObserver callback, so it cannot reach server rendering or
  // first hydration. The guard is belt-and-braces for a non-DOM runtime.
  if (typeof document === 'undefined') return null

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0
  const remaining = Math.max(0, duration - current)

  return createPortal(
    <aside className="narration-mini" aria-label="Audio edition, minimized">
      {/* The reading rule. `--pct` must live on the label: the fill span is a
          SIBLING of the input, so a variable set on the input would not reach
          it and the line would render flat at 0%. */}
      <label
        className="narration-mini-rule"
        style={{ ['--pct' as string]: `${pct}%` }}
      >
        <span className="sr-only">Seek within the reading</span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={current}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
        />
        <span className="narration-mini-rule-fill" aria-hidden="true" />
      </label>

      <div className="narration-mini-body">
        <button
          type="button"
          className="narration-mini-play"
          onClick={onToggle}
          aria-label={playing ? 'Pause the reading' : 'Resume the reading'}
        >
          {/* The shared glyphs, so the bar and the panel cannot drift into
              drawing the same control two different ways. Only play/pause is
              unified: the ±15 controls stay set as TYPE here, deliberately —
              a circular arrow at this size reads as a smudge, and Industry is
              the brand's own voice for meta. */}
          {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
        </button>

        {/* The title block is the chapter affordance where chapters exist:
            mid-listen, "take me to a section" beats "take me back to the
            panel", and it gives the sheet a target far larger than an icon.
            Without chapters it keeps its original job. */}
        <button
          type="button"
          className="narration-mini-title"
          onClick={onOpenChapters ?? onReturnToPanel}
          aria-haspopup={onOpenChapters ? 'dialog' : undefined}
          aria-label={
            onOpenChapters
              ? `Chapters${chapterLabel ? ` — currently ${chapterLabel}` : ''}`
              : `Back to the audio edition for ${title}`
          }
        >
          <span className="narration-mini-eyebrow">
            {chapterLabel ? 'Chapters' : 'Listening'}
          </span>
          <span className="narration-mini-name">{chapterLabel ?? title}</span>
        </button>

        {/* One primary action on the left edge of the measure; everything
            secondary groups right. Set as type rather than glyphs — a circular
            arrow at this size reads as a smudge, and the Industry face is the
            brand's own voice for meta.

            BOTH directions on every breakpoint. Forward used to be
            desktop-only on the theory that "say that again" is the recurring
            need while working — true, but it left the phone with a single
            lone skip control, which reads as an omission rather than a
            choice. They fit at 375px once the time readout steps aside. */}
        <span className="narration-mini-cluster">
          <button
            type="button"
            className="narration-mini-skip"
            onClick={() => onSkip(-skipSeconds)}
            aria-label={`Back ${skipSeconds} seconds`}
          >
            −{skipSeconds}s
          </button>
          <button
            type="button"
            className="narration-mini-skip"
            onClick={() => onSkip(skipSeconds)}
            aria-label={`Forward ${skipSeconds} seconds`}
          >
            +{skipSeconds}s
          </button>
          <span
            className="narration-mini-time oldstyle-nums"
            aria-hidden="true"
          >
            {formatTime(remaining)} left
          </span>
        </span>
      </div>

      <style jsx>{`
        .narration-mini {
          position: fixed;
          inset-inline: 0;
          bottom: 0;
          z-index: var(--z-sticky, 100);
          background: var(--color-bg);
          animation: narration-mini-in var(--motion-base, 200ms)
            var(--motion-ease, ease-out) both;
        }

        /* Stack above the mobile tab bar rather than compete with it.
           Derived from the tab bar's own box (0.34rem padding top and bottom
           around a 44px row) rather than from the body's bottom padding, which
           carries slack — using that left a 6px sliver of scrolling text
           showing between the two bars. */
        @media (max-width: 767px) {
          .narration-mini {
            bottom: calc(0.68rem + 44px + env(safe-area-inset-bottom, 0px));
          }
        }

        @keyframes narration-mini-in {
          from {
            transform: translateY(100%);
          }
          to {
            transform: none;
          }
        }

        /* The bar has no border-top; this rule is its top edge. */
        .narration-mini-rule {
          display: block;
          position: relative;
          height: 20px;
          margin-bottom: -10px;
        }

        .narration-mini-rule input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }

        /* Drawn separately from the input so the hit area can be far taller
           than the 3px line the reader actually sees. */
        .narration-mini-rule-fill {
          position: absolute;
          top: 0;
          inset-inline: 0;
          height: 3px;
          background: linear-gradient(
            to right,
            var(--color-gold) 0 var(--pct, 0%),
            var(--color-border-strong, var(--color-border)) var(--pct, 0%) 100%
          );
          pointer-events: none;
        }

        .narration-mini-rule input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 3px;
          height: 13px;
          background: var(--color-gold);
          opacity: 0;
          transition: opacity var(--motion-fast, 150ms)
            var(--motion-ease, ease-out);
        }
        .narration-mini-rule input::-moz-range-thumb {
          width: 3px;
          height: 13px;
          border: 0;
          border-radius: 0;
          background: var(--color-gold);
          opacity: 0;
        }
        .narration-mini-rule:hover input::-webkit-slider-thumb,
        .narration-mini-rule input:focus-visible::-webkit-slider-thumb {
          opacity: 1;
        }
        .narration-mini-rule:hover input::-moz-range-thumb {
          opacity: 1;
        }
        .narration-mini-rule input:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -3px;
        }

        /* Sit on the reader's own grid, not the viewport.

           The bar is the Audio Edition panel minimized, so it aligns to that
           panel's CONTENT edge — where the "AUDIO EDITION" label starts, not
           where its border sits. That edge is the shell container (72rem,
           mx-auto) plus the shell's padding and the panel's own, which is the
           3.35rem below.

           Everything here must stay in rem, not px: the reader has a text-size
           control, so the root font-size is not 16px and the shell's own 72rem
           scales with it. A px value would drift out of alignment the moment a
           reader changes text size.

           The extra right padding on wide screens clears the floating chat
           button, which would otherwise sit 1px inside the time readout. */
        .narration-mini-body {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 72rem;
          margin-inline: auto;
          padding: 0.55rem 3.35rem
            calc(0.55rem + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 768px) {
          .narration-mini-body {
            padding-right: 5.5rem;
          }
        }
        @media (max-width: 767px) {
          .narration-mini-body {
            gap: 0.4rem;
            padding-inline: 1rem;
            padding-bottom: 0.55rem;
          }
        }

        .narration-mini-play,
        .narration-mini-skip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.18rem;
          min-width: 44px;
          min-height: 44px;
          background: transparent;
          border: 0;
          color: var(--color-gold);
          flex-shrink: 0;
        }

        /* Square, because the shared glyphs use a square viewBox — the old
           13×15 was sized for a hand-rolled 12×14 drawing and would stretch
           these non-uniformly. */
        .narration-mini-play svg {
          width: 15px;
          height: 15px;
        }

        .narration-mini-cluster {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
        }

        .narration-mini-skip {
          font-size: 0.62rem;
          letter-spacing: 0.09em;
          color: var(--color-text-secondary, var(--color-text));
          font-variant-numeric: oldstyle-nums;
          padding-inline: 0.3rem;
        }
        .narration-mini-skip:hover {
          color: var(--color-gold);
        }
        .narration-mini-play:focus-visible,
        .narration-mini-skip:focus-visible,
        .narration-mini-title:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }

        .narration-mini-title {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.12rem;
          padding: 0 0.25rem;
          background: transparent;
          border: 0;
          text-align: left;
          min-height: 44px;
          justify-content: center;
        }

        .narration-mini-eyebrow {
          font-size: 0.5rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
          line-height: 1;
        }

        /* Serif italic: the devotional's own voice, not a media label. */
        .narration-mini-name {
          font-family: var(--font-family-serif, Georgia, serif);
          font-style: italic;
          font-size: 1rem;
          line-height: 1.15;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .narration-mini-time {
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted, var(--color-text-secondary));
          flex-shrink: 0;
          font-variant-numeric: oldstyle-nums;
          white-space: nowrap;
        }
        /* Controls outrank the readout: below this the time steps aside so
           both skips keep their 44px targets rather than being squeezed. */
        @media (max-width: 560px) {
          .narration-mini-time {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .narration-mini {
            animation: none;
          }
          .narration-mini-rule input::-webkit-slider-thumb {
            transition: none;
          }
        }
      `}</style>
    </aside>,
    document.body,
  )
}
