/*
 * PW-08: Web Push for SIGAP, imported into the generated service worker
 * (vite.config.ts → workbox.importScripts). Shows the message and opens the
 * screen it points to when tapped.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'SIGAP', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'SIGAP'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag,
      data: data.data || {},
      lang: 'id',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const client = windows.find((w) => 'focus' in w)
      if (!client) return self.clients.openWindow(url)
      // navigate() fails on a window this worker does not control: open a new one then
      return client
        .focus()
        .then((focused) => (focused || client).navigate(url))
        .catch(() => self.clients.openWindow(url))
    }),
  )
})
