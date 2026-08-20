
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { hydrateCacheFromIDB } from './services/localCache';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Render immediately — hydrate cache in background (non-blocking)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hydrate memory cache from IndexedDB in background
hydrateCacheFromIDB();

// Request persistent storage to prevent browser eviction of IndexedDB data
// (No-op on Safari/iOS, but protects Chrome/Android/Desktop)
if (navigator.storage?.persist) {
  navigator.storage.persist().then(granted => {
    if (granted) console.log('✅ Persistent storage granted');
  });
}
