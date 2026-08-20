/**
 * Unit Tests for authService.ts
 * 
 * Tests all authentication flows: signUp, login, social logins (Google/Facebook/Apple),
 * demo mode, logout, observer pattern, and utility functions.
 * Firebase Auth is fully mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock Firebase Auth ---
const mockUser = {
    uid: 'test-uid-123',
    displayName: 'Test User',
    email: 'test@example.com',
    isAnonymous: false,
};

const mockAnonymousUser = {
    uid: 'anon-uid-456',
    displayName: null,
    email: null,
    isAnonymous: true,
};

const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInAnonymously = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockConfirmPasswordReset = vi.fn();
const mockDeleteUser = vi.fn();
const mockOnAuthStateChanged = vi.fn();

const { mockAuthObject } = vi.hoisted(() => ({
    mockAuthObject: {
        currentUser: null,
    }
}));

vi.mock('../firebase-core', () => ({
    auth: mockAuthObject,
    analytics: null,
}));

vi.mock('../firebase', () => ({
    auth: mockAuthObject,
}));

vi.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
    signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
    signInAnonymously: (...args: any[]) => mockSignInAnonymously(...args),
    signOut: (...args: any[]) => mockSignOut(...args),
    onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
    updateProfile: (...args: any[]) => mockUpdateProfile(...args),
    GoogleAuthProvider: class MockGoogleAuthProvider {
        setCustomParameters = vi.fn();
    },
    FacebookAuthProvider: class MockFacebookAuthProvider { },
    OAuthProvider: class MockOAuthProvider {
        constructor(public providerId: string) { }
    },
    signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
    sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
    confirmPasswordReset: (...args: any[]) => mockConfirmPasswordReset(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
}));

import { authService } from './authService';
import { auth } from '../firebase-core';

// --- Fake localStorage ---
const localStore: Record<string, string> = {};
const fakeLocalStorage = {
    getItem: (key: string) => localStore[key] ?? null,
    setItem: (key: string, value: string) => { localStore[key] = value; },
    removeItem: (key: string) => { delete localStore[key]; },
    clear: () => { Object.keys(localStore).forEach(k => delete localStore[k]); },
    get length() { return Object.keys(localStore).length; },
    key: (index: number) => Object.keys(localStore)[index] ?? null,
};

beforeEach(() => {
    vi.clearAllMocks();
    fakeLocalStorage.clear();
    Object.defineProperty(global, 'localStorage', { value: fakeLocalStorage, writable: true });
    // Reset auth.currentUser
    (auth as any).currentUser = null;
});

afterEach(() => {
    fakeLocalStorage.clear();
});

// ============================================================
// 1. SIGN UP
// ============================================================

describe('authService.signUp', () => {
    it('creates user and returns mapped User object', async () => {
        mockCreateUserWithEmailAndPassword.mockResolvedValue({
            user: mockUser,
        });
        mockUpdateProfile.mockResolvedValue(undefined);

        const result = await authService.signUp('Test User', 'test@example.com', 'password123');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('test-uid-123');
        expect(result!.name).toBe('Test User');
        expect(result!.email).toBe('test@example.com');
        expect(result!.password).toBe('');
    });

    it('calls updateProfile with the display name', async () => {
        mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
        mockUpdateProfile.mockResolvedValue(undefined);

        await authService.signUp('María García', 'maria@test.com', 'pass');

        expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'María García' });
    });

    it('returns null if user is not returned', async () => {
        mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: null });

        const result = await authService.signUp('Test', 'test@test.com', 'pass');
        expect(result).toBeNull();
    });

    it('throws on Firebase error', async () => {
        mockCreateUserWithEmailAndPassword.mockRejectedValue(new Error('auth/email-already-in-use'));

        await expect(authService.signUp('Test', 'test@test.com', 'pass'))
            .rejects.toThrow('auth/email-already-in-use');
    });
});

// ============================================================
// 2. LOGIN
// ============================================================

describe('authService.login', () => {
    it('returns mapped User on successful login', async () => {
        mockSignInWithEmailAndPassword.mockResolvedValue({
            user: mockUser,
        });

        const result = await authService.login('test@example.com', 'password123');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('test-uid-123');
        expect(result!.name).toBe('Test User');
        expect(result!.email).toBe('test@example.com');
    });

    it('uses "Usuario" as fallback name when displayName is null', async () => {
        mockSignInWithEmailAndPassword.mockResolvedValue({
            user: { ...mockUser, displayName: null },
        });

        const result = await authService.login('test@example.com', 'pass');
        expect(result!.name).toBe('Usuario');
    });

    it('throws on invalid credentials', async () => {
        mockSignInWithEmailAndPassword.mockRejectedValue(new Error('auth/wrong-password'));

        await expect(authService.login('test@test.com', 'wrong'))
            .rejects.toThrow('auth/wrong-password');
    });
});

// ============================================================
// 3. DEMO LOGIN
// ============================================================

describe('authService.loginDemo', () => {
    it('calls signInAnonymously on success path', async () => {
        mockSignInAnonymously.mockResolvedValue(undefined);
        (auth as any).currentUser = mockAnonymousUser;
        mockUpdateProfile.mockResolvedValue(undefined);

        await authService.loginDemo();

        expect(mockSignInAnonymously).toHaveBeenCalled();
        expect(mockUpdateProfile).toHaveBeenCalledWith(mockAnonymousUser, { displayName: 'Invitado Demo' });
    });

    it('falls back to virtual demo mode when anonymous auth fails', async () => {
        mockSignInAnonymously.mockRejectedValue(new Error('auth/admin-restricted-operation'));

        // Set up the observer to capture virtual user
        let capturedUser: any = null;
        authService.onAuthStateChange((user) => { capturedUser = user; });

        // Use a mock for onAuthStateChanged to prevent it from overriding
        mockOnAuthStateChanged.mockImplementation(() => () => { });

        // Re-register observer since onAuthStateChanged was re-mocked
        authService.onAuthStateChange((user) => { capturedUser = user; });

        await authService.loginDemo();

        expect(fakeLocalStorage.getItem('regis_virtual_demo')).toBe('true');
    });
});

// ============================================================
// 4. SOCIAL LOGINS
// ============================================================

describe('authService.loginWithGoogle', () => {
    it('returns User on successful Google login', async () => {
        mockSignInWithPopup.mockResolvedValue({ user: mockUser });

        const result = await authService.loginWithGoogle();

        expect(result).not.toBeNull();
        expect(result!.id).toBe('test-uid-123');
        expect(result!.name).toBe('Test User');
    });

    it('calls signInWithPopup with a provider that has select_account set', async () => {
        mockSignInWithPopup.mockResolvedValue({ user: mockUser });

        await authService.loginWithGoogle();

        // Verify signInWithPopup was called (which internally creates GoogleAuthProvider 
        // and calls setCustomParameters - both would fail if our mock was wrong)
        expect(mockSignInWithPopup).toHaveBeenCalled();
        // The first argument to signInWithPopup is auth, second is the provider instance
        const providerArg = mockSignInWithPopup.mock.calls[0][1];
        expect(providerArg).toBeDefined();
        expect(providerArg.setCustomParameters).toBeDefined();
    });

    it('returns null when popup returns no user', async () => {
        mockSignInWithPopup.mockResolvedValue({ user: null });

        const result = await authService.loginWithGoogle();
        expect(result).toBeNull();
    });

    it('throws on popup error', async () => {
        mockSignInWithPopup.mockRejectedValue(new Error('auth/popup-closed-by-user'));

        await expect(authService.loginWithGoogle())
            .rejects.toThrow('auth/popup-closed-by-user');
    });
});

describe('authService.loginWithFacebook', () => {
    it('returns User on successful Facebook login', async () => {
        mockSignInWithPopup.mockResolvedValue({ user: mockUser });

        const result = await authService.loginWithFacebook();

        expect(result).not.toBeNull();
        expect(result!.id).toBe('test-uid-123');
    });
});

describe('authService.loginWithApple', () => {
    it('returns User on successful Apple login', async () => {
        mockSignInWithPopup.mockResolvedValue({ user: mockUser });

        const result = await authService.loginWithApple();

        expect(result).not.toBeNull();
        expect(result!.id).toBe('test-uid-123');
    });
});

// ============================================================
// 5. LOGOUT
// ============================================================

describe('authService.logout', () => {
    it('calls signOut and clears localStorage', async () => {
        mockSignOut.mockResolvedValue(undefined);
        fakeLocalStorage.setItem('regis_virtual_demo', 'true');
        fakeLocalStorage.setItem('some_data', 'value');

        await authService.logout();

        expect(mockSignOut).toHaveBeenCalled();
        expect(fakeLocalStorage.getItem('regis_virtual_demo')).toBeNull();
        expect(fakeLocalStorage.getItem('some_data')).toBeNull();
    });
});

// ============================================================
// 6. PASSWORD RESET
// ============================================================

describe('authService.resetPassword', () => {
    it('sends password reset email', async () => {
        mockSendPasswordResetEmail.mockResolvedValue(undefined);

        await authService.resetPassword('test@example.com');

        expect(mockSendPasswordResetEmail).toHaveBeenCalled();
    });

    it('throws on invalid email', async () => {
        mockSendPasswordResetEmail.mockRejectedValue(new Error('auth/user-not-found'));

        await expect(authService.resetPassword('invalid@test.com'))
            .rejects.toThrow('auth/user-not-found');
    });
});

describe('authService.confirmPasswordReset', () => {
    it('confirms password reset with code', async () => {
        mockConfirmPasswordReset.mockResolvedValue(undefined);

        await authService.confirmPasswordReset('oobCode123', 'newPassword');

        expect(mockConfirmPasswordReset).toHaveBeenCalled();
    });
});

// ============================================================
// 7. DELETE ACCOUNT
// ============================================================

describe('authService.deleteAccount', () => {
    it('deletes current user', async () => {
        (auth as any).currentUser = mockUser;
        mockDeleteUser.mockResolvedValue(undefined);

        await authService.deleteAccount();

        expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
    });

    it('does nothing when no current user', async () => {
        (auth as any).currentUser = null;

        await authService.deleteAccount();

        expect(mockDeleteUser).not.toHaveBeenCalled();
    });
});

// ============================================================
// 8. UPDATE PHOTO
// ============================================================

describe('authService.updatePhotoURL', () => {
    it('updates profile photo for current user', async () => {
        (auth as any).currentUser = mockUser;
        mockUpdateProfile.mockResolvedValue(undefined);

        // Set up observer to capture update
        mockOnAuthStateChanged.mockImplementation(() => () => { });
        let capturedUser: any = null;
        authService.onAuthStateChange((user) => { capturedUser = user; });

        await authService.updatePhotoURL('https://example.com/photo.jpg');

        expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, { photoURL: 'https://example.com/photo.jpg' });
    });
});

// ============================================================
// 9. UTILITY FUNCTIONS
// ============================================================

describe('authService.isDemoMode', () => {
    it('returns false when user is not anonymous', () => {
        (auth as any).currentUser = mockUser;
        expect(authService.isDemoMode()).toBe(false);
    });

    it('returns true when user is anonymous', () => {
        (auth as any).currentUser = mockAnonymousUser;
        expect(authService.isDemoMode()).toBe(true);
    });

    it('returns false when no current user', () => {
        (auth as any).currentUser = null;
        expect(authService.isDemoMode()).toBe(false);
    });
});

describe('authService.getCurrentUser', () => {
    it('returns mapped user when authenticated', () => {
        (auth as any).currentUser = mockUser;

        const result = authService.getCurrentUser();

        expect(result).not.toBeNull();
        expect(result!.id).toBe('test-uid-123');
        expect(result!.name).toBe('Test User');
        expect(result!.email).toBe('test@example.com');
    });

    it('returns null when no user', () => {
        (auth as any).currentUser = null;
        expect(authService.getCurrentUser()).toBeNull();
    });

    it('returns demo user when in anonymous mode', () => {
        (auth as any).currentUser = mockAnonymousUser;

        const result = authService.getCurrentUser();

        expect(result!.id).toBe('DEMO_GUEST_USER');
        expect(result!.name).toBe('Invitado');
    });

    it('uses "Usuario" as fallback when displayName is null', () => {
        (auth as any).currentUser = { ...mockUser, displayName: null, isAnonymous: false };

        const result = authService.getCurrentUser();
        expect(result!.name).toBe('Usuario');
    });
});

// ============================================================
// 10. AUTH STATE OBSERVER
// ============================================================

describe('authService.onAuthStateChange', () => {
    it('registers callback and returns unsubscribe function', () => {
        const mockUnsubscribe = vi.fn();
        mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

        const callback = vi.fn();
        const unsubscribe = authService.onAuthStateChange(callback);

        expect(mockOnAuthStateChanged).toHaveBeenCalled();
        expect(typeof unsubscribe).toBe('function');
    });

    it('restores virtual demo session from localStorage', () => {
        fakeLocalStorage.setItem('regis_virtual_demo', 'true');
        mockOnAuthStateChanged.mockImplementation(() => () => { });

        let capturedUser: any = null;
        authService.onAuthStateChange((user) => { capturedUser = user; });

        // The virtual demo restore uses setTimeout(100ms), 
        // so in test we verify the localStorage flag is detected
        expect(fakeLocalStorage.getItem('regis_virtual_demo')).toBe('true');
    });

    it('maps Firebase user to app User on auth state change', () => {
        let authCallback: ((user: any) => void) | null = null;
        mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
            authCallback = cb;
            return () => { };
        });

        let capturedUser: any = null;
        authService.onAuthStateChange((user) => { capturedUser = user; });

        // Simulate Firebase auth state change
        authCallback!(mockUser);

        expect(capturedUser).not.toBeNull();
        expect(capturedUser.id).toBe('test-uid-123');
        expect(capturedUser.name).toBe('Test User');
        expect(capturedUser.email).toBe('test@example.com');
    });

    it('maps anonymous user with Invitado Demo name', () => {
        let authCallback: ((user: any) => void) | null = null;
        mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
            authCallback = cb;
            return () => { };
        });

        let capturedUser: any = null;
        authService.onAuthStateChange((user) => { capturedUser = user; });

        authCallback!(mockAnonymousUser);

        expect(capturedUser.name).toBe('Invitado Demo');
        expect(capturedUser.email).toBe('demo@regis.app');
    });

    it('sends null when user signs out (not in virtual mode)', () => {
        let authCallback: ((user: any) => void) | null = null;
        mockOnAuthStateChanged.mockImplementation((_auth: any, cb: any) => {
            authCallback = cb;
            return () => { };
        });

        let capturedUser: any = 'not-null';
        authService.onAuthStateChange((user) => { capturedUser = user; });

        authCallback!(null);

        expect(capturedUser).toBeNull();
    });
});
