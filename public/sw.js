/* Obra CMP service worker — installable + offline app shell.
 *
 * Deliberately does NOT cache API/auth/Supabase responses: this is an
 * RLS-secured app and caching role-protected data risks serving stale or
 * leaked data. Only the static shell + an offline fallback page are cached.
 *
 * Update flow: a new SW installs and WAITS (no auto-skipWaiting). The page's
 * PwaController detects the waiting worker, shows an "update available" toast,
 * and posts SKIP_WAITING when the user accepts.
 */
const VERSION = 'obra-v1'
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`
const OFFLINE_URL = '/offline'

const PRECACHE = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE).catch(() => {/* tolerate a missing entry */})
    )
  )
  // Note: no skipWaiting() here — we wait so the update toast can drive it.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// Let the page tell us to activate immediately (from the update toast).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

/* ── Web Push ───────────────────────────────────────────────────────────────
 * Payloads are JSON built server-side (lib/push.ts): { title, body, url, tag }.
 * `tag` collapses repeat notifications of the same thing (e.g. re-sends).
 * Clicking focuses an existing app window and navigates it, or opens one.
 */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'Obra CMP'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag || undefined,
      data: { url: payload.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        // Reuse an open app window: navigate it to the target and focus.
        if (win.url.startsWith(self.location.origin) && 'focus' in win) {
          win.navigate(url)
          return win.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

function isBypassed(url) {
  // Never touch auth, API routes, or anything cross-origin (Supabase, etc.).
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // cross-origin: let it pass
  if (isBypassed(url)) return

  // Navigations: network-first, fall back to cached page, then offline shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match(OFFLINE_URL)
        })
    )
    return
  }

  // Static assets: stale-while-revalidate.
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
})
