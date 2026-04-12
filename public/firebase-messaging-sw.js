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
  
  const notificationTitle = payload.notification?.title || 'קארפול יקנעם-בנימינה';
  const notificationOptions = {
    body: payload.notification?.body || 'התקבלה התראה חדשה',
    icon: '/logo.svg?v=5',
    badge: '/logo.svg?v=5',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
