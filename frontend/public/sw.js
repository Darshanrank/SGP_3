self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {
      title: 'SkillSwap',
      body: event.data ? event.data.text() : 'You have a new notification.'
    };
  }

  const title = payload.title || 'SkillSwap Notification';
  const body = payload.body || 'You have a new notification.';
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: '/vite.svg',
      badge: '/vite.svg'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const link = event.notification?.data?.link || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const matchedClient = clientsArr.find((client) => client.url.includes(self.location.origin));

      if (matchedClient) {
        return matchedClient.focus().then(() => {
          matchedClient.navigate(link);
        });
      }

      return self.clients.openWindow(link);
    })
  );
});
