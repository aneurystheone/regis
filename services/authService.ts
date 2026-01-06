
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  FacebookAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { User } from '../types';

// Store reference to the observer callback to trigger it manually if needed
let authStateObserver: ((user: User | null) => void) | null = null;
let isVirtualDemo = false;
// Flag to prevent onAuthStateChanged from overwriting a successful login with null immediately due to race conditions
let justLoggedIn = false;

export const authService = {
  // Sign Up
  async signUp(name: string, email: string, pass: string): Promise<User | null> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });

        const updatedUser: User = {
          id: userCredential.user.uid,
          name: name,
          email: userCredential.user.email || '',
          password: ''
        };

        if (authStateObserver) {
          authStateObserver(updatedUser);
        }

        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  },

  // Login
  async login(email: string, pass: string): Promise<User | null> {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const u = userCredential.user;
      return {
        id: u.uid,
        name: u.displayName || 'Usuario',
        email: u.email || '',
        password: ''
      };
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  },

  // Demo Login (Anonymous with Virtual Fallback)
  async loginDemo(): Promise<void> {
    try {
      // Try official Firebase Anonymous Login
      await signInAnonymously(auth);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: 'Invitado Demo' });
      }
    } catch (error: any) {
      console.warn("Firebase Anonymous Auth restricted, switching to Virtual Demo Mode:", error.message);

      // Fallback: Create a Virtual Session
      isVirtualDemo = true;
      localStorage.setItem('regis_virtual_demo', 'true');

      const virtualUser: User = {
        id: 'DEMO_GUEST_USER',
        name: 'Invitado Demo (Local)',
        email: 'demo@regis.app',
        password: ''
      };

      if (authStateObserver) {
        authStateObserver(virtualUser);
      }
    }
  },

  // Update Photo
  async updatePhotoURL(photoURL: string): Promise<void> {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL });
      if (authStateObserver) {
        authStateObserver({
          id: auth.currentUser.uid,
          name: auth.currentUser.displayName || 'Usuario',
          email: auth.currentUser.email || '',
          password: ''
        });
      }
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      isVirtualDemo = false;
      justLoggedIn = false;
      localStorage.removeItem('regis_virtual_demo');
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  },

  // Social Login & Recovery
  async loginWithGoogle(): Promise<User | null> {
    console.log("Iniciando login con Google...");
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Google Popup finalizado. Usuario:", result.user);
      const user = result.user;
      const mappedUser = {
        id: user.uid,
        name: user.displayName || 'Usuario',
        email: user.email || '',
        password: ''
      };
      
      justLoggedIn = true;
      // Force update observer if it exists
      if (authStateObserver) {
          console.log("Forzando actualización de estado (observer)...");
          authStateObserver(mappedUser);
      }
      
      // Reset flag after 5 seconds
      setTimeout(() => { justLoggedIn = false; }, 5000);

      return mappedUser;
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  },

  async loginWithFacebook(): Promise<User | null> {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
       const mappedUser = {
        id: user.uid,
        name: user.displayName || 'Usuario',
        email: user.email || '',
        password: ''
      };
      justLoggedIn = true;
       if (authStateObserver) {
          authStateObserver(mappedUser);
      }
      setTimeout(() => { justLoggedIn = false; }, 5000);
      return mappedUser;
    } catch (error) {
      console.error("Facebook Login Error:", error);
      throw error;
    }
  },

  async loginWithApple(): Promise<User | null> {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
       const mappedUser = {
        id: user.uid,
        name: user.displayName || 'Usuario',
        email: user.email || '',
        password: ''
      };
      justLoggedIn = true;
       if (authStateObserver) {
          authStateObserver(mappedUser);
      }
      setTimeout(() => { justLoggedIn = false; }, 5000);
      return mappedUser;
    } catch (error) {
      console.error("Apple Login Error:", error);
      throw error;
    }
  },

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Reset Password Error:", error);
      throw error;
    }
  },

  // Auth Observer
  onAuthStateChange(callback: (user: User | null) => void) {
    console.log("Registrando observador de autenticación...");
    authStateObserver = callback;

    // Check if we were in virtual demo mode
    const wasVirtual = localStorage.getItem('regis_virtual_demo') === 'true';
    if (wasVirtual) {
      isVirtualDemo = true;
      setTimeout(() => {
        callback({
          id: 'DEMO_GUEST_USER',
          name: 'Invitado Demo (Local)',
          email: 'demo@regis.app',
          password: ''
        });
      }, 100);
    }

    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      console.log("onAuthStateChanged disparado. User:", firebaseUser ? firebaseUser.uid : "null");
      // Only trigger if we are NOT in virtual mode (to avoid overwriting)
      if (firebaseUser) {
        isVirtualDemo = false;
        localStorage.removeItem('regis_virtual_demo');
        callback({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Invitado Demo' : 'Usuario'),
          email: firebaseUser.email || (firebaseUser.isAnonymous ? 'demo@regis.app' : ''),
          password: ''
        });
      } else if (!isVirtualDemo && !wasVirtual) {
        // If we just logged in explicitly, ignore a null update for a moment
        if (justLoggedIn) {
            console.log("Ignorando actualización 'null' de onAuthStateChanged debido a login reciente.");
            return;
        }
        callback(null);
      }
    });
  },

  isDemoMode() {
    return isVirtualDemo || (auth.currentUser?.isAnonymous ?? false);
  },

  getCurrentUser() {
    if (this.isDemoMode()) return { id: 'DEMO_GUEST_USER', name: 'Invitado', email: '', password: '' };
    if (!auth.currentUser) return null;
    return {
      id: auth.currentUser.uid,
      name: auth.currentUser.displayName || 'Usuario',
      email: auth.currentUser.email || '',
      password: ''
    };
  }
};
