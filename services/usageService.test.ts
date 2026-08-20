/**
 * Unit Tests for usageService.ts
 * 
 * Tests usage session tracking, device info, performance metrics,
 * and analytics event logging.
 * Firebase Firestore and Analytics are fully mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock Firebase ---
const { mockSetDoc, mockAddDoc, mockLogEvent } = vi.hoisted(() => ({
    mockSetDoc: vi.fn(() => Promise.resolve()),
    mockAddDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
    mockLogEvent: vi.fn(),
}));

vi.mock('../firebase-core', () => ({
    analytics: { type: 'mock-analytics' },
    auth: { currentUser: { uid: 'test-user-123' } }
}));

vi.mock('../firebase-firestore', () => ({
    db: { type: 'mock-firestore' },
}));

vi.mock('../firebase', () => ({
    db: { type: 'mock-firestore' },
    analytics: { type: 'mock-analytics' },
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    setDoc: mockSetDoc,
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
    Timestamp: { now: vi.fn() },
    arrayUnion: vi.fn((val: string) => `ARRAY_UNION:${val}`),
    collection: vi.fn(),
    addDoc: mockAddDoc,
}));

vi.mock('firebase/analytics', () => ({
    logEvent: (...args: any[]) => mockLogEvent(...args),
}));

// Mock api exports
vi.mock('./api', () => ({
    getCurrentUserId: vi.fn(() => 'test-user-123'),
    isVirtualMode: vi.fn(() => false),
}));

import { useUsageSession } from './usageService';
import { getCurrentUserId, isVirtualMode } from './api';

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// 1. logSession
// ============================================================

describe('useUsageSession.logSession', () => {
    it('logs session to Firestore and Analytics', async () => {
        const originalSetTimeout = global.setTimeout;
        // @ts-ignore
        global.setTimeout = (fn: any) => fn();
        
        const { logSession } = useUsageSession();

        await logSession('attendance');

        expect(mockLogEvent).toHaveBeenCalledWith(
            expect.anything(), // analytics
            'core_flow_completed',
            { flow: 'attendance' }
        );
        expect(mockSetDoc).toHaveBeenCalled();
        
        global.setTimeout = originalSetTimeout;
    });

    it('does nothing when in virtual mode', async () => {
        (isVirtualMode as any).mockReturnValue(true);

        const { logSession } = useUsageSession();
        await logSession('grades');

        expect(mockSetDoc).not.toHaveBeenCalled();
        expect(mockLogEvent).not.toHaveBeenCalled();

        // Restore
        (isVirtualMode as any).mockReturnValue(false);
    });

    it('does nothing when no user ID', async () => {
        (getCurrentUserId as any).mockReturnValue(null);

        const { logSession } = useUsageSession();
        await logSession('students');

        expect(mockSetDoc).not.toHaveBeenCalled();

        // Restore
        (getCurrentUserId as any).mockReturnValue('test-user-123');
    });

    it('handles Firestore errors gracefully', async () => {
        const originalSetTimeout = global.setTimeout;
        // @ts-ignore
        global.setTimeout = (fn: any) => fn();

        mockSetDoc.mockRejectedValueOnce(new Error('permission-denied'));

        const { logSession } = useUsageSession();

        // Should not throw
        await expect(logSession('classes')).resolves.not.toThrow();
        
        global.setTimeout = originalSetTimeout;
    });
});

// ============================================================
// 2. logOrphanWriteAttempt
// ============================================================

describe('useUsageSession.logOrphanWriteAttempt', () => {
    it('logs orphan write to system_logs collection', async () => {
        const { logOrphanWriteAttempt } = useUsageSession();

        await logOrphanWriteAttempt('saveGrade');

        expect(mockAddDoc).toHaveBeenCalled();
    });

    it('skips in virtual mode', async () => {
        (isVirtualMode as any).mockReturnValue(true);

        const { logOrphanWriteAttempt } = useUsageSession();
        await logOrphanWriteAttempt('test');

        expect(mockAddDoc).not.toHaveBeenCalled();

        (isVirtualMode as any).mockReturnValue(false);
    });
});

// ============================================================
// 3. Performance Timers
// ============================================================

describe('useUsageSession performance timers', () => {
    it('startPerformanceTimer and endPerformanceTimer measure duration', async () => {
        const { startPerformanceTimer, endPerformanceTimer } = useUsageSession();

        startPerformanceTimer('test-operation');

        // Small delay to ensure measurable time difference
        await new Promise(r => setTimeout(r, 10));

        await endPerformanceTimer('test-operation');

        // Analytics logEvent should have been called for the metric
        expect(mockLogEvent).toHaveBeenCalledWith(
            expect.anything(),
            'performance_timer',
            expect.objectContaining({ name: 'test-operation' })
        );
    });

    it('endPerformanceTimer does nothing if timer was not started', async () => {
        const { endPerformanceTimer } = useUsageSession();

        await endPerformanceTimer('nonexistent');

        expect(mockLogEvent).not.toHaveBeenCalled();
    });
});

// ============================================================
// 4. logMetric
// ============================================================

describe('useUsageSession.logMetric', () => {
    it('logs metric to Analytics', async () => {
        const { logMetric } = useUsageSession();

        await logMetric('page_load', 1500, { page: 'dashboard' });

        expect(mockLogEvent).toHaveBeenCalledWith(
            expect.anything(),
            'page_load',
            expect.objectContaining({ value: 1500, page: 'dashboard' })
        );
    });

    it('logs to system_logs when sync_duration exceeds 10s', async () => {
        const { logMetric } = useUsageSession();

        await logMetric('sync_duration', 15000, { reason: 'large_data' });

        // Should log to both Analytics AND system_logs (performance alert)
        expect(mockLogEvent).toHaveBeenCalled();
        expect(mockAddDoc).toHaveBeenCalled();
    });

    it('does not log performance alert for sync_duration under 10s', async () => {
        const { logMetric } = useUsageSession();

        await logMetric('sync_duration', 5000);

        expect(mockLogEvent).toHaveBeenCalled();
        expect(mockAddDoc).not.toHaveBeenCalled(); // No alert
    });
});

// ============================================================
// 5. trackLogin
// ============================================================

describe('useUsageSession.trackLogin', () => {
    it('logs login_success and open_app events', async () => {
        const { trackLogin } = useUsageSession();

        await trackLogin();

        expect(mockLogEvent).toHaveBeenCalledWith(expect.anything(), 'login_success');
        expect(mockLogEvent).toHaveBeenCalledWith(expect.anything(), 'open_app');
    });

    it('skips in virtual mode', async () => {
        (isVirtualMode as any).mockReturnValue(true);

        const { trackLogin } = useUsageSession();
        await trackLogin();

        expect(mockLogEvent).not.toHaveBeenCalled();

        (isVirtualMode as any).mockReturnValue(false);
    });
});
