import { db } from '../firebase-firestore';
import { analytics } from '../firebase-core';
import { doc, setDoc, serverTimestamp, Timestamp, arrayUnion, collection, addDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { getCurrentUserId, isVirtualMode } from './api';

export interface UsageSession {
    userId: string;
    date: string; // YYYY-MM-DD
    flowsUsed: string[]; // Set of flows used today
    onboardingStatus?: {
        step: string;
        completed: boolean;
        updatedAt: any;
    };
    offline: boolean;

    assisted: boolean;
    appVersion: string;
    deviceInfo: any;
    createdAt?: Timestamp | any;
    lastUpdated?: Timestamp | any;
}

const getDeviceInfo = () => {
    if (typeof navigator === 'undefined') return {};
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        vendor: navigator.vendor,
        screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown'
    };
};

const getAppVersion = () => {
    try {
        // @ts-ignore
        return __APP_VERSION__;
    } catch {
        return 'unknown';
    }
};

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Hook/Service to track usage sessions.
 * Writes to `usage_sessions/{userId}_{date}` idempotently.
 */
export const useUsageSession = () => {

    // Local cache for debouncing session writes
    const cachedFlows = new Set<string>();
    let syncTimeout: NodeJS.Timeout | null = null;

    const logSession = async (flow: "attendance" | "grades" | "reports" | "students" | "classes" | "instruments" | "anecdotes" | "competencies" | "onboarding" | "login") => {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return;

        // 1. Firebase Analytics (Best Effort)
        if (analytics) {
            logEvent(analytics, 'core_flow_completed', { flow });
        }

        cachedFlows.add(flow);

        // Debounce Firestore writes (batch flows every 10 seconds to avoid spamming)
        if (syncTimeout) clearTimeout(syncTimeout);

        syncTimeout = setTimeout(async () => {
            const date = getTodayDateString();
            const sessionId = `${uid}_${date}`;
            const sessionRef = doc(db, 'usage_sessions', sessionId);

            // Copy and clear cache for this sync cycle
            const flowsToSync = Array.from(cachedFlows);
            cachedFlows.clear();

            try {
                // Ensure createdAt is not overwritten on updates
                await setDoc(sessionRef, {
                    userId: uid,
                    date: date,
                    flowsUsed: arrayUnion(...flowsToSync),
                    offline: !navigator.onLine,
                    appVersion: getAppVersion(),
                    deviceInfo: getDeviceInfo(),
                    lastUpdated: serverTimestamp()
                }, { merge: true });

                // Add createdAt only if we haven't recorded logic yet today locally
                // Using setDoc with merge doesn't natively "set if missing" for a specific field easily without getDoc,
                // but since we only care about first write of the day ideally, we can use a local flag.
                const localKey = `regis_session_created_${sessionId}`;
                if (!localStorage.getItem(localKey)) {
                    await setDoc(sessionRef, { createdAt: serverTimestamp() }, { merge: true });
                    localStorage.setItem(localKey, 'true');
                }
            } catch (error) {
                console.error("Error logging usage session:", error);
                // Put back in cache if failed (simple retry strategy)
                flowsToSync.forEach(f => cachedFlows.add(f));
            }
        }, 10000); // 10 second debounce
    };

    const logOrphanWriteAttempt = async (context: string) => {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return;

        console.warn(`[METRICS] Orphan write attempt detected in: ${context}`);

        try {
            await addDoc(collection(db, 'system_logs'), {
                type: 'ORPHAN_WRITE_ATTEMPT',
                userId: uid,
                context,
                appVersion: getAppVersion(),
                deviceInfo: getDeviceInfo(),
                timestamp: serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to log orphan write:", e);
        }
    };

    const performanceTimers = new Map<string, number>();

    const startPerformanceTimer = (name: string) => {
        performanceTimers.set(name, performance.now());
    };

    const endPerformanceTimer = async (name: string) => {
        const start = performanceTimers.get(name);
        if (!start) return;

        const duration = performance.now() - start;
        performanceTimers.delete(name);

        await logMetric('performance_timer', duration, { name });
    };

    const logMetric = async (name: string, value: number, metadata: any = {}) => {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return;

        // Log to Analytics
        if (analytics) {
            logEvent(analytics, name, { value, ...metadata });
        }

        // Optional: Log purely performance metrics to a separate collection if needed?
        // For now, analytics is sufficient for performance numbers.
        // If "critical", log to system_logs.
        if (name === 'sync_duration' && value > 10000) {
            // Slow sync?
            try {
                await addDoc(collection(db, 'system_logs'), {
                    type: 'PERFORMANCE_ALERT',
                    metric: name,
                    value,
                    metadata,
                    userId: uid,
                    timestamp: serverTimestamp()
                });
            } catch { }
        }
    };

    const logOnboardingStep = async (step: string, completed: boolean = false, data: any = {}) => {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return;

        const date = getTodayDateString();
        const sessionId = `${uid}_${date}`;
        const sessionRef = doc(db, 'usage_sessions', sessionId);

        try {
            if (analytics) {
                logEvent(analytics, 'onboarding_progress', { step, completed, ...data });
                if (completed) logEvent(analytics, 'onboarding_complete');
            }

            await setDoc(sessionRef, {
                onboardingStatus: {
                    step,
                    completed,
                    updatedAt: serverTimestamp()
                },
                lastUpdated: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error logging onboarding progress:", error);
        }
    };

    const trackLogin = async () => {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return;

        if (analytics) {
            logEvent(analytics, 'login_success');
            logEvent(analytics, 'open_app');
        }
        await logSession('login');
    };

    return { logSession, trackLogin, logOrphanWriteAttempt, logMetric, startPerformanceTimer, endPerformanceTimer, logOnboardingStep };
};

export const logAiAssistance = async (toolName: string) => {
    const uid = getCurrentUserId();
    if (!uid || isVirtualMode()) return;

    if (analytics) {
        logEvent(analytics, 'ai_assistance_used', { tool: toolName });
    }

    const date = getTodayDateString();
    const sessionId = `${uid}_${date}`;

    try {
        await setDoc(doc(db, 'usage_sessions', sessionId), {
            userId: uid,
            date: date,
            assisted: true,
            lastUpdated: serverTimestamp()
        }, { merge: true });
    } catch (e) { console.error("Error logging AI assistance:", e); }
};

export const logAiError = async (context: string, error: any, metadata: Record<string, any> = {}) => {
    const uid = getCurrentUserId();
    if (analytics) {
        try {
            logEvent(analytics, 'ai_error', {
                context,
                errorMessage: error?.message || String(error),
                errorCode: error?.code || 'UNKNOWN_ERROR',
                ...metadata
            });
        } catch { }
    }

    try {
        await addDoc(collection(db, 'system_logs'), {
            type: 'AI_ERROR',
            context,
            errorMessage: error?.message || String(error),
            errorCode: error?.code || 'UNKNOWN_ERROR',
            stack: error?.stack || null,
            userId: uid || 'anonymous',
            appVersion: getAppVersion(),
            deviceInfo: getDeviceInfo(),
            metadata,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log AI error telemetry:", e);
    }
};
