'use client'

/**
 * CrisisInterstitial
 *
 * Full-viewport newsprint interstitial shown when the client-side crisis
 * gate fires. Rendered BEFORE any network transmission — the reflection
 * text has not left the device at this point.
 *
 * Design intent: calm, dignified, not alarming. Editorial voice. Masthead
 * adjacency. Duotone brand palette on cream paper.
 *
 * Accessibility:
 * - role="dialog" with aria-modal + aria-labelledby
 * - Focus trap: Tab cycles only within the dialog
 * - ESC key closes (calls onContinue — user stays in control)
 * - aria-live="polite" on resource list
 * - Reduced-motion: animations disabled via prefers-reduced-motion
 */

import { useCallback, useEffect, useRef } from 'react'
import type { CrisisResource } from '@/lib/soul-audit/crisis-gate'

interface CrisisInterstitialProps {
  resources: CrisisResource[]
  /** Called when the user chooses to continue to their reading anyway. */
  onContinue: () => void
}

/** All focusable element selectors within the dialog. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function CrisisInterstitial({
  resources,
  onContinue,
}: CrisisInterstitialProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLAnchorElement>(null)
  const headingId = 'crisis-interstitial-heading'

  // Focus the primary action on mount
  useEffect(() => {
    firstFocusRef.current?.focus()
  }, [])

  // Focus trap — Tab and Shift+Tab stay within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onContinue()
        return
      }
      if (e.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.closest('[aria-hidden="true"]'))

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onContinue],
  )

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(17, 24, 42, 0.72)',
        /* Reduced-motion: skip backdrop fade */
        animation: 'crisisBackdropIn 280ms ease-out both',
      }}
      aria-hidden="false"
    >
      <style>{`
        @keyframes crisisBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes crisisPanelIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .crisis-panel { animation: none !important; }
        }
      `}</style>

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
        className="crisis-panel mx-4 w-full max-w-lg"
        style={{
          background: 'var(--mock-paper, #f7f3ed)',
          color: 'var(--mock-ink, #11182a)',
          borderTop: '3px solid var(--color-crimson, #c4192e)',
          animation: 'crisisPanelIn 320ms ease-out both',
          animationDelay: '40ms',
        }}
      >
        {/* Masthead rule */}
        <div
          style={{
            borderBottom: '1.5px solid var(--mock-line, currentColor)',
            padding: '1.25rem 1.75rem 0.875rem',
          }}
        >
          <p
            className="text-label vw-small"
            style={{
              color: 'var(--color-crimson, #c4192e)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Before you continue
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 1.75rem' }}>
          {/* Headline */}
          <h2
            id={headingId}
            className="vw-heading-md"
            style={{ marginBottom: '0.625rem' }}
          >
            You are not alone.
          </h2>

          {/* Calm, pastoral copy */}
          <p className="vw-body" style={{ marginBottom: '1.5rem' }}>
            What you wrote touched on something heavy. That takes courage to
            name. If any part of you is in pain right now, there are people
            ready to hear you — right now, free, no judgment.
          </p>

          {/* Resource list */}
          <ul
            aria-live="polite"
            aria-label="Crisis support resources"
            style={{
              listStyle: 'none',
              margin: '0 0 1.5rem',
              padding: 0,
              borderTop: '1px solid var(--mock-line, currentColor)',
            }}
          >
            {resources.map((resource) => (
              <li
                key={resource.name}
                style={{
                  padding: '0.875rem 0',
                  borderBottom: '1px solid var(--mock-line, currentColor)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  className="text-label vw-small"
                  style={{ fontWeight: 600 }}
                >
                  {resource.name}
                </span>
                <a
                  href={resource.href}
                  ref={resource === resources[0] ? firstFocusRef : undefined}
                  className="link-highlight vw-small"
                  rel="noreferrer"
                  style={{ fontWeight: 500 }}
                  target={
                    resource.href.startsWith('http') ? '_blank' : undefined
                  }
                >
                  {resource.contact}
                </a>
              </li>
            ))}
          </ul>

          {/* Primary action — 988 */}
          <a
            href="tel:988"
            className="cta-major text-label vw-small"
            style={{
              display: 'flex',
              width: '100%',
              padding: '1rem 1.5rem',
              justifyContent: 'center',
              marginBottom: '0.875rem',
              // Pinned, not tokenised: --color-crimson lightens to #e25868 in
              // dark, which puts this white label at 3.60:1 — under the 4.5:1
              // small-text minimum. #c4192e holds ~5.6:1 in every theme.
              background: '#c4192e',
              borderColor: '#c4192e',
              color: '#fff',
            }}
          >
            Call or text 988 now
          </a>

          {/* Georgia outreach. Added below the 988 CTA, never above it:
              a person in acute crisis should reach a human before they reach
              a directory. Purely additive to the existing gate behaviour. */}
          <a
            href="/seeking-help-georgia"
            className="vw-small"
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem',
              textAlign: 'center',
              color: 'var(--mock-ink, #11182a)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              marginBottom: '0.25rem',
            }}
          >
            In Georgia? See shelter, food, and other help
          </a>

          {/* Secondary — quiet continue path */}
          <button
            type="button"
            onClick={onContinue}
            className="vw-small"
            style={{
              display: 'block',
              width: '100%',
              padding: '0.625rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'center',
              color: 'var(--color-text-muted, inherit)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Continue to a reading anyway
          </button>
        </div>
      </div>
    </div>
  )
}
