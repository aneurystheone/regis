
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Replace this with your actual Firebase project configuration
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {

  apiKey: "AIzaSyB70zpK9d4eAUlEf180enpCWsgoUdaTpW4",

  authDomain: "teacher-productivity-kit.firebaseapp.com",

  databaseURL: "https://teacher-productivity-kit-default-rtdb.firebaseio.com",

  projectId: "teacher-productivity-kit",

  // Changed to .firebasestorage.app as it is the standard for newer projects and often fixes connection issues
  storageBucket: "teacher-productivity-kit.firebasestorage.app",

  messagingSenderId: "158174574994",

  appId: "1:158174574994:web:f4aed0071e96f5a046694b",

  measurementId: "G-LDT7EPRKT9"

};

// Initialize Firebase
// We wrap this in a try-catch to prevent app crash if config is missing in dev
let app;
let db: any;
let storage: any;
let auth: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
} catch (error) {
  console.warn("Firebase configuration is missing or invalid. Cloud features will not work.");
}

export { db, storage, auth };
