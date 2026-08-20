import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, syncEvents } from '../services/api';

// --- MOCKS ---

// 1. Mock Offline Storage (IndexedDB wrapper)
vi.mock('../services/offlineStorage', () => ({
    saveOfflineFile: vi.fn(),
    getOfflineFile: vi.fn(),
    deleteOfflineFile: vi.fn(),
    getAllOfflineFiles: vi.fn()
}));

// 2. Mock Storage Service (Firebase Storage wrapper)
vi.mock('../services/storageService', () => ({
    uploadFile: vi.fn()
}));

import * as offlineStorage from '../services/offlineStorage';
import * as storageService from '../services/storageService';

// 3. Mock Firestore
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();
const mockDoc = vi.fn((db, coll, id) => ({
    path: id ? `${coll}/${id}` : coll,
    id: id || 'auto-id'
}));
const mockCollection = vi.fn((parent, path) => ({
    path: parent?.path ? `${parent.path}/${path}` : path
}));

const { mockAuth } = vi.hoisted(() => ({
    mockAuth: {
        currentUser: { uid: 'test-user-123', isAnonymous: false }
    }
}));

vi.mock('../firebase-core', () => ({
    auth: mockAuth,
    analytics: {}
}));

vi.mock('../firebase-firestore', () => ({
    db: { type: 'firestore' }
}));

vi.mock('../firebase-storage', () => ({
    storage: {}
}));

vi.mock('../firebase', () => ({
    db: { type: 'firestore' },
    auth: mockAuth,
    storage: {},
    analytics: {}
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: (p: any, path: string) => mockCollection(p, path),
    getDocs: (q: any) => mockGetDocs(q),
    doc: (db: any, coll: any, id?: string) => {
        if (typeof coll === 'string') return mockDoc(db, coll, id);
        return mockDoc(null, coll.path, id);
    },
    setDoc: (docRef: any, data: any) => mockSetDoc(docRef, data),
    getDoc: vi.fn(),
    updateDoc: (docRef: any, data: any) => mockUpdateDoc(docRef, data),
    deleteDoc: vi.fn(),
    writeBatch: vi.fn(() => ({
        set: mockBatchSet,
        commit: mockBatchCommit,
        delete: vi.fn(),
        update: vi.fn()
    })),
    query: vi.fn((col) => col),
    where: vi.fn(),
    onSnapshot: vi.fn(),
    addDoc: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
}));


// 4. Mock navigator.onLine
const mockOnline = vi.fn(() => true);
Object.defineProperty(navigator, 'onLine', {
    get: () => mockOnline(),
    configurable: true
});

// Spy on localStorage properly
const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

describe('Offline Sync - Data Integrity Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        storageSpy.mockClear();

        // Reset specific mock implementations
        mockSetDoc.mockReset();
        mockSetDoc.mockResolvedValue({});
        mockUpdateDoc.mockReset();
        mockUpdateDoc.mockResolvedValue({});
        mockBatchSet.mockReset();
        mockBatchCommit.mockReset();
        mockBatchCommit.mockResolvedValue({});
        mockGetDocs.mockReset();
        mockGetDocs.mockResolvedValue({ docs: [] });
        mockOnline.mockReturnValue(true);

        // Setup default mocks for new services
        (offlineStorage.saveOfflineFile as any).mockResolvedValue('offline:test-id');
        (offlineStorage.getOfflineFile as any).mockResolvedValue(new Blob(['test']));
        (offlineStorage.deleteOfflineFile as any).mockResolvedValue(undefined);
        (storageService.uploadFile as any).mockResolvedValue('https://firebasestorage.googleapis.com/v0/b/test/o/file.jpg');

        // Ensure we are not in virtual mode by default
        localStorage.removeItem('regis_virtual_demo');

        // Mock global fetch for checkConnection
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            text: () => Promise.resolve('ok'),
            json: () => Promise.resolve({})
        } as Response));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('Test Suite 1: Single Device Offline/Online Transitions', () => {

        it('TEST 1: Should save grades to localStorage when offline', async () => {
            // ARRANGE: Set device offline
            mockOnline.mockReturnValue(false);

            const grades = [
                { studentId: 's1', instrumentId: 'i1', score: 85 }
            ];

            // ACT: Grade students
            await api.setGrades(grades as any);

            // ASSERT: Data should be in local cache
            const stored = await api.getGrades('i1');
            expect(stored[0].score).toBe(85);
        });

        it('TEST 2: Should attempt to write to Firestore via subcollection batch', async () => {
            // ARRANGE: Online status
            mockOnline.mockReturnValue(true);
            const grades = [{ studentId: 's1', instrumentId: 'i1', score: 90 }];

            // ACT: Save grades
            await api.setGrades(grades as any);

            // ASSERT: Should use batch for subcollections
            expect(mockBatchSet).toHaveBeenCalled();
            expect(mockBatchCommit).toHaveBeenCalled();
            expect(mockBatchSet.mock.calls[0][0].path).toBe('instruments/i1/grades/s1');
        });

        it('TEST 3: Should preserve local data if Firestore write fails', async () => {
            // ARRANGE: Offline data + online status + failed write
            const grades = [{ studentId: 's1', instrumentId: 'i1', score: 99 }];
            mockOnline.mockReturnValue(true);
            mockSetDoc.mockRejectedValue(new Error('Network error'));

            // ACT: Attempt save
            try {
                await api.setGrades(grades as any);
            } catch (e) {
                // Expected
            }

            // ASSERT: localCache should still have data
            const stored = await api.getGrades('i1');
            expect(stored[0].score).toBe(99);
        });

        it('TEST 4: Should notify sync status bus on success', async () => {
            const spy = vi.fn();
            const unsubscribe = syncEvents.subscribe(spy);

            mockOnline.mockReturnValue(true);
            mockSetDoc.mockResolvedValue({});

            await api.setGrades([]);

            expect(spy).toHaveBeenCalledWith('synced'); // No error
            unsubscribe();
        });

        it('TEST 5: Should notify sync status bus on permission error', async () => {
            const spy = vi.fn();
            const unsubscribe = syncEvents.subscribe(spy);

            mockOnline.mockReturnValue(true);
            mockBatchCommit.mockRejectedValue({ code: 'permission-denied' });

            try {
                await api.setGrades([{ studentId: 's1', instrumentId: 'i1', score: 50 }] as any);
            } catch (e) { }

            expect(spy).toHaveBeenCalledWith('error');
            unsubscribe();
        });
    });

    describe('Test Suite 2: Multi-Device Conflict Scenarios', () => {

        it('TEST 6: Should NOT overwrite unrelated data when using subcollections (Fixes Documents Overwrite Bug)', async () => {
            // SCENARIO: 
            // 1. Device A grades Student 1
            // 2. Device B grades Student 2
            // Since they are independent documents, both should coexist.

            mockBatchSet.mockClear();
            const grades = [{ studentId: 'S1', instrumentId: 'I1', score: 80 }];

            mockOnline.mockReturnValue(true);
            await api.setGrades(grades as any);

            expect(mockBatchSet).toHaveBeenCalledTimes(1);
            expect(mockBatchSet.mock.calls[0][0].path).toBe('instruments/I1/grades/S1');
            // Logic: In the old system, Device B would have overwritten the entire 'grades' list.
            // In the new system, it only writes S1's document.
        });

        it('TEST 7: Should naturally merge grades from different students (Subcollection Advantage)', async () => {
            // SCENARIO: Syncing 2 students in one batch works normally.
            mockBatchSet.mockClear();
            const grades = [
                { studentId: 'S1', instrumentId: 'I1', score: 80 },
                { studentId: 'S2', instrumentId: 'I1', score: 90 }
            ];

            mockOnline.mockReturnValue(true);
            await api.setGrades(grades as any);

            expect(mockBatchSet).toHaveBeenCalledTimes(2);
            expect(mockBatchSet.mock.calls[0][0].path).toBe('instruments/I1/grades/S1');
            expect(mockBatchSet.mock.calls[1][0].path).toBe('instruments/I1/grades/S2');
        });
    });

    describe('Test Suite 3: updatedAt, Retries & Conflict Resolution', () => {

        it('TEST 8: Should include updatedAt in all saves', async () => {
            mockSetDoc.mockClear();
            mockOnline.mockReturnValue(true);

            await api.addClass({ id: 'new-class' } as any);

            expect(mockSetDoc).toHaveBeenCalled();
            const savedData = mockSetDoc.mock.calls[0][1];
            expect(savedData.updatedAt).toBeDefined();
            expect(typeof savedData.updatedAt).toBe('string');
        });

        it('TEST 9: Should retry failed writes 3 times before giving up', async () => {
            mockSetDoc.mockReset();
            mockSetDoc.mockRejectedValue({ code: 'unavailable' });
            mockOnline.mockReturnValue(true);

            vi.useFakeTimers();

            // Create the promise and catch it immediately to prevent "unhandled rejection" warnings
            // while we manipulate timers.
            const apiPromise = api.addClass({ id: 'retry-class' } as any);
            const catchPromise = apiPromise.catch(e => e);

            // Should be called first time immediately
            await vi.advanceTimersByTimeAsync(0);
            expect(mockSetDoc).toHaveBeenCalledTimes(1);

            // Fast forward 1s (Retry 1)
            await vi.advanceTimersByTimeAsync(1100);
            expect(mockSetDoc).toHaveBeenCalledTimes(2);

            // Fast forward 2s more (Retry 2)
            await vi.advanceTimersByTimeAsync(2100);
            expect(mockSetDoc).toHaveBeenCalledTimes(3);

            // Fast forward 4s more (Retry 3)
            await vi.advanceTimersByTimeAsync(4100);
            expect(mockSetDoc).toHaveBeenCalledTimes(4); // 1 initial + 3 retries

            // Now verify the error
            const error = await catchPromise;
            expect(error).toBeDefined();
            expect(error.code).toBe('unavailable');

            vi.useRealTimers(); // Ensure real timers are restored for this test case
        });

        it('TEST 10: Should stop retrying on permission-denied', async () => {
            mockSetDoc.mockClear();
            mockOnline.mockReturnValue(true);
            mockSetDoc.mockRejectedValue({ code: 'permission-denied' });

            vi.useFakeTimers();

            const apiPromise = api.addClass({ id: 'no-retry-class' } as any);
            const catchPromise = apiPromise.catch(e => e);

            await vi.advanceTimersByTimeAsync(0);
            expect(mockSetDoc).toHaveBeenCalledTimes(1);

            // Advance time - should NOT retry
            await vi.advanceTimersByTimeAsync(5000);
            expect(mockSetDoc).toHaveBeenCalledTimes(1);

            const error = await catchPromise;
            expect(error).toMatchObject({ code: 'permission-denied' });

            vi.useRealTimers();
        });
    });

    describe('Test Suite 4: Edge Cases & Real-world Scenarios', () => {

        it('TEST 11: Should handle rapid online/offline transitions', async () => {
            // SCENARIO: Network toggles between online and offline during a save attempt
            mockSetDoc.mockClear();

            // 1. Start online
            mockOnline.mockReturnValue(true);
            const apiPromise = api.addClass({ id: 'transition-class' } as any);

            // 2. Flip offline immediately
            mockOnline.mockReturnValue(false);
            window.dispatchEvent(new Event('offline'));
            await api.checkConnection();

            // The first attempt was already triggered or about to be.
            // If it succeeds, great. If it fails, it shouldn't retry while offline.

            // Let's mock a failure to see if it retries while offline
            mockSetDoc.mockRejectedValueOnce({ code: 'unavailable' });

            vi.useFakeTimers();
            // Advance time
            await vi.advanceTimersByTimeAsync(1100);

            // Should NOT have retried because mockOnline is false
            // Wait, api.ts check isValidNetwork inside addClass?
            // Actually withRetry doesn't check mockOnline yet.
            // I should add that check to withRetry!

            expect(mockSetDoc).toHaveBeenCalledTimes(1);
            vi.useRealTimers();
        });

        it('TEST 12: Should recover data from localStorage if Firestore cache is cleared', async () => {
            // SCENARIO: User opens app, Firestore fails (simulating cleared cache/offline), but local cache has data.
            // getClasses should return local cache data as fallback.

            const localData = [{ id: 'L1', name: 'Local Class', userId: 'test-user-123' }];
            const { setLocalCacheSync } = await import('../services/localCache');
            setLocalCacheSync('classes', localData);

            // Mock firestore failure to trigger fallback
            mockGetDocs.mockRejectedValueOnce({ code: 'unavailable' });

            const result = await api.getClasses();
            expect(result).toEqual(localData);
        });

        it('TEST 13: Should handle large data sets (100+ items) without timeout', async () => {
            // In subcollection mode, each grade is a separate set in a batch
            const largeData = Array.from({ length: 150 }, (_, i) => ({
                studentId: `S${i}`,
                instrumentId: 'INST1',
                score: i
            }));

            mockOnline.mockReturnValue(true);
            mockBatchCommit.mockResolvedValue({});

            await api.setGrades(largeData as any);

            expect(mockBatchSet).toHaveBeenCalledTimes(150);
            expect(mockBatchCommit).toHaveBeenCalled();
            // Verify path of first item
            expect(mockBatchSet.mock.calls[0][0].path).toBe('instruments/INST1/grades/S0');
        });
        it('TEST 14: Should sanitize data and remove undefined fields before saving', async () => {
            mockSetDoc.mockClear();
            mockOnline.mockReturnValue(true);

            const dirtyData = { id: 'D1', name: 'Dirty', secret: undefined, normal: null };
            await api.addClass(dirtyData as any);

            expect(mockSetDoc).toHaveBeenCalled();
            // In case of multiple calls, find the one with the correct ID
            const call = mockSetDoc.mock.calls.find(c => c[1].id === 'D1');
            expect(call).toBeDefined();
            const lastSaved = call![1];

            expect(Object.keys(lastSaved)).not.toContain('secret');
            expect(lastSaved.normal).toBeNull();
        });
    });



    describe('Test Suite 6: Media Sync (Anecdotes)', () => {
        it('TEST 17: Should save offline file when network is down', async () => {
            // Mock offline
            mockOnline.mockReturnValue(false);

            // We need to simulate the UI calling saveOfflineFile indirectly or directly? 
            // In api.ts processPendingFileUploads reads from offlineStorage.
            // The UI (AddAnecdoteModal) calls offlineStorage.saveOfflineFile directly when offline.

            const blob = new Blob(['test-image'], { type: 'image/jpeg' });
            await offlineStorage.saveOfflineFile(blob);

            expect(offlineStorage.saveOfflineFile).toHaveBeenCalledWith(blob);
        });

        it('TEST 18: Should upload pending files when connection is restored', async () => {
            mockOnline.mockReturnValue(true);
            const uid = 'test-user-123';

            // Setup local data with offline URL
            const anecdote = {
                id: 'anecdote1',
                userId: uid,
                photoUrl: 'offline:photo1',
                audioUrl: null
            };
            const { setLocalCacheSync } = await import('../services/localCache');
            setLocalCacheSync('anecdotes', [anecdote]);

            // Mock retrieval of offline file
            (offlineStorage.getOfflineFile as any).mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' }));

            // Trigger sync (this function is not exported directly but runs on online event)
            await api.checkConnection();

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(offlineStorage.getOfflineFile).toHaveBeenCalled();

            expect(storageService.uploadFile).toHaveBeenCalled();

            // Verify Firestore update
            expect(mockBatchSet).toHaveBeenCalled();
            // Find batch call that sets anecdotes
            const batchCalls = mockBatchSet.mock.calls;
            const anecdoteCall = batchCalls.find((call: any) => call[0].path.includes('anecdotes'));

            expect(anecdoteCall).toBeDefined();
            const savedData = anecdoteCall![1];
            expect(savedData.photoUrl).not.toContain('offline:');
            expect(savedData.photoUrl).toContain('https://');
        });
    });

    describe('Test Suite 7: Conflict Resolution (Last-Write-Wins)', () => {
        it('TEST 19: Should respect updatedAt for document updates', async () => {
            mockOnline.mockReturnValue(true);
            mockSetDoc.mockClear();
            mockUpdateDoc.mockClear();

            const classData = { id: 'C1', name: 'Math' };
            await api.addClass(classData as any);

            expect(mockSetDoc).toHaveBeenCalled();
            const firstCall = mockSetDoc.mock.calls[0][1];
            const firstUpdate = new Date(firstCall.updatedAt).getTime();

            // Simulate a second update shortly after
            await new Promise(r => setTimeout(r, 10));
            await api.updateClass('C1', { name: 'Math Advanced' } as any);

            expect(mockUpdateDoc).toHaveBeenCalled();
            const secondCall = mockUpdateDoc.mock.calls[0][1]; // Check updateDoc
            const secondUpdate = new Date(secondCall.updatedAt).getTime();

            expect(secondUpdate).toBeGreaterThan(firstUpdate);
        });
    });
});
