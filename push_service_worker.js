self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'SHOW_TEST_NOTIFICATION') {
    return;
  }

  const title = data.title || 'Push Setup Test';
  const options = {
    body: data.body || 'Service worker test notification.',
    tag: 'push-setup-test',
    data: { source: 'chunk2-setup' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    try {
      const payload = event.data ? event.data.json() : {};
      const title = payload.title || 'Notification';
      const fallbackTag = `browser-push-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const options = {
        body: payload.body || '',
        tag: payload.tag || fallbackTag,
        data: payload.data || {},
      };

      await self.registration.showNotification(title, options);
    } catch (error) {
      console.error('Push handler failed:', error);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    if (clientList.length > 0) {
      return clientList[0].focus();
    }
    return clients.openWindow('/');
  }));
});
