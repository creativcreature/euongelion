'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useReader } from '@/components/reader/ReaderContext'
import { consumePendingIntent } from '@/lib/auth/pending-intent'
import { useDevotionalLibraryStore } from '@/stores/devotionalLibraryStore'

/**
 * Finishes what the reader reached for before signing in.
 *
 * SA-062 makes every writing control "locked, not hidden": the control stays
 * visible, activating it signed out opens sign-in, and the action completes
 * afterwards. This is the *afterwards*. Without it the promise is half kept —
 * a reader highlights a line, signs in, and lands on an unmarked page.
 *
 * Mounted inside the reader so it runs on the page the intent belongs to, and
 * fires only once auth is actually known — replaying against an unresolved
 * session would just fail the write again.
 */
export default function PendingIntentReplay() {
  const { signedIn, authKnown } = useReader()
  const pathname = usePathname()
  const save = useDevotionalLibraryStore((s) => s.save)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (!authKnown || !signedIn || !pathname) return

    const intent = consumePendingIntent(pathname)
    if (!intent) return

    void (async () => {
      switch (intent.kind) {
        case 'save': {
          const result = await save(intent.devotionalSlug)
          setDone(result.ok ? 'Saved to your library.' : null)
          return
        }
        case 'highlight': {
          // Re-create the mark from the anchor text the reader selected. It is
          // published devotional prose, so carrying it through the redirect is
          // safe in a way a journal entry would not be.
          const response = await fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              devotionalSlug: intent.devotionalSlug,
              annotationType: 'highlight',
              anchorText: intent.anchorText,
              body: intent.anchorText,
              style: {
                source: 'text-selection',
                kind: 'favorite_verse',
                color: intent.color,
              },
            }),
          })
          if (response.ok) {
            // The reader is already on the page; ask the highlight layer to
            // repaint rather than reloading it out from under them.
            window.dispatchEvent(new CustomEvent('libraryUpdated'))
            window.dispatchEvent(new CustomEvent('highlightsRehydrate'))
            setDone('Your highlight is saved.')
          }
          return
        }
        case 'journal': {
          // Deliberately does NOT carry what was written — Art. 9 data does not
          // cross the front channel. Reopening the field is the whole replay.
          setDone('You can write now — your words will be kept.')
          return
        }
        default:
          return
      }
    })()
  }, [authKnown, signedIn, pathname, save])

  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(() => setDone(null), 6000)
    return () => window.clearTimeout(id)
  }, [done])

  if (!done) return null

  return (
    <div className="pending-replay" role="status" aria-live="polite">
      {done}
      <style jsx>{`
        .pending-replay {
          position: fixed;
          left: 50%;
          bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
          transform: translateX(-50%);
          z-index: var(--z-toast, 300);
          max-width: min(28rem, calc(100vw - 2rem));
          padding: 0.7rem 1.1rem;
          background: var(--color-text-primary, var(--color-fg));
          color: var(--color-bg);
          font-size: 0.82rem;
          line-height: 1.4;
          text-align: center;
          animation: pending-replay-in var(--motion-base, 200ms)
            var(--motion-ease, ease-out) both;
        }
        @keyframes pending-replay-in {
          from {
            opacity: 0;
            transform: translate(-50%, 8px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pending-replay {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
