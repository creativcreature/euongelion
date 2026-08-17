// Euangelion Service Worker
// R68 (F-103/SA-059): v89 — Daily Bread and Today swap, the paper is
// renamed The Daily Bread, and every page gets the same bottom.
// R64 (F-094/F-097/SA-054): bumped to v83 — Feature is a front page, Spines
// are shelves, and /today is the Daily Edition with its own nav entry.
// R63 (F-095/SA-053): bumped to v80 — red letter is comprehensive; every
// passage containing Christ's words is now attributed.
// R62 (F-094/F-095/SA-052): bumped to v79 — Daily Bread matches the reader,
// Covers leads the switcher, red letter reaches multi-verse passages.
// R61 (F-095/SA-051): bumped to v78 — red letter now uses the BRAND crimson
// token rather than an invented value. CSS change on a cache-first route.
// R60 (F-095/SA-051): bumped to v77 — red letter. Devotional JSON is
// cache-first, so a returning reader would otherwise keep untagged passages.
// R59 (F-094/SA-050): bumped to v75 — /series drops to seven layouts, centres
// its controls, and the resume tile becomes one quiet line.
// R58 (F-094/SA-049): bumped to v74 — /series is rebuilt as ten layouts with
// an icon switcher. All new client code on a cache-first route.
// R56 (F-092/SA-047): bumped to v72 — the highlight toolbar flips below the
// passage when there is no room above (Remove was unreachable near the top of
// the window), and the chat launcher paints per theme. Reader client code.
// R55 (F-092/SA-046): bumped to v71 — highlights became editable (click a mark
// to recolour it, write a note on it, remove it). Reader client code, and the
// reading routes are cache-first, so a returning reader on v70 keeps the old
// bundle and sees none of it.
// R52 (F-090/SA-043): bumped to v67 — the series page is a new client bundle
// (library/bento/list + phrase search) and completion now advances the active
// day. Reading routes are cache-first, so a returning reader on an older
// version keeps the old shell and sees none of it.
// R37: bumped to v50 for the 2026-05-15 deploy.
// R38 (Phase 2.2 + 2.3): bumped to v51 — adds (a) cache-first-with-network-
// update for opened devotional reading routes + their JSON so a reader can
// re-open anything they've already opened while offline, (b) /today + /sunday
// in precache, (c) web-push 'push' + 'notificationclick' handlers.
// R51 (F-087/SA-040+SA-041): bumped to v64 — all ten looking-at-the-sun plates
// were replaced. /images/ is cache-first, so anyone who had opened those days
// held the old artwork permanently and the deploy alone would never reach them.
// Any image REPLACED at a path that already shipped needs this bump.
// R54 (F-091): bumped to v69 — nav order changed and both Daily Bread
// readings now render the devotional headline with artwork.
// R53 (F-091): bumped to v68 — nav lost its duplicate TODAY entry and the
// Daily Bread empty state now leads with the headline plate. Shell change.
// R52 (F-089): bumped to v66 — selection colour fixed at its real source and
// chat answers now render markdown.
// R51 (F-089): bumped to v65 — selection and highlighter colours changed, and
// study chat now resolves devotional context on Workers.
// R50 (F-088/SA-039): bumped to v63 — the library SERIES tab could not read a
// saved series row (404 link, hidden ACTIVATE, "Devotional" label).
// R49 (F-088): bumped to v62 — the reader-theme button no longer sits on the
// in-page audio controls at phone widths.
// R48 (F-088/SA-039): bumped to v61 — saving is series-level and anonymous
// highlights are kept on the device. Reader behaviour change on both save
// surfaces.
// R47 (F-088): bumped to v60 — church-year line moved to the home page, the
// Daily Bread reading lost its folio/church-year/"open full reader" step and
// gained the Audio Edition. Shell change on two routes.
// R46 (F-088/SA-038): bumped to v59 — highlighting now paints without an
// account. Reader-side behaviour change, so v58 holders would keep the old
// build in which a signed-out highlight did nothing at all.
// R45 (F-088): bumped to v58 — day quick-links added to the reader shell and
// the highlight toolbar now reports failures. Shell change, so v57 holders
// would see neither.
// R44 (F-088): bumped to v57 — the reader declutter changes the page shell
// itself (breadcrumbs, folio and the church-year line removed; the headline
// reordered). A reader holding v56 keeps the old shell and sees no change at
// all, which is exactly what the founder reported after the v56-era deploy.
// R43 (F-087): bumped to v56 — a new reading (looking-at-the-sun) plus its
// narration entry. The audio manifest is bundled at build time, so a returning
// reader holding v55 would keep the old bundle and never see the track.
// R42 (F-086): bumped to v55 — catalog render complete, all 520 devotionals
// have narration and chapters. The manifest is bundled, so this is client code.
// R41 (F-086): bumped to v54 — day-1 re-rendered (it predated the Roman
// numeral fix and its audio said "chapter VIII"), and every devotional now
// carries chapters. The manifest is bundled at build time, so this is client
// code and needs the bump.
// R40 (F-086, chapters): bumped to v53 — audio chapters, the chapter sheet,
// and the on-page section marker are all client code.
// R39 (F-086, narration): bumped to v52. Reading routes are cache-first, so a
// returning reader was being served the previous build's HTML *and* the old
// chunk hashes it references — the pre-rendered narration player and the
// reading rule shipped but were invisible to anyone who had opened the site
// before. Any deploy that changes client code MUST bump this pair.
// Keep CACHE_NAME in sync with SW_VERSION in
// src/components/ServiceWorkerRegistration.tsx — when the client sees a
// mismatched stored version it unregisters + clears caches before
// re-registering, so users on the old build pick up the new one without a
// manual hard-refresh.
const CACHE_NAME = 'euangelion-v107'
const OFFLINE_URL = '/offline'
const STATIC_ASSET_RE = /\.(js|css|woff2?|ttf|otf)$/i

// Static assets to pre-cache (the app shell + offline fallback).
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/today',
  '/sunday',
  '/daily-bread',
  '/series',
  '/soul-audit',
  '/help',
  '/settings',
  '/wake-up',
]

// Reading routes that should survive offline once opened. A devotional the
// reader has visited is the thing they most want back when the network drops,
// so these use cache-first-with-network-update (instant from cache, quietly
// refreshed in the background when online).
function isReadingRoute(pathname) {
  return (
    pathname.startsWith('/wake-up/devotional/') ||
    pathname === '/today' ||
    pathname === '/sunday'
  )
}

// Cache-first with background revalidation. Returns the cached copy
// immediately when present; otherwise falls to the network and caches a
// successful response. A background fetch keeps the cached copy fresh for
// next time without blocking this navigation.
function cacheFirstWithUpdate(request) {
  return caches.match(request).then((cached) => {
    const networkFetch = fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => cached)

    // Serve cache instantly when we have it (and let the network update run
    // in the background); otherwise wait on the network.
    if (cached) {
      // Fire-and-forget revalidation.
      networkFetch.catch(() => {})
      return cached
    }
    return networkFetch
  })
}

// Install: pre-cache essential pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Allow client to force immediate activation of updated SW.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip API routes — always network
  if (url.pathname.startsWith('/api/')) return

  // Next.js build assets and fonts: stale-while-revalidate for resilient offline shell
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    STATIC_ASSET_RE.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => cached || new Response('', { status: 503 }))

        return cached || networkFetch
      }),
    )
    return
  }

  // Devotional JSON files: cache-first (they rarely change). When fetched
  // client-side by an opened reading page, this keeps the reading available
  // offline. Falls back to any cached copy if the network is gone.
  if (url.pathname.startsWith('/devotionals/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => cached || new Response('', { status: 503 }))
      })
    )
    return
  }

  // Images: cache-first
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => new Response('', { status: 404 }))
      }),
    )
    return
  }

  // Reading routes (opened devotionals + /today + /sunday): cache-first with a
  // background network update, so a reader can re-open what they've already
  // opened even when fully offline. If neither cache nor network can satisfy a
  // navigation, fall through to the cached offline page below.
  if (request.headers.get('accept')?.includes('text/html') && isReadingRoute(url.pathname)) {
    event.respondWith(
      cacheFirstWithUpdate(request).then(
        (response) =>
          response || caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)),
      ),
    )
    return
  }

  // Other pages: network-first, fall back to cache, then offline page.
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    )
    return
  }
})

// ---------------------------------------------------------------------------
// Web push (Phase 2.2). Opt-in only — a subscription exists here solely because
// the user accepted the gentle PushOptIn prompt after finishing a reading.
// The scheduled SEND (the daily cron) is intentionally NOT in this file; see
// the contract comment at the top of src/app/api/push/subscribe/route.ts.
// ---------------------------------------------------------------------------

// Calm default nudge if a push arrives with no/invalid payload.
const DEFAULT_PUSH_TITLE = 'Euangelion'
const DEFAULT_PUSH_BODY = 'One quiet word for this morning is ready.'
const PUSH_ICON = '/icons/icon-192.png'
const PUSH_BADGE = '/icons/icon-192.png'

self.addEventListener('push', (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      // Non-JSON payloads fall back to the calm default below.
      payload = { body: event.data.text() }
    }
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title
      : DEFAULT_PUSH_TITLE
  const body =
    typeof payload.body === 'string' && payload.body.trim()
      ? payload.body
      : DEFAULT_PUSH_BODY
  const url = typeof payload.url === 'string' && payload.url.trim() ? payload.url : '/today'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: PUSH_ICON,
      badge: PUSH_BADGE,
      tag: 'euangelion-daily',
      renotify: false,
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/today'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if one is open, otherwise open a new one.
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate?.(targetUrl)
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
        return undefined
      }),
  )
})
