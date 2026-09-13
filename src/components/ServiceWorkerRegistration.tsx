'use client'

import { useEffect } from 'react'

import { getAudioElement } from '@/lib/audio/audio-element'

// R37 (2026-05-15): bump on every deploy that ships UI changes so
// returning users force-refresh into the new build without manually
// reloading. v50 corresponds to the R37 deploy.
// R38 (Phase 2.2 + 2.3): v51 — offline reading-route caching + web-push
// handlers in /sw.js. Must match CACHE_NAME there.
const SW_VERSION = 'v165'
/** Must match DOWNLOADS_CACHE in public/sw.js. Never versioned. */
const DOWNLOADS_CACHE = 'euangelion-downloads'
const SW_VERSION_KEY = 'euangelion-sw-version'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'production') {
      // Reload ONLY when an existing controller is replaced (a real update
      // took over). On a FIRST visit the fresh worker's clients.claim()
      // also fires controllerchange — reloading there made every new
      // visitor load the page twice (double image fetches, LCP anchored to
      // the second parse; found by the 2026-07-10 LCP loop, round 2).
      const hadController = Boolean(navigator.serviceWorker.controller)
      let refreshed = false

      /**
       * Take the new build — but never out from under someone listening.
       *
       * A reload destroys the document, and with it the ONE `<audio>` element
       * the whole site plays through (SA-115). In the installed PWA there is
       * no browser chrome to make a reload legible, so it is indistinguishable
       * from the audio simply stopping — which is what the founder reported:
       * "when in web app (save to ios) and I switch tabs, the audio stops."
       *
       * The tab switch was never the cause. `registration.update()` runs on
       * mount, a waiting worker is promoted immediately via SKIP_WAITING, and
       * whenever that lands mid-reading this handler reloaded the page. It
       * looks like a tab-switch bug because a tab switch is when you are most
       * likely to be looking.
       *
       * Deferring costs nothing. The new worker is already in control, so
       * every asset fetched from here on is the new build; the reload exists
       * only to re-parse the document, and that can wait for a gap in the
       * reading. Nothing changes for a reader who is not listening.
       */
      const reloadWhenNotListening = () => {
        if (refreshed) return
        const audio = getAudioElement()
        if (audio && !audio.paused && !audio.ended) {
          audio.addEventListener('pause', reloadWhenNotListening, {
            once: true,
          })
          audio.addEventListener('ended', reloadWhenNotListening, {
            once: true,
          })
          return
        }
        refreshed = true
        window.location.reload()
      }

      const onControllerChange = () => {
        if (!hadController) return
        reloadWhenNotListening()
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
                .filter(
                  (key) =>
                    key.startsWith('euangelion-') &&
                    // SA-101: downloaded readings survive a version bump. This
                    // sweep runs on EVERY release, so without the exemption a
                    // reader who saved a series for a flight would lose it to a
                    // deploy they never saw — and would have no way to connect
                    // the two. The service worker's own `activate` purge
                    // exempts the same bucket.
                    key !== DOWNLOADS_CACHE,
                )
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
