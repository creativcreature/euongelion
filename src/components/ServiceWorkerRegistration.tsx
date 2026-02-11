'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent fail — SW registration is best-effort
      })
      return
    }

    // In non-production, clear existing SW/caches to avoid stale UI while iterating.
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    })

    if ('caches' in window) {
      void caches.keys().then((keys) => {
        keys
          .filter((key) => key.startsWith('euangelion-'))
          .forEach((key) => {
            void caches.delete(key)
          })
      })
    }
  }, [])

  return null
}
