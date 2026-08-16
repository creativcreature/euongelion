'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface TransportSheetProps {
  /** Small caps label above the title. */
  eyebrow: string
  title: string
  onClose: () => void
  children: React.ReactNode
}

/**
 * The bottom sheet every transport control opens into.
 *
 * `NarrationChapters` established this shape — portal to body, focus trap,
 * Escape to close, scroll lock behind it, focus restored on unmount — and the
 * speed and sleep controls need exactly the same behaviour. Hand-copying a
 * focus trap into three files is how the three quietly stop agreeing, so the
 * shell lives here once and the sheets bring only their contents.
 *
 * Bottom-anchored at every width, per the founder's direction on the chapter
 * sheet: it should rise from the transport it belongs to, not arrive from the
 * side like app navigation.
 */
export default function TransportSheet({
  eyebrow,
  title,
  onClose,
  children,
}: TransportSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusTo = useRef<Element | null>(null)

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
    // Guarded: focus() is absent on nothing, but the element may not exist yet
    // in a runtime without layout (jsdom), and losing focus must never throw.
    panelRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.focus?.()

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      ;(restoreFocusTo.current as HTMLElement | null)?.focus?.()
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const titleId = `transport-sheet-${eyebrow.toLowerCase().replace(/\s+/g, '-')}`

  return createPortal(
    <div className="transport-sheet-root">
      <button
        type="button"
        className="transport-sheet-scrim"
        aria-label={`Close ${eyebrow.toLowerCase()}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="transport-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="transport-sheet-grip" aria-hidden="true" />
        <header className="transport-sheet-head">
          <div>
            <p className="transport-sheet-eyebrow">{eyebrow}</p>
            <h2 id={titleId} className="transport-sheet-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="transport-sheet-close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="transport-sheet-body">{children}</div>
      </div>

      <style jsx>{`
        .transport-sheet-root {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal, 400);
        }

        .transport-sheet-scrim {
          position: absolute;
          inset: 0;
          width: 100%;
          border: 0;
          background: color-mix(in srgb, var(--color-bg) 72%, transparent);
          backdrop-filter: blur(2px);
          animation: transport-scrim-in var(--motion-base, 200ms)
            var(--motion-ease, ease-out) both;
        }

        .transport-sheet {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          max-height: min(72vh, 40rem);
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
          border-top: 3px solid var(--color-gold);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          animation: transport-sheet-in var(--motion-slow, 400ms)
            var(--motion-ease, ease-out) both;
        }
        @media (min-width: 768px) {
          .transport-sheet {
            width: min(38rem, 100%);
            margin-inline: auto;
            max-height: min(68vh, 40rem);
            border-inline: 1px solid var(--color-border);
          }
        }

        @keyframes transport-scrim-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes transport-sheet-in {
          from {
            transform: translateY(100%);
          }
          to {
            transform: none;
          }
        }

        .transport-sheet-grip {
          width: 2.4rem;
          height: 3px;
          margin: 0.6rem auto 0;
          background: var(--color-border-strong, var(--color-border));
        }
        @media (min-width: 768px) {
          .transport-sheet-grip {
            display: none;
          }
        }

        .transport-sheet-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 1.25rem 0.75rem;
          border-bottom: 1px solid var(--color-border);
        }

        .transport-sheet-eyebrow {
          font-size: 0.52rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--color-gold);
          margin-bottom: 0.25rem;
        }

        .transport-sheet-title {
          font-family: var(--font-family-serif, Georgia, serif);
          font-style: italic;
          font-size: 1.15rem;
          line-height: 1.2;
          color: var(--color-text-primary, var(--color-fg));
        }

        .transport-sheet-close {
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

        .transport-sheet-body {
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 1rem 1.25rem 1.5rem;
        }

        @media (prefers-reduced-motion: reduce) {
          .transport-sheet,
          .transport-sheet-scrim {
            animation: none;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}
