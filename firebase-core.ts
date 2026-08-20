import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, initializeAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app;
let auth: any;
let analytics: any;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);

  // Analytics requires http/https — skip when Electron loads via file:// (installed app)
  const isWebContext = typeof window !== 'undefined' &&
    window.location.protocol !== 'file:';
  if (isWebContext && firebaseConfig.measurementId) {
    try {
      analytics = initializeAnalytics(app, {
        config: { cookie_domain: 'auto', send_page_view: true }
      });
    } catch (e) {
      analytics = getAnalytics(app);
    }
  }
} catch (error) {
  console.warn("Firebase core configuration is missing or invalid.");
}

// Remote Config (Safe init — requires http/https, not file://)
let remoteConfig: any;
const isWebContext2 = typeof window !== 'undefined' && window.location.protocol !== 'file:';
if (isWebContext2 && app) {
  import("firebase/remote-config").then(({ getRemoteConfig }) => {
    remoteConfig = getRemoteConfig(app!);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour default
  }).catch(e => console.warn("Remote Config failed to load", e));
}

export { app, auth, analytics, remoteConfig };
