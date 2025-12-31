import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// ... [existing config] ...
const firebaseConfig = {
  apiKey: "AIzaSyB70zpK9d4eAUlEf180enpCWsgoUdaTpW4",
  authDomain: "teacher-productivity-kit.firebaseapp.com",
  databaseURL: "https://teacher-productivity-kit-default-rtdb.firebaseio.com",
  projectId: "teacher-productivity-kit",
  storageBucket: "teacher-productivity-kit.firebasestorage.app",
  messagingSenderId: "158174574994",
  appId: "1:158174574994:web:f4aed0071e96f5a046694b",
  measurementId: "G-LDT7EPRKT9"
};

// Initialize Firebase
let app;
let db: any;
let storage: any;
let auth: any;

try {
  app = initializeApp(firebaseConfig);
  // Enable offline persistence with multi-tab support
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  storage = getStorage(app);
  auth = getAuth(app);
} catch (error) {
  console.warn("Firebase configuration is missing or invalid. Cloud features will not work.");
}

export { db, storage, auth };
