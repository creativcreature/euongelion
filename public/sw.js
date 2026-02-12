// Euangelion Service Worker
const CACHE_NAME = 'euangelion-v29'
const OFFLINE_URL = '/offline'

// Static assets to pre-cache
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/series',
  '/soul-audit',
  '/wake-up',
]

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

  // Skip Next.js internals
  if (url.pathname.startsWith('/_next/')) return

  // Devotional JSON files: cache-first (they rarely change)
  if (url.pathname.startsWith('/devotionals/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Images: cache-first
  if (url.pathname.startsWith('/images/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }

  // Pages: network-first, fall back to cache, then offline page
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
