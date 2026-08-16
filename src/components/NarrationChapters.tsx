'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatTime, type NarrationChapter } from '@/lib/audio/tracks'

export interface NarrationChaptersProps {
  title: string
  chapters: NarrationChapter[]
  currentTime: number
  /** Moves the audio AND the page to that section. */
  onSeek: (seconds: number, module: number) => void
  onClose: () => void
}

/**
 * Chapter sheet — the precise way into a long reading.
 *
 * Why a sheet and not a visible list: the founder had the section scrubber
 * removed from the Audio Edition panel (SA-034) because printing every section
 * above the article read as a table of contents and spoiled the headings
 * before the first line. That objection is to a list you cannot avoid seeing.
 * A sheet is opened deliberately, so the page still opens as an editorial and
 * the index exists for the moment you actually want it.
 *
 * Rows are the devotional's own headings wherever it has them, at timestamps
 * measured from the render rather than estimated — see `build_chapters.py`.
 */
export default function NarrationChapters({
  title,
  chapters,
  currentTime,
  onSeek,
  onClose,
}: NarrationChaptersProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const currentRef = useRef<HTMLButtonElement | null>(null)
  const restoreFocusTo = useRef<Element | null>(null)

  // Trap focus, close on Escape, and lock the page behind the sheet.
  useEffect(() => {
    restoreFocusTo.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    // Open on the chapter being read, not at the top — in a 20-minute reading
    // the useful row is rarely the first one. Guarded because scrollIntoView
    // is absent in some runtimes (jsdom among them) and losing the scroll
    // must never cost the focus move.
    currentRef.current?.scrollIntoView?.({ block: 'center' })
    currentRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      ;(restoreFocusTo.current as HTMLElement | null)?.focus?.()
    }
  }, [onClose])

  let activeIndex = -1
  chapters.forEach((chapter, i) => {
    if (chapter.t <= currentTime + 0.001) activeIndex = i
  })

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="narration-sheet-root">
      <button
        type="button"
        className="narration-sheet-scrim"
        aria-label="Close chapters"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="narration-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="narration-sheet-title"
      >
        <div className="narration-sheet-grip" aria-hidden="true" />
        <header className="narration-sheet-head">
          <div>
            <p className="narration-sheet-eyebrow">Chapters</p>
            <h2 id="narration-sheet-title" className="narration-sheet-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="narration-sheet-close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <ol className="narration-sheet-list">
          {chapters.map((chapter, i) => {
            const isCurrent = i === activeIndex
            return (
              <li key={`${chapter.t}-${chapter.module}`}>
                <button
                  type="button"
                  ref={isCurrent ? currentRef : undefined}
                  className={`narration-sheet-row${isCurrent ? ' is-current' : ''}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => {
                    onSeek(chapter.t, chapter.module)
                    onClose()
                  }}
                >
                  <span className="narration-sheet-time oldstyle-nums">
                    {formatTime(chapter.t)}
                  </span>
                  <span className="narration-sheet-label">{chapter.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <style jsx>{`
        .narration-sheet-root {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal, 400);
        }

        .narration-sheet-scrim {
          position: absolute;
          inset: 0;
          width: 100%;
          border: 0;
          background: color-mix(in srgb, var(--color-bg) 72%, transparent);
          backdrop-filter: blur(2px);
          animation: narration-scrim-in var(--motion-base, 200ms)
            var(--motion-ease, ease-out) both;
        }

        .narration-sheet {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          max-height: min(72vh, 40rem);
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
          border-top: 3px solid var(--color-gold);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          animation: narration-sheet-in var(--motion-slow, 400ms)
            var(--motion-ease, ease-out) both;
        }
        /* Bottom-anchored at every width. A right-hand drawer was the reflex
           on desktop, but the ask was a pull-up: the sheet should rise from
           the transport it belongs to, not arrive from the side like app
           navigation. */
        @media (min-width: 768px) {
          .narration-sheet {
            inset-inline: 0;
            width: min(38rem, 100%);
            margin-inline: auto;
            max-height: min(68vh, 40rem);
            border-inline: 1px solid var(--color-border);
          }
        }

        @keyframes narration-scrim-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes narration-sheet-in {
          from {
            transform: translateY(100%);
          }
          to {
            transform: none;
          }
        }

        .narration-sheet-grip {
          width: 2.4rem;
          height: 3px;
          margin: 0.6rem auto 0;
          background: var(--color-border-strong, var(--color-border));
        }
        @media (min-width: 768px) {
          .narration-sheet-grip {
            display: none;
          }
        }

        .narration-sheet-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 1.25rem 0.75rem;
          border-bottom: 1px solid var(--color-border);
        }

        .narration-sheet-eyebrow {
          font-size: 0.52rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-gold);
          margin-bottom: 0.25rem;
        }

        .narration-sheet-title {
          font-family: var(--font-family-serif, Georgia, serif);
          font-style: italic;
          font-size: 1.15rem;
          line-height: 1.2;
          color: var(--color-text-primary, var(--color-fg));
        }

        .narration-sheet-close {
          flex-shrink: 0;
          min-height: 44px;
          padding-inline: 0.5rem;
          background: transparent;
          border: 0;
          font-size: 0.6rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(
            --color-text-secondary,
            var(--color-text-primary, var(--color-fg))
          );
        }

        .narration-sheet-list {
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .narration-sheet-row {
          display: flex;
          align-items: baseline;
          gap: 0.85rem;
          width: 100%;
          min-height: 44px;
          padding: 0.7rem 1.25rem;
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--color-border);
          text-align: left;
          /* The current chapter is marked by a rule in the gutter — the same
             cobalt line the transport uses, so "where you are" reads the same
             way everywhere. */
          box-shadow: inset 3px 0 0 transparent;
        }
        .narration-sheet-row:hover {
          background: var(--color-surface, transparent);
        }
        .narration-sheet-row.is-current {
          box-shadow: inset 3px 0 0 var(--color-gold);
        }
        .narration-sheet-row:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: -2px;
        }

        .narration-sheet-time {
          flex-shrink: 0;
          min-width: 3.2rem;
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          color: var(--color-text-muted, var(--color-text-secondary));
          font-variant-numeric: oldstyle-nums;
        }
        .narration-sheet-row.is-current .narration-sheet-time {
          color: var(--color-gold);
        }

        .narration-sheet-label {
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 0.98rem;
          line-height: 1.3;
          color: var(--color-text-primary, var(--color-fg));
        }

        @media (prefers-reduced-motion: reduce) {
          .narration-sheet,
          .narration-sheet-scrim {
            animation: none;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}
