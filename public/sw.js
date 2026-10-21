const APP_BASE = new URL(self.registration.scope).pathname
const CACHE_PREFIX = `xiaoxu-shell:${APP_BASE}:`
const CACHE_NAME = `${CACHE_PREFIX}__CACHE_VERSION__`
const APP_SHELL = /* __ASSETS__ */ []
const shellUrl = `${APP_BASE}index.html`

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(APP_SHELL)
    await self.skipWaiting()
  })())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const ownCaches = (await caches.keys()).filter(key => key.startsWith(CACHE_PREFIX))
    // Retain one previous shell so tabs opened during an update can finish loading its assets.
    const keep = new Set(ownCaches.slice(-2))
    keep.add(CACHE_NAME)
    for (const key of ownCaches) if (!keep.has(key)) await caches.delete(key)
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    if (event.request.mode === 'navigate') {
      try {
        const response = await fetch(event.request)
        if (response.ok) return response
      } catch { /* Use the installed shell when the local server or network is unavailable. */ }
      const shell = await cache.match(shellUrl)
      return shell || fetch(event.request)
    }
    const hit = await cache.match(event.request)
    if (hit) return hit
    for (const key of await caches.keys()) {
      if (!key.startsWith(CACHE_PREFIX) || key === CACHE_NAME) continue
      const previous = await (await caches.open(key)).match(event.request)
      if (previous) return previous
    }
    return fetch(event.request)
  })())
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const page = pages.find(page => page.url.startsWith(self.registration.scope) && 'focus' in page)
    return page ? page.focus() : self.clients.openWindow(self.registration.scope)
  })())
})
