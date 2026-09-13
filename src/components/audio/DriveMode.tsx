'use client'

import { useEffect } from 'react'
import SectionRule from '@/components/audio/SectionRule'
import { formatTime, type NarrationChapter } from '@/lib/audio/tracks'

/**
 * Drive mode.
 *
 * Founder: the player is "hard to navigate on mobile — especially when I am
 * driving". Then, on the first attempt: "I need to be beable to switch chapters
 * etc in drive mode." Stepping one section at a time is not switching, so the
 * whole section list is here as rows, at a size that can be hit without aiming.
 *
 * The rule sits at the top because sliding beats scrolling while the car is
 * moving; the list is for when it is stopped. Nothing is under 68px, and play
 * is 132px full-bleed.
 *
 * This exists at all because Media Session cannot give a web app a browsable
 * list in the car — CarPlay and Android Auto will show artwork, metadata, a
 * seek bar and five buttons, and nothing more, without a native shell. So the
 * ten-section list has to live on the phone.
 */
export interface DriveModeProps {
  title: string
  context: string
  chapters: NarrationChapter[]
  currentTime: number
  duration: number
  playing: boolean
  onSeek: (seconds: number) => void
  onTogglePlay: () => void
  onExit: () => void
}

function indexAt(chapters: NarrationChapter[], seconds: number): number {
  let index = 0
  for (let i = 0; i < chapters.length; i += 1) {
    if (chapters[i].t <= seconds + 0.001) index = i
    else break
  }
  return index
}

export default function DriveMode({
  title,
  context,
  chapters,
  currentTime,
  duration,
  playing,
  onSeek,
  onTogglePlay,
  onExit,
}: DriveModeProps) {
  // A driver cannot fight an accidental modal. Escape and the hardware back
  // button both leave.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onExit])

  // Keep the screen awake — a screen that locks mid-drive means fumbling to
  // unlock at exactly the wrong moment. Released on exit, and absent on iOS
  // Safari before 16.4, where the promise rejects and nothing else should break.
  useEffect(() => {
    let sentinel: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (kind: 'screen') => Promise<{ release: () => Promise<void> }>
      }
    }
    void nav.wakeLock
      ?.request('screen')
      .then((granted) => {
        sentinel = granted
      })
      .catch(() => {})
    return () => {
      void sentinel?.release().catch(() => {})
    }
  }, [])

  const index = indexAt(chapters, currentTime)

  return (
    <div
      className="lsn-drive"
      role="dialog"
      aria-modal="true"
      aria-label="Drive mode"
    >
      <p className="lsn-drive-eyebrow">{context || title}</p>

      <div className="lsn-drive-rule">
        <SectionRule
          chapters={chapters}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          tall
        />
      </div>

      <div className="lsn-drive-list">
        {chapters.map((chapter, i) => (
          <button
            key={`${chapter.t}-${i}`}
            type="button"
            className={`lsn-drive-row${i === index ? ' is-now' : ''}`}
            aria-label={`Section ${i + 1}, ${chapter.label}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => onSeek(chapter.t)}
          >
            <span className="lsn-drive-label">{chapter.label}</span>
            <span className="lsn-drive-t oldstyle-nums">
              {formatTime(chapter.t)}
            </span>
          </button>
        ))}
      </div>

      <div className="lsn-drive-transport">
        <button
          type="button"
          className="lsn-drive-side"
          aria-label="Back 15 seconds"
          onClick={() => onSeek(Math.max(0, currentTime - 15))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
          </svg>
        </button>
        <button
          type="button"
          className="lsn-drive-play"
          aria-label={playing ? 'Pause the reading' : 'Resume the reading'}
          onClick={onTogglePlay}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {playing ? (
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>
        <button
          type="button"
          className="lsn-drive-side"
          aria-label="Forward 15 seconds"
          onClick={() => onSeek(Math.min(duration, currentTime + 15))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5V2l5 4-5 4V7a5 5 0 1 0 5 5h2a7 7 0 1 1-7-7z" />
          </svg>
        </button>
      </div>

      <button type="button" className="lsn-drive-exit" onClick={onExit}>
        Exit drive mode
      </button>

      <style jsx>{`
        .lsn-drive {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal, 400);
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .lsn-drive-eyebrow {
          padding: 0.9rem 1.2rem 0;
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-gold);
        }
        .lsn-drive-rule {
          padding: 0 1.1rem 0.6rem;
        }
        .lsn-drive-list {
          flex: 1 1 auto;
          overflow-y: auto;
          overscroll-behavior: contain;
          border-top: 1.5px solid var(--color-border);
        }
        /* Nothing under 68px: this is the one surface where a missed tap has a
           cost outside the app. */
        .lsn-drive-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.9rem;
          width: 100%;
          min-height: 68px;
          padding: 0 1.2rem;
          background: transparent;
          border: 0;
          border-bottom: 1.5px solid var(--color-border);
          box-shadow: inset 3px 0 0 transparent;
          text-align: left;
          color: var(--color-text-secondary, var(--color-fg));
          cursor: pointer;
        }
        .lsn-drive-row.is-now {
          box-shadow: inset 3px 0 0 var(--color-gold);
          color: var(--color-text-primary, var(--color-fg));
        }
        .lsn-drive-label {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: var(--ts-md);
          line-height: 1.2;
        }
        .lsn-drive-t {
          flex: none;
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          color: var(--color-text-muted, var(--color-text-secondary));
        }
        .lsn-drive-transport {
          display: flex;
          align-items: stretch;
          gap: 0.5rem;
          padding: 0.8rem 1.2rem 0;
        }
        .lsn-drive-side {
          display: grid;
          place-items: center;
          flex: none;
          width: 96px;
          height: 96px;
          background: transparent;
          border: 1.5px solid var(--color-border);
          color: var(--color-text-primary, var(--color-fg));
          cursor: pointer;
        }
        .lsn-drive-side svg {
          width: 38px;
          height: 38px;
          fill: currentColor;
        }
        .lsn-drive-play {
          display: grid;
          place-items: center;
          flex: 1 1 auto;
          height: 132px;
          background: var(--color-gold);
          border: 0;
          /* --color-gold is cobalt in light and amber in dark, so the glyph is
             whatever the page's ground is rather than a literal. */
          color: var(--color-bg);
          cursor: pointer;
        }
        .lsn-drive-play svg {
          width: 56px;
          height: 56px;
          fill: currentColor;
        }
        .lsn-drive-exit {
          width: 100%;
          min-height: 76px;
          margin-top: 0.8rem;
          background: transparent;
          border: 0;
          border-top: 1.5px solid var(--color-border);
          font-family: var(--font-family-ui);
          font-size: var(--ts-sm);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-text-secondary, var(--color-fg));
          cursor: pointer;
        }
        .lsn-drive-row:focus-visible,
        .lsn-drive-side:focus-visible,
        .lsn-drive-play:focus-visible,
        .lsn-drive-exit:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -3px;
        }
        /* Landscape in a mount is the common case, and a vertical stack there
           leaves the transport off-screen. */
        @media (min-width: 40rem) and (orientation: landscape) {
          .lsn-drive-list {
            columns: 2;
            column-gap: 0;
          }
        }
      `}</style>
    </div>
  )
}
