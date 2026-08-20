import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const useAndroidBackButton = (onBack: () => boolean) => {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('backButton', () => {
      const handled = onBackRef.current();
      if (!handled) {
        App.exitApp();
      }
    });

    return () => {
      listener.then(handle => handle.remove());
    };
  }, []);
};
