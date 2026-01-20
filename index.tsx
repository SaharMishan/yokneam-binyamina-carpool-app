
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// PWA Install Prompt Handling - Fix for Illegal constructor
(window as any).deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredInstallPrompt = e;
  // Use new CustomEvent constructor instead of createEvent/initEvent
  const event = new CustomEvent('pwa-install-available', { bubbles: true, cancelable: true });
  window.dispatchEvent(event);
});

/**
 * רישום ה-Service Worker
 */
const registerSW = async () => {
  if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    try {
      const registration = await navigator.serviceWorker.register('sw.js', { scope: './' });
      console.log('SW Registered!', registration.scope);
    } catch (err) {
      console.warn('SW Registration failed:', err);
    }
  }
};

registerSW();

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
