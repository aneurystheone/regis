import { analytics } from '../firebase-core';
import { logEvent } from 'firebase/analytics';
import { authService } from './authService';

export const trackLoginEvent = async () => {
    try {
        const uid = authService.getCurrentUser()?.id;
        if (!uid || authService.isDemoMode()) return;

        if (analytics) {
            logEvent(analytics, 'login_success');
            logEvent(analytics, 'open_app');
        }
    } catch (e) {
        // Ignore analytics errors
    }
};

export const trackCustomEvent = async (eventName: string, params?: Record<string, any>) => {
    try {
        const uid = authService.getCurrentUser()?.id;
        if (!uid || authService.isDemoMode()) return;

        if (analytics) {
            logEvent(analytics, eventName, params);
        }
    } catch (e) {
        // Ignore
    }
};
