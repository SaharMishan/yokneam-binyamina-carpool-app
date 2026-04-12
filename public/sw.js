
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
  const notificationTitle = payload.notification?.title || 'קארפול יקנעם-בנימינה';
  const notificationOptions = {
    body: payload.notification?.body || 'התקבלה התראה חדשה',
    icon: '/logo.svg?v=5',
    badge: '/logo.svg?v=5',
    data: payload.data,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'carpool-v1.9.16';
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
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this app
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.navigate(urlToOpen).then(c => c.focus());
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
