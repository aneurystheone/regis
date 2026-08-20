import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  // Check standalone mode (PWA installed and running as standalone app)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(Boolean(isStandaloneApp));
  }, []);

  // Listen to beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Online / Offline listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker Registration & Update detection using vite-plugin-pwa registerSW
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Dynamically import virtual module or register service worker if available
    let updateInterval: number | undefined;

    const registerPWA = async () => {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        const updateSW = registerSW({
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            setOfflineReady(true);
          },
          onRegisterError(error) {
            console.warn('Service Worker registration error:', error);
          }
        });

        // Periodically check for SW updates (every 1 hour)
        updateInterval = window.setInterval(() => {
          updateSW(true);
        }, 60 * 60 * 1000);
      } catch (err) {
        // virtual:pwa-register may not be present in non-vite production context
        console.warn('PWA registration skipped or unsupported in this build:', err);
      }
    };

    registerPWA();

    return () => {
      if (updateInterval) clearInterval(updateInterval);
    };
  }, []);

  // Trigger PWA install dialog
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
    } catch (error) {
      console.error('PWA installation error:', error);
    }
    return false;
  }, [deferredPrompt]);

  // Trigger app reload to activate new Service Worker
  const updateServiceWorker = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const dismissInstallPrompt = useCallback(() => {
    setIsInstallable(false);
  }, []);

  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, []);

  return {
    isInstallable,
    isStandalone,
    isOffline,
    needRefresh,
    offlineReady,
    installApp,
    updateServiceWorker,
    dismissInstallPrompt,
    dismissOfflineReady
  };
}
