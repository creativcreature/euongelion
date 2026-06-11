'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * PushOptIn — a gentle, post-read opt-in for ONE calm daily nudge (Phase 2.2).
 *
 * Design intent:
 *  - Surfaced AFTER a user finishes a reading, never on page load. The reader
 *    decides WHEN by passing `show` (or by leaving the `localStorage` signal
 *    described below). No nag, no streaks, no badges.
 *  - HONEST about configuration: if NEXT_PUBLIC_VAPID_PUBLIC_KEY is unset, or
 *    the browser can't do push, the component renders NOTHING (it does not
 *    pretend to subscribe). If the user has previously denied notification
 *    permission, it does not re-prompt.
 *  - Calm brand copy, Instrument Serif, Federal Ultramarine + Deep Crimson on
 *    cream. Touch targets >= 44px. Honors prefers-reduced-motion.
 *
 * HOW TO MOUNT (reader owns the trigger; this component owns the rest):
 *  Drop it into the reader's completion area, e.g.:
 *    import PushOptIn from '@/components/PushOptIn'
 *    <PushOptIn show={hasFinishedReading} />
 *  …or mount it once with no prop and have the reader set a signal on finish:
 *    localStorage.setItem('euangelion:just-finished-reading', '1')
 *  The component polls that key on mount and on window focus.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
const FINISHED_SIGNAL_KEY = 'euangelion:just-finished-reading'
const DISMISSED_KEY = 'euangelion:push-optin-dismissed'

type Status =
  | 'idle' // not yet shown / not eligible / config missing -> renders nothing
  | 'prompt' // showing the gentle invite
  | 'requesting' // permission + subscribe in flight
  | 'granted' // subscribed
  | 'denied' // user blocked notifications
  | 'error' // subscribe failed

interface PushOptInProps {
  /**
   * When true, the invite is eligible to appear. Defaults to undefined, in
   * which case the component watches the `euangelion:just-finished-reading`
   * localStorage signal instead.
   */
  show?: boolean
}

/** Convert a base64url VAPID key into the Uint8Array the PushManager needs. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export default function PushOptIn({ show }: PushOptInProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [eligible, setEligible] = useState(false)
  const checkedRef = useRef(false)

  // Determine eligibility: env configured, browser-capable, not already
  // subscribed, not permanently denied, not previously dismissed.
  //
  // All of these prerequisite failures resolve to "render nothing", which is
  // already the `idle` initial state — so the effect never sets state
  // synchronously. The honest disabled state (no client VAPID key) is the same:
  // we offer nothing rather than fake an opt-in. Only the genuinely async
  // outcome (no existing subscription -> eligible) flips state.
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    if (
      !VAPID_PUBLIC_KEY || // no client VAPID key -> push can never work
      !pushSupported() ||
      Notification.permission === 'denied' ||
      localStorage.getItem(DISMISSED_KEY) === '1'
    ) {
      return // stays idle -> renders nothing, honestly offering no opt-in
    }

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        // Already opted in (or check failed) -> stay idle, render nothing.
        if (!existing) setEligible(true)
      } catch {
        // Stay idle.
      }
    })()
  }, [])

  // Decide visibility from the `show` prop OR the finished-reading signal.
  useEffect(() => {
    if (!eligible) return

    const reveal = () => setStatus('prompt')

    if (typeof show === 'boolean') {
      if (show) reveal()
      return
    }

    // No explicit prop: watch the localStorage signal the reader can set.
    const check = () => {
      if (localStorage.getItem(FINISHED_SIGNAL_KEY) === '1') reveal()
    }
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [eligible, show])

  async function handleAccept() {
    if (!VAPID_PUBLIC_KEY) return
    setStatus('requesting')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!res.ok) {
        // Don't keep a subscription the server couldn't store.
        await subscription.unsubscribe().catch(() => {})
        setStatus('error')
        return
      }

      localStorage.setItem(FINISHED_SIGNAL_KEY, '0')
      setStatus('granted')
    } catch {
      setStatus('error')
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    localStorage.setItem(FINISHED_SIGNAL_KEY, '0')
    setStatus('idle')
  }

  // Render nothing for the silent / not-yet-eligible state. The honest
  // "server not configured" case never reaches the prompt — it stays idle and
  // renders nothing, so we never fake an opt-in the backend can't fulfil.
  if (status === 'idle') {
    return null
  }

  const serif = { fontFamily: 'var(--font-family-serif, Georgia, serif)' }

  return (
    <section
      aria-live="polite"
      className="mx-auto my-10 w-full max-w-[34rem] px-6"
    >
      <div
        className="rounded-[6px] border px-6 py-7 text-center transition-shadow motion-reduce:transition-none"
        style={{
          borderColor: 'var(--color-border, rgba(31,42,141,0.25))',
          background: 'var(--color-surface-raised, transparent)',
        }}
      >
        {/* PROMPT — the calm invite */}
        {status === 'prompt' || status === 'requesting' ? (
          <>
            <p
              className="mb-3 text-gold"
              style={{
                ...serif,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)',
                lineHeight: 1.15,
              }}
            >
              One quiet word each morning.
            </p>
            <p
              className="text-serif-italic mb-6 text-secondary"
              style={{ maxWidth: '42ch', marginInline: 'auto' }}
            >
              No streaks, no badges. Just a single line to carry into the day —
              and you can turn it off any time.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAccept}
                disabled={status === 'requesting'}
                className="text-label inline-flex min-h-[44px] items-center justify-center rounded-[4px] px-6 py-2 transition-transform duration-200 disabled:opacity-60 motion-reduce:transition-none"
                style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-paper, #efe5d8)',
                  minWidth: '11rem',
                }}
              >
                {status === 'requesting'
                  ? 'One moment…'
                  : 'Yes, gently remind me'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={status === 'requesting'}
                className="text-label vw-small inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] disabled:opacity-60 motion-reduce:transition-none"
              >
                Not now
              </button>
            </div>
          </>
        ) : null}

        {/* GRANTED */}
        {status === 'granted' ? (
          <>
            <p
              className="mb-2 text-gold"
              style={{
                ...serif,
                fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
                lineHeight: 1.2,
              }}
            >
              It&rsquo;s set.
            </p>
            <p
              className="text-serif-italic text-secondary"
              style={{ maxWidth: '42ch', marginInline: 'auto' }}
            >
              One quiet word will find you each morning. Manage it any time in
              Settings.
            </p>
          </>
        ) : null}

        {/* DENIED — clear, no blame */}
        {status === 'denied' ? (
          <>
            <p
              className="mb-2"
              style={{
                ...serif,
                fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
                lineHeight: 1.2,
                color: 'var(--color-crimson)',
              }}
            >
              Notifications are blocked.
            </p>
            <p
              className="text-serif-italic mb-4 text-secondary"
              style={{ maxWidth: '44ch', marginInline: 'auto' }}
            >
              Your browser is set to block notifications for this site. To
              receive the morning word, allow notifications in your browser
              settings, then try again.
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-label vw-small inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] motion-reduce:transition-none"
            >
              Dismiss
            </button>
          </>
        ) : null}

        {/* ERROR — honest, retryable */}
        {status === 'error' ? (
          <>
            <p
              className="mb-2"
              style={{
                ...serif,
                fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
                lineHeight: 1.2,
                color: 'var(--color-crimson)',
              }}
            >
              Something went wrong.
            </p>
            <p
              className="text-serif-italic mb-4 text-secondary"
              style={{ maxWidth: '42ch', marginInline: 'auto' }}
            >
              We couldn&rsquo;t set up the morning word just now. Nothing was
              saved.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAccept}
                className="text-label inline-flex min-h-[44px] items-center justify-center rounded-[4px] px-6 py-2 transition-transform duration-200 motion-reduce:transition-none"
                style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-paper, #efe5d8)',
                  minWidth: '9rem',
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-label vw-small inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] motion-reduce:transition-none"
              >
                Not now
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
