
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// PWA Install Prompt Handling
(window as any).deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredInstallPrompt = e;
  const event = new CustomEvent('pwa-install-available', { bubbles: true, cancelable: true });
  window.dispatchEvent(event);
});

/**
 * רישום ה-Service Worker - מותאם גם ל-Netlify
 */
const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // שימוש בנתיב יחסי להבטחת עבודה בשרתים שונים
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('PWA Service Worker Active!', registration.scope);
    } catch (err) {
      console.warn('PWA Registration failed:', err);
    }
  }
};

// רישום ה-SW לאחר טעינת הדף המלאה
window.addEventListener('load', registerSW);

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
