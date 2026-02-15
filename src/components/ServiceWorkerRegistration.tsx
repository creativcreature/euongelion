'use client'

import { useEffect } from 'react'

const SW_VERSION = 'v44'
const SW_VERSION_KEY = 'euangelion-sw-version'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'production') {
      let refreshed = false
      const onControllerChange = () => {
        if (refreshed) return
        refreshed = true
        window.location.reload()
      }

      navigator.serviceWorker.addEventListener(
        'controllerchange',
        onControllerChange,
      )

      void (async () => {
        const previousVersion = localStorage.getItem(SW_VERSION_KEY)
        if (previousVersion !== SW_VERSION) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(
            registrations.map((registration) => registration.unregister()),
          )
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(
              keys
                .filter((key) => key.startsWith('euangelion-'))
                .map((key) => caches.delete(key)),
            )
          }
          localStorage.setItem(SW_VERSION_KEY, SW_VERSION)
        }

        await navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            const promoteWaitingWorker = (worker: ServiceWorker | null) => {
              if (!worker) return
              worker.postMessage({ type: 'SKIP_WAITING' })
            }

            // Ensure browser checks for updates immediately.
            void registration.update()
            promoteWaitingWorker(registration.waiting)

            registration.addEventListener('updatefound', () => {
              const installing = registration.installing
              if (!installing) return

              installing.addEventListener('statechange', () => {
                if (
                  installing.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  promoteWaitingWorker(registration.waiting || installing)
                }
              })
            })
          })
          .catch(() => {
            // Silent fail — SW registration is best-effort
          })
      })()

      return () => {
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          onControllerChange,
        )
      }
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
