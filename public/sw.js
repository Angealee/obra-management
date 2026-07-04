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
 *
 * Foreground behavior: when an app window is VISIBLE, the push is handed to
 * the page (postMessage → the in-app banner) and the OS notification is
 * skipped — native-app behavior, no double-notify. Browsers exempt pushes
 * from the "must show a notification" rule while the origin has a visible
 * window. With no visible window, the OS notification shows as usual.
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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const visible = wins.filter(
        (w) => w.visibilityState === 'visible' && w.url.startsWith(self.location.origin)
      )
      if (visible.length > 0) {
        for (const w of visible) {
          w.postMessage({ kind: 'PUSH_RECEIVED', payload: { ...payload, title } })
        }
        return
      }
      return self.registration.showNotification(title, {
        body: payload.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: payload.tag || undefined,
        data: { url: payload.url || '/dashboard' },
      })
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
        // WindowClient.navigate isn't supported everywhere (notably some iOS
        // versions), so fall back to opening a fresh window when it's missing
        // or rejects.
        if (win.url.startsWith(self.location.origin) && 'focus' in win) {
          if (typeof win.navigate === 'function') {
            return win.navigate(url).then(
              () => win.focus(),
              () => clients.openWindow(url)
            )
          }
          return clients.openWindow(url)
        }
      }
      return clients.openWindow(url)
    })
  )
})

/* Push services occasionally rotate or expire a subscription. Re-subscribe
 * with the same VAPID key and tell the server to swap the endpoint on the
 * user's row (categories carry over). Without this the device silently stops
 * receiving notifications until the user manually re-enables them. */
self.addEventListener('pushsubscriptionchange', (event) => {
  const oldSub = event.oldSubscription
  const appServerKey =
    (event.newSubscription && event.newSubscription.options.applicationServerKey) ||
    (oldSub && oldSub.options.applicationServerKey)
  if (!appServerKey) return

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey })
      .then((newSub) =>
        fetch('/api/push/resubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: oldSub ? oldSub.endpoint : null,
            subscription: newSub.toJSON(),
          }),
        })
      )
      .catch(() => {/* best-effort — the profile card can always re-enable */})
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
