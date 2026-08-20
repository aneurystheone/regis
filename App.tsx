import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { authService } from './services/authService';
import type { User } from './types';

// Lightweight lazy imports — only loaded when needed
const LoginPage = React.lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const LandingPage = React.lazy(() => import('./pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const PrivacyPolicy = React.lazy(() => import('./pages/public/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsPage = React.lazy(() => import('./pages/public/TermsPage').then(m => ({ default: m.TermsPage })));
const ResetPasswordPage = React.lazy(() => import('./components/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Heavy authenticated app — only loaded after login
const AuthenticatedApp = React.lazy(() => import('./AuthenticatedApp'));

import { PWAInstallPrompt } from './components/PWAInstallPrompt';

// Contexts that wrap the whole app
const ConfirmationProvider = React.lazy(() => import('./contexts/ConfirmationContext').then(m => ({ default: m.ConfirmationProvider })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-600 dark:text-slate-400 font-medium">Cargando Regis...</p>
    </div>
  </div>
);

const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-full min-h-screen">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
);

// Simple toast for pre-auth pages
const useSimpleToast = () => {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: string }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const ToastDisplay = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
          t.type === 'error' ? 'bg-red-500' : t.type === 'warning' ? 'bg-amber-500' : t.type === 'info' ? 'bg-blue-500' : 'bg-green-500'
        }`}>
          {t.message}
        </div>
      ))}
    </div>
  );

  return { addToast, ToastDisplay };
};

// True when running inside the Capacitor Android/iOS shell.
// In this context, window.location.pathname is always '/' and URL-based
// routing (LandingPage, /privacy, /terms, reset-password links) is irrelevant.
const isNative = Capacitor.isNativePlatform();
const isDesktop = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [resetParams, setResetParams] = useState<{ mode: string; oobCode: string } | null>(null);
  const { addToast, ToastDisplay } = useSimpleToast();

  // Apply dark mode from localStorage immediately (prevents flash)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('teacherkit-isDarkMode');
      if (saved && JSON.parse(saved)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Check for password reset URL params.
  // Web only: Firebase email links open in the browser, not inside the Capacitor WebView.
  useEffect(() => {
    if (isNative) return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'resetPassword' && oobCode) {
      setResetParams({ mode, oobCode });
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Routing ---

  // In native (Capacitor) context: skip all URL-based routing.
  // The Docente opens the app expecting Login or the authenticated app — never a landing page.
  const renderView = () => {
    if (!isNative) {
      const path = window.location.pathname;

      if (path === '/privacy') {
        return (
          <React.Suspense fallback={<SuspenseFallback />}>
            <PrivacyPolicy />
          </React.Suspense>
        );
      }
      if (path === '/terms') {
        return (
          <React.Suspense fallback={<SuspenseFallback />}>
            <TermsPage />
          </React.Suspense>
        );
      }
    }

    if (loadingAuth) {
      return <LoadingSpinner />;
    }

    if (!isNative && resetParams) {
      return (
        <React.Suspense fallback={<SuspenseFallback />}>
          <ToastDisplay />
          <ResetPasswordPage
            oobCode={resetParams.oobCode}
            onSuccess={() => {
              setResetParams(null);
              window.history.replaceState(null, '', window.location.pathname);
            }}
            addToast={addToast}
          />
        </React.Suspense>
      );
    }

    if (!user) {
      if (isNative || isDesktop || window.location.pathname === '/login') {
        return (
          <React.Suspense fallback={<SuspenseFallback />}>
            <ToastDisplay />
            <LoginPage
              onLogin={() => Promise.resolve(false)}
              onSignUp={() => Promise.resolve(false)}
              addToast={addToast}
            />
          </React.Suspense>
        );
      }
      return (
        <React.Suspense fallback={<SuspenseFallback />}>
          <LandingPage />
        </React.Suspense>
      );
    }

    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <ConfirmationProvider>
          <AuthenticatedApp user={user} />
        </ConfirmationProvider>
      </React.Suspense>
    );
  };

  return (
    <>
      {renderView()}
      <PWAInstallPrompt />
    </>
  );
};

export default App;
