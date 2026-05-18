importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDPMvgiA-BMTfjpns7CYsfNFrU5PWqnJGw",
  authDomain: "carpool-yokneam.firebaseapp.com",
  projectId: "carpool-yokneam",
  storageBucket: "carpool-yokneam.firebasestorage.app",
  messagingSenderId: "374315181940",
  appId: "1:374315181940:web:e322c995e8c3b25e3eee21",
  measurementId: "G-LB4XC4NRZQ"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'קארפול יקנעם-בנימינה';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'התקבלה התראה חדשה',
    icon: '/logo.svg?v=5',
    badge: '/logo.svg?v=5',
    data: payload.data,
    tag: payload.data?.notifId || 'general',
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle generic push events as a fallback
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('[firebase-messaging-sw.js] Push event data was not JSON:', event.data.text());
      data = { notification: { title: 'קארפול יקנעם-בנימינה', body: event.data.text() } };
    }
  }

  const title = data.notification?.title || data.data?.title || data.title || 'קארפול יקנעם-בנימינה';
  const body = data.notification?.body || data.data?.message || data.data?.body || data.body || 'התקבלה התראה חדשה';
  const icon = data.notification?.icon || data.data?.icon || '/logo.svg?v=5';
  const url = data.data?.url || data.url || '/';
  const tag = data.data?.notifId || data.tag || 'general';

  const options = {
    body: body,
    icon: icon,
    badge: icon,
    data: { ...data.data, url: url },
    tag: tag,
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true,
    actions: [{ action: 'open', title: 'פתח אפליקציה' }]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[firebase-messaging-sw.js] Notification shown'))
      .catch(err => console.error('[firebase-messaging-sw.js] Notification error:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with the same domain
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if (client.url !== urlToOpen) return client.navigate(urlToOpen);
          });
        }
      }
      // If no window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
