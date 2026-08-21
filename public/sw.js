self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(self.registration.showNotification(data.title || 'AgendBarber', {
    body: data.body || 'Voce recebeu uma nova atualizacao.',
    icon: '/notification-icon-192-v2.png',
    badge: '/notification-badge-v3.png',
    tag: data.tag || 'agendbarber-notification',
    renotify: true,
    data: { url: data.url || '/dashboard' },
    vibrate: [180, 80, 180],
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href
  event.waitUntil((async () => {
    const windows = (await clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .filter((client) => client.url.startsWith(self.location.origin))
    const displayModes = await Promise.all(windows.map((client) => new Promise((resolve) => {
      const channel = new MessageChannel()
      const timeout = setTimeout(() => resolve({ client, standalone: false }), 350)
      channel.port1.onmessage = (message) => {
        clearTimeout(timeout)
        resolve({ client, standalone: Boolean(message.data?.standalone) })
      }
      client.postMessage({ type: 'AGEND_BARBER_DISPLAY_MODE' }, [channel.port2])
    })))
    const preferred = displayModes.find((entry) => entry.standalone)?.client
    if (preferred) {
      await preferred.navigate(targetUrl)
      return preferred.focus()
    }
    return clients.openWindow(targetUrl)
  })())
})
