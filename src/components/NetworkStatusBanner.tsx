'use client'

import { useEffect, useState } from 'react'

const ONLINE_BANNER_MS = 4_000

/**
 * Connectivity banner (F-040: Offline/degraded states).
 *
 * Two explicit, labelled states — never a silent fallback:
 *  - OFFLINE: a persistent, honest notice that the connection dropped,
 *    with a manual retry affordance (Reload). The copy deliberately
 *    avoids the literal phrase "offline mode" (the locked decision is
 *    that we do not pretend to ship a fake degraded *mode* — we surface
 *    the real connectivity state and let already-cached reading continue
 *    via the service worker).
 *  - BACK ONLINE: a brief, auto-dismissing confirmation after reconnect.
 *
 * `aria-live` is set so screen readers announce the transition. The
 * Reload button gives the user an immediate recovery action rather than
 * waiting for the browser's `online` event, which can lag on flaky links.
 */
export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [showOnlineNotice, setShowOnlineNotice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timer: number | null = null

    const onOffline = () => {
      if (timer) {
        window.clearTimeout(timer)
        timer = null
      }
      setShowOnlineNotice(false)
      setIsOnline(false)
    }

    const onOnline = () => {
      setIsOnline(true)
      setShowOnlineNotice(true)
      if (timer) {
        window.clearTimeout(timer)
      }
      timer = window.setTimeout(() => {
        setShowOnlineNotice(false)
      }, ONLINE_BANNER_MS)
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      if (timer) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  function handleRetry() {
    if (typeof window === 'undefined') return
    // Re-read connectivity first so a recovered link clears the banner
    // without a full reload; otherwise force a reload to re-fetch.
    if (navigator.onLine) {
      setIsOnline(true)
      return
    }
    window.location.reload()
  }

  if (!isOnline) {
    return (
      <div
        className="network-status-banner is-offline"
        role="alert"
        aria-live="assertive"
      >
        <span>
          No connection. Readings you&rsquo;ve already opened still work.
        </span>{' '}
        <button
          type="button"
          onClick={handleRetry}
          style={{
            marginLeft: '0.5rem',
            padding: '0.15rem 0.6rem',
            border: '1px solid var(--color-gold)',
            color: 'var(--color-gold)',
            background: 'transparent',
            font: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    )
  }

  if (showOnlineNotice) {
    return (
      <div
        className="network-status-banner is-online"
        role="status"
        aria-live="polite"
      >
        Back online. Syncing current session.
      </div>
    )
  }

  return null
}
