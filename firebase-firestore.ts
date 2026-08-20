import { app } from "./firebase-core";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

let db: any;

try {
  if (app) {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true,
    });
  }
} catch (error) {
  console.warn("Firebase Firestore could not be initialized.", error);
}

export { db };
