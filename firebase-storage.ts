import { app } from "./firebase-core";
import { getStorage } from "firebase/storage";

let storage: any;

try {
  if (app) {
    storage = getStorage(app);
  }
} catch (error) {
  console.warn("Firebase Storage could not be initialized.", error);
}

export { storage };
