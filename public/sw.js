self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(self.registration.showNotification(data.title || 'AgendBarber', {
    body: data.body || 'Voce recebeu uma nova atualizacao.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'agendbarber-notification',
    renotify: true,
    data: { url: data.url || '/dashboard' },
    vibrate: [180, 80, 180],
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin))
    if (existing) {
      existing.navigate(targetUrl)
      return existing.focus()
    }
    return clients.openWindow(targetUrl)
  }))
})
