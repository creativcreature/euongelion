'use client'

import { useEffect, useState } from 'react'

const ONLINE_BANNER_MS = 4_000

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

  if (!isOnline) return null

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
