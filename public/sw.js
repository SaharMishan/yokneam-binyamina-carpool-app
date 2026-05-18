
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
  console.log('[sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'קארפול יקנעם-בנימינה';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'התקבלה התראה חדשה',
    icon: 'https://ais-pre-bew2sfftalxeo7ooseqg7w-49268045711.europe-west3.run.app/logo.png',
    badge: 'https://ais-pre-bew2sfftalxeo7ooseqg7w-49268045711.europe-west3.run.app/logo.png',
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
  console.log('[sw.js] Push event received', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('[sw.js] Push event data was not JSON:', event.data.text());
      // Handle simple text if needed
      data = { notification: { title: 'קארפול יקנעם-בנימינה', body: event.data.text() } };
    }
  }

  console.log('[sw.js] Processing push data:', data);
  
  // Extract title and body from various possible locations in FCM payload
  const title = data.notification?.title || data.data?.title || data.title || 'קארפול יקנעם-בנימינה';
  const body = data.notification?.body || data.data?.message || data.data?.body || data.body || 'התקבלה התראה חדשה';
  const icon = data.notification?.icon || data.data?.icon || 'https://ais-pre-bew2sfftalxeo7ooseqg7w-49268045711.europe-west3.run.app/logo.png';
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
    actions: [
      { action: 'open', title: 'פתח אפליקציה' }
    ]
  };

  // Vital: use event.waitUntil to keep the service worker alive
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[sw.js] Notification shown successfully'))
      .catch((err) => console.error('[sw.js] Failed to show notification:', err))
  );
});

const CACHE_NAME = 'carpool-v1.9.22';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&display=swap',
  '/logo.svg?v=5'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit') || 
      event.request.url.includes('google.com')) {
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          if (event.request.mode === 'navigate') {
            return cache.match('/index.html');
          }
        });
        return response || fetchPromise;
      });
    })
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.');
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
