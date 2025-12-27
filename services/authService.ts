
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser 
} from "firebase/auth";
import { User } from '../types';

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
      localStorage.removeItem('regis_virtual_demo');
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
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
  }
};
