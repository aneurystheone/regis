
import { auth } from '../firebase-core';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  sendPasswordResetEmail,
  confirmPasswordReset,
  deleteUser
} from "firebase/auth";
import { User } from '../types';

import { clearAllLocalCache } from './localCache';

// Store reference to the observer callback to trigger it manually if needed
let authStateObserver: ((user: User | null) => void) | null = null;
let isVirtualDemo = false;

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
      
      // Clear in-memory and IndexedDB local caches for data isolation
      await clearAllLocalCache();
      
      // Preserve navigation history and theme preferences across logouts
      const preservedKeys = ['teacherkit-isDarkMode', 'teacherkit-fontSize'];
      const preservedValues = new Map<string, string>();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('regis_last_view_') || key.startsWith('regis_last_main_view_') || preservedKeys.includes(key))) {
          const val = localStorage.getItem(key);
          if (val !== null) {
            preservedValues.set(key, val);
          }
        }
      }

      localStorage.clear();
      
      // Restore preserved values
      preservedValues.forEach((val, key) => {
        localStorage.setItem(key, val);
      });

      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  },

  // Social Login & Recovery
  async loginWithGoogle(): Promise<User | null> {
    try {
      // Capacitor native: use native plugin
      if (Capacitor.isNativePlatform()) {
        const loginResult = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });
        const idToken = (loginResult.result as any)?.idToken;
        if (!idToken) throw new Error('No idToken returned from Google sign-in');
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        return {
          id: result.user.uid,
          name: result.user.displayName || 'Usuario',
          email: result.user.email || '',
          password: '' // Not applicable for OAuth
        };
      }

      // Electron desktop: use IPC-based OAuth window (signInWithPopup fails from app:// scheme)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        const oauthResult = await (window as any).electronAPI.openOAuthWindow('google');
        if (!oauthResult) {
          // User closed the OAuth window — not an error
          throw { code: 'auth/popup-closed-by-user', message: 'OAuth window was closed.' };
        }
        const credential = GoogleAuthProvider.credential(oauthResult.idToken);
        const result = await signInWithCredential(auth, credential);
        return {
          id: result.user.uid,
          name: result.user.displayName || 'Usuario',
          email: result.user.email || '',
          password: ''
        };
      }

      // Web: standard popup flow
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      return result.user ? { id: result.user.uid, name: result.user.displayName || 'Usuario', email: result.user.email || '', password: '' } : null;
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  },

  async loginWithFacebook(): Promise<User | null> {
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user ? { id: result.user.uid, name: result.user.displayName || 'Usuario', email: result.user.email || '', password: '' } : null;
    } catch (error) {
      console.error("Facebook Login Error:", error);
      throw error;
    }
  },

  async loginWithApple(): Promise<User | null> {
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      return result.user ? { id: result.user.uid, name: result.user.displayName || 'Usuario', email: result.user.email || '', password: '' } : null;
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

  async confirmPasswordReset(code: string, newPass: string): Promise<void> {
    try {
      await confirmPasswordReset(auth, code, newPass);
    } catch (error) {
      console.error("Confirm Password Reset Error:", error);
      throw error;
    }
  },

  async deleteAccount(): Promise<void> {
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
    } catch (error) {
      console.error("Delete Account Error:", error);
      throw error;
    }
  },

  // Auth Observer
  onAuthStateChange(callback: (user: User | null) => void) {
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
