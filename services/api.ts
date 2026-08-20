
import { auth, analytics } from '../firebase-core';
import { db } from '../firebase-firestore';
import { storage } from '../firebase-storage';
import * as mockData from './mockData';
import { uploadFile } from './storageService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getOfflineFile, deleteOfflineFile } from './offlineStorage';
import {
    collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
    query, where, orderBy, limit, writeBatch, serverTimestamp,
    enableIndexedDbPersistence, onSnapshot, Unsubscribe, deleteField,
    collectionGroup, Timestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import type {
    Class, Student, AttendanceRecord, DailyNote, AnecdotalRecord,
    EvaluationInstrument, Grade, GradeDocument,
    Competency, CompetencyGroup,
    RecoveryGrade, UserSubscription, User, TeacherProfileData,
    JournalEntry, Resource, CustomEvent, AIFeatures, LessonPlan,
    StudentAcademicSummary, GradeSummary, CurriculumData,
    FundamentalCompetency, FontSize, SchoolGroup, WorkTeam
} from '../types';
import { getAuth, User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { calculateAcademicSummary, getCompetencyGroup } from './gradeHelpers';
import { generateReferralCode, validateReferralCodeFormat, calculateRewardExtension } from './referralHelpers';
import { CURRENT_SCHEMA_VERSION } from '../types';
import * as curriculumService from './curriculumService';
import { generateId } from '@/utils';

let curriculumCache: CurriculumData | null = null;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// Bus de eventos simple para notificar estados de sincronización
export const syncEvents = {
    status: 'idle' as SyncStatus,
    listeners: [] as ((status: SyncStatus) => void)[],
    subscribe(callback: (status: SyncStatus) => void) {
        this.listeners.push(callback);
        // Notify current state to new subscriber
        callback(this.status);
        return () => { this.listeners = this.listeners.filter(l => l !== callback); };
    },
    notify(status: SyncStatus) {
        this.status = status;
        this.listeners.forEach(l => l(status));
    }
};

const COLLECTIONS = {
    USERS: 'users',
    CLASSES: 'classes',
    STUDENTS: 'students',
    DELETED_STUDENTS: 'deleted_students',
    DELETED_CLASSES: 'deleted_classes',
    INSTRUMENTS: 'instruments',
    ANECDOTES: 'anecdotes',
    USER_COMPETENCIES: 'user_competencies',
    FUNDAMENTAL_COMPETENCIES: 'fundamental_competencies',
    TEACHER_PROFILE: 'teacher_profile',
    JOURNAL: 'journal',
    RESOURCES: 'resources',
    CUSTOM_EVENTS: 'custom_events',
    LISTS: 'lists',
    LESSON_PLANS: 'lesson_plans',
    APP_CONFIG: 'app_config',
    GRADES: 'grades',
    ATTENDANCE: 'attendance',
    SUBSCRIPTIONS: 'subscriptions',
    SYSTEM_LOGS: 'system_logs',
    SCHOOL_GROUPS: 'school_groups',
    TEAMS: 'teams'
};

/**
 * Feature flag: Subcollection model for grades
 * DEPRECATED: Subcollection is now the only supported mode.
 */



/**
 * Get path to grades subcollection for an instrument
 */
const getGradesCollectionPath = (instrumentId: string) =>
    `${COLLECTIONS.INSTRUMENTS}/${instrumentId}/grades`;

/**
 * Get path to specific grade document
 */
const getGradeDocPath = (instrumentId: string, studentId: string) =>
    `${getGradesCollectionPath(instrumentId)}/${studentId}`;

const mockFundamentalCompetencies: FundamentalCompetency[] = [
    { id: 'FC1', name: 'Comunicativa', description: 'Expresa e interpreta conceptos, pensamientos, sentimientos y hechos de forma oral y escrita.', group: 'G1' },
    { id: 'FC2', name: 'Pensamiento Lógico, Creativo y Crítico', description: 'Elabora y argumenta sus juicios y opiniones, y aborda la realidad de forma reflexiva.', group: 'G2' },
    { id: 'FC3', name: 'Resolución de Problemas', description: 'Identifica y analiza problemas para generar soluciones efectivas y pertinentes.', group: 'G2' },
    { id: 'FC4', name: 'Ética y Ciudadana', description: 'Actúa con autonomía, responsabilidad y respeto a los principios éticos y democráticos.', group: 'G3' },
    { id: 'FC5', name: 'Científica y Tecnológica', description: 'Aplica el conocimiento científico y tecnológico para comprender y transformar la realidad.', group: 'G4' },
    { id: 'FC6', name: 'Ambiental y de la Salud', description: 'Adopta hábitos de vida saludable y actúa con responsabilidad ante el medio ambiente.', group: 'G4' },
    { id: 'FC7', name: 'Desarrollo Personal y Espiritual', description: 'Desarrolla una autoimagen equilibrada y una relación sana consigo mismo y con los demás.', group: 'G3' },
];

const defaultTeacherProfile: TeacherProfileData = { name: 'Usuario', email: 'usuario@example.com', phone: '', specialization: 'Educación', experienceYears: 0, profilePictureUrl: 'https://ui-avatars.com/api/?name=User&background=random', regional: '', district: '', schoolName: '', schoolId: '', schoolCode: '' };

export const isVirtualMode = () => localStorage.getItem('regis_virtual_demo') === 'true' || !auth?.currentUser || auth.currentUser.isAnonymous;

const localListeners: Record<string, ((data: any) => void)[]> = {};

const subscribeToLocal = (key: string, callback: (data: any) => void) => {
    if (!localListeners[key]) localListeners[key] = [];
    localListeners[key].push(callback);
    return () => {
        localListeners[key] = localListeners[key].filter(cb => cb !== callback);
    };
};

const notifyLocalChange = (key: string, data: any) => {
    if (localListeners[key]) {
        localListeners[key].forEach(cb => cb(data));
    }
};

import { getLocalCacheSync, setLocalCacheSync } from './localCache';

const getLocal = <T>(key: string): T[] => {
    return getLocalCacheSync<T>(key);
};

const setLocal = (key: string, data: any) => {
    setLocalCacheSync(key, data);
    notifyLocalChange(key, data);
};

export const getCurrentUserId = () => {
    if (auth?.currentUser?.uid) return auth.currentUser.uid;
    if (isVirtualMode()) return 'DEMO_GUEST_USER';
    return null;
};

// --- Connection Monitoring ---
type ConnectionStatus = 'online' | 'offline';
let connectionStatus: ConnectionStatus = 'online';
const connectionListeners: ((status: ConnectionStatus) => void)[] = [];
let isMonitoringConnection = false;

const notifyConnectionChange = (status: ConnectionStatus) => {
    if (connectionStatus === status) return;
    connectionStatus = status;
    connectionListeners.forEach(l => l(status));
};

export const isValidNetwork = () => connectionStatus === 'online';

export const checkConnection = async (): Promise<ConnectionStatus> => {
    // If browser thinks we are offline, we are offline.
    if (!navigator.onLine) {
        notifyConnectionChange('offline');
        return 'offline';
    }

    // Check for slow connection (Network Information API)
    const connection = (navigator as any).connection;
    if (connection) {
        const effectiveType = connection.effectiveType; // 'slow-2g', '2g', '3g', or '4g'
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
            console.warn(`Connection is too slow (${effectiveType}). Switching to offline mode.`);
            notifyConnectionChange('offline');
            return 'offline';
        }
    }

    const timeoutPromise = new Promise<ConnectionStatus>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)); // 3s strict timeout

    try {
        await Promise.race([
            fetch('/?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' }),
            timeoutPromise
        ]);

        // If we get here, latency < 3s
        notifyConnectionChange('online');
        // Trigger sync if coming online
        processPendingFileUploads();
        return 'online';
    } catch (e) {
        // Timeout or fetch error
        console.warn("Latency check failed or timed out. Switching to offline mode.");
        notifyConnectionChange('offline');
        return 'offline';
    }
};

export const monitorConnection = () => {
    if (typeof window === 'undefined') return;
    if (isMonitoringConnection) return;
    isMonitoringConnection = true;

    // 1. Initial check
    checkConnection();

    // 2. Periodic Latency Check (Ping) - DISABLED for battery optimization
    // Only check on window focus or network events
    // setInterval(checkConnection, 30000);

    // 3. Browser Online/Offline events
    window.addEventListener('online', () => checkConnection());
    window.addEventListener('offline', () => notifyConnectionChange('offline'));
    window.addEventListener('focus', () => checkConnection()); // Check when app comes to foreground
};

export const subscribeToConnectionStatus = (callback: (status: ConnectionStatus) => void) => {
    callback(connectionStatus); // Initial state
    connectionListeners.push(callback);
    return () => {
        const index = connectionListeners.indexOf(callback);
        if (index > -1) connectionListeners.splice(index, 1);
    };
};
// -----------------------------

const processPendingFileUploads = async () => {
    if (!isValidNetwork()) return;
    console.log("Checking for pending offline file uploads...");

    const uid = getCurrentUserId();
    if (!uid || isVirtualMode()) return;

    // 1. Check Anecdotes
    const anecdotes = getLocal<AnecdotalRecord>(COLLECTIONS.ANECDOTES) || [];
    let anecdotesUpdated = false;

    const updatedAnecdotes = await Promise.all(anecdotes.map(async (record) => {
        let changed = false;
        let newRecord = { ...record };

        const processField = async (field: 'photoUrl' | 'audioUrl') => {
            const url = newRecord[field];
            if (url && url.startsWith('offline:')) {
                try {
                    const blob = await getOfflineFile(url);
                    if (blob) {
                        console.log(`Uploading pending file for anecdote ${record.id} (${field})...`);
                        // Generate path similar to AddAnecdoteModal logic
                        const ext = field === 'photoUrl' ? 'jpg' : 'webm'; // Basic assumption, or infer from blob type
                        const path = `users/${uid}/evidence/${field === 'photoUrl' ? 'photos' : 'audio'}/${Date.now()}_${generateId('F')}.${ext}`;

                        const newUrl = await uploadFile(blob, path);
                        newRecord[field] = newUrl;
                        changed = true;

                        // Clean up offline file
                        await deleteOfflineFile(url);
                    } else {
                        console.warn(`Offline file not found for ${url}, keeping offline ref.`);
                    }
                } catch (e) {
                    console.error(`Failed to sync offline file ${url}:`, e);
                }
            }
        };

        await processField('photoUrl');
        await processField('audioUrl');

        if (changed) anecdotesUpdated = true;
        return newRecord;
    }));

    if (anecdotesUpdated) {
        console.log("Syncing updated anecdotes with Cloud URLs...");
        setLocal(COLLECTIONS.ANECDOTES, updatedAnecdotes);

        const batch = writeBatch(db);
        updatedAnecdotes.forEach(r => {
            const oldRecord = anecdotes.find(old => old.id === r.id);
            // Only write to Firestore if URLs actually changed
            if (oldRecord && (oldRecord.photoUrl !== r.photoUrl || oldRecord.audioUrl !== r.audioUrl)) {
                batch.set(doc(db, COLLECTIONS.ANECDOTES, r.id), sanitizeData({ ...r, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true });
            }
        });

        try {
            await batch.commit();
        } catch (e) {
            await logRemoteError(e, 'syncOfflineFiles');
        }
    }
};



const FIREBASE_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000, // 1s
};

async function withRetry<T>(fn: () => Promise<T>, attempts: number = 0): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        // Only retry on network errors or transient failures, not permissions
        const isTransient = error.code !== 'permission-denied' && error.code !== 'unauthenticated';

        // Stop retrying if we are now confirmed offline
        if (isTransient && attempts < FIREBASE_RETRY_CONFIG.maxAttempts && isValidNetwork()) {
            const delay = FIREBASE_RETRY_CONFIG.baseDelay * Math.pow(2, attempts);
            console.warn(`Vicente: Firestore operation failed, retrying in ${delay}ms... (Attempt ${attempts + 1})`, error.code);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, attempts + 1);
        }
        throw error;
    }
}

function sanitizeData(data: any): any {
    if (Array.isArray(data)) return data.map(sanitizeData);
    if (data !== null && typeof data === 'object') {
        return Object.fromEntries(
            Object.entries(data)
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => [key, sanitizeData(value)])
        );
    }
    return data;
}

/**
 * Standardized Error Handling & Remote Logging
 */
const lastErrorLogTimes: Record<string, number> = {};

const logRemoteError = async (error: any, context: string) => {
    const uid = getCurrentUserId();
    if (!uid || isVirtualMode() || !isValidNetwork()) return; // Don't log to remote if explicitly offline

    const now = Date.now();
    if (lastErrorLogTimes[context] && now - lastErrorLogTimes[context] < 60000) return; // Max 1 per minute per context
    lastErrorLogTimes[context] = now;

    try {
        await addDoc(collection(db, COLLECTIONS.SYSTEM_LOGS), {
            userId: uid,
            context,
            errorMessage: error?.message || 'Unknown error',
            errorCode: error?.code || 'n/a',
            timestamp: serverTimestamp(),
            deviceTime: new Date().toISOString(),
            userAgent: navigator.userAgent,
            offline: !navigator.onLine,
            schemaVersion: CURRENT_SCHEMA_VERSION
        });
    } catch (e) {
        console.error("Failed to log remote error:", e);
    }
};

const handleWriteError = async (error: any, context: string) => {
    console.error(`Write Error [${context}]:`, error);
    syncEvents.notify('error');
    await logRemoteError(error, context);
    throw error;
};

// Migration Logic
function migrateDocument<T>(data: any, collectionName: string): T {
    if (!data) return data;

    // Check if migration is needed
    const docVersion = data.schemaVersion || 0;

    if (docVersion >= CURRENT_SCHEMA_VERSION) {
        return data as T;
    }

    console.log(`Migrating document in ${collectionName} from v${docVersion} to v${CURRENT_SCHEMA_VERSION}`);

    // --- MIGRATION STEPS DEFINITION ---
    // This is where we will add case statements for future versions.
    // Example:
    // if (docVersion < 2 && collectionName === COLLECTIONS.STUDENTS) {
    //    data = { ...data, newField: 'default' };
    // }

    // Always update the version in the returned object (in-memory only)
    // The "Repair" happens when the user saves this object back to Firestore.
    return { ...data, schemaVersion: CURRENT_SCHEMA_VERSION } as T;
}

const fetchDocument = async <T extends { id: string }>(collectionName: string, docId: string): Promise<T | null> => {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return migrateDocument<T>({ id: docSnap.id, ...docSnap.data() }, collectionName);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching document ${docId} from ${collectionName}:`, error);
        return null;
    }
};

const fetchCollection = async <T extends { id: string }>(collectionName: string, userIdOverride?: string): Promise<T[]> => {
    const uid = userIdOverride || getCurrentUserId();
    if (!uid) return [];

    if (isVirtualMode()) {
        const local = getLocal<T>(collectionName);
        if (local.length > 0) return local;
        // If empty, try template
        return api.fetchFromTemplateIfEmpty<T>(collectionName);
    }

    try {
        const q = query(collection(db, collectionName), where("userId", "==", uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => migrateDocument<T>({ id: doc.id, ...doc.data() }, collectionName));
        setLocal(collectionName, data);
        syncEvents.notify('synced');
        return data;
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.error(`Vicente: Permisos insuficientes para ${collectionName}. Usando copia local.`);
            syncEvents.notify('error');
        }

        // If in virtual mode AND firebase failed (or no auth), try template
        if (isVirtualMode() && getLocal(collectionName).length === 0) {
            return api.fetchFromTemplateIfEmpty<T>(collectionName);
        }

        return getLocal<T>(collectionName);
    }
};

const subscribeToCollection = <T extends { id: string }>(collectionName: string, onData: (data: T[]) => void, userIdOverride?: string, classId?: string | null) => {
    const uid = userIdOverride || getCurrentUserId();

    if (!uid || isVirtualMode()) {
        onData(getLocal<T>(collectionName));
        if (isVirtualMode()) {
            return subscribeToLocal(collectionName, onData);
        }
        return () => { };
    }
    // ...

    let q = query(collection(db, collectionName), where("userId", "==", uid));
    if (classId) {
        q = query(collection(db, collectionName), where("userId", "==", uid), where("classId", "==", classId));
    }

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => migrateDocument<T>({ id: doc.id, ...doc.data() }, collectionName));
        setLocal(collectionName, data);
        onData(data);
        syncEvents.notify('synced');
    }, (error) => {
        console.warn(`[Offline fallback] ${collectionName} subscription note:`, error?.message || error);
        // Fallback to local data on error
        onData(getLocal<T>(collectionName));
    });
};

const fetchBulkList = async <T>(listName: string, defaultData: T[]): Promise<T[]> => {
    const uid = getCurrentUserId();
    if (!uid) return defaultData;
    if (isVirtualMode()) return getLocal<T>(listName);

    try {
        // 1. New collection approach
        const q = query(collection(db, listName), where('userId', '==', uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const data = snapshot.docs.map(doc => migrateDocument<T>({ id: doc.id, ...doc.data() }, listName));
            setLocal(listName, data);
            syncEvents.notify('synced');
            return data;
        }

        // 2. Legacy Migration Logic: Check if old Fat Document exists in 'lists'
        const legacyDocName = `${listName}_${uid}`;
        const legacyDocSnap = await getDoc(doc(db, COLLECTIONS.LISTS, legacyDocName));
        if (legacyDocSnap.exists()) {
            console.log(`[FatDoc Mitigation] Migrating legacy lists/${legacyDocName} to collection '${listName}'...`);
            const rawItems = legacyDocSnap.data().items;
            const itemsArray = Array.isArray(rawItems) ? (rawItems as T[]) : (Object.values(rawItems || {}) as T[]);
            const data = itemsArray.map(item => migrateDocument<T>(item, listName));

            // Background Auto-migration to new collections
            saveBulkList(listName, data).then(async () => {
                try { await deleteDoc(doc(db, COLLECTIONS.LISTS, legacyDocName)); }
                catch (e) { console.error(`Failed deleting legacy doc ${legacyDocName}`, e); }
            });

            setLocal(listName, data);
            syncEvents.notify('synced');
            return data;
        }

        // If doc doesn't exist and in virtual mode, try template
        if (isVirtualMode() && getLocal(listName).length === 0) {
            return api.fetchBulkListFromTemplateIfEmpty<T>(listName);
        }

        return getLocal<T>(listName);
    } catch (error: any) {
        if (error.code === 'permission-denied') syncEvents.notify('error');

        if (isVirtualMode() && getLocal(listName).length === 0) {
            return api.fetchBulkListFromTemplateIfEmpty<T>(listName);
        }

        return getLocal<T>(listName);
    }
};

const subscribeToBulkList = <T>(listName: string, onData: (data: T[]) => void, userIdOverride?: string, classId?: string | null) => {
    const uid = userIdOverride || getCurrentUserId();

    if (!uid || isVirtualMode()) {
        onData(getLocal<T>(listName));
        if (isVirtualMode()) {
            return subscribeToLocal(listName, onData);
        }
        return () => { };
    }

    let q = query(collection(db, listName), where('userId', '==', uid));
    if (classId) {
        q = query(collection(db, listName), where('userId', '==', uid), where('classId', '==', classId));
    }

    // In Virtual Mode, we rely on api.fetchBulkList to trigger any template population
    if (isVirtualMode()) {
        const localData = getLocal<T>(listName);
        onData(localData);
        return () => { };
    }

    // Subscribe directly to the independent collection instead of the Fat Document
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => migrateDocument<T>({ id: doc.id, ...doc.data() }, listName));
        setLocal(listName, data);
        onData(data);
        syncEvents.notify('synced');
    }, (error) => {
        console.warn(`[Offline fallback] ${listName} bulk subscription note:`, error?.message || error);
        onData(getLocal<T>(listName));
    });
};

const saveBulkList = async <T>(listName: string, items: T[]): Promise<void> => {
    setLocal(listName, items);
    const uid = getCurrentUserId();
    if (isVirtualMode() || !uid) return;

    try {
        const updatedAt = new Date().toISOString();
        syncEvents.notify('syncing');

        // Write each item as an independent document in its matching collection
        // We chunk them because Firestore batch limit is 500
        const chunkArray = (arr: any[], size: number) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );

        const chunks = chunkArray(items, 450); // Safe buffer under 500

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((item: any) => {
                if (item.id) {
                    const docRef = doc(db, listName, item.id);
                    batch.set(docRef, sanitizeData({
                        ...item,
                        schemaVersion: CURRENT_SCHEMA_VERSION,
                        userId: uid,
                        updatedAt
                    }), { merge: true }); // Idempotent updates! Fix E
                }
            });
            await withRetry(() => batch.commit());
        }

        syncEvents.notify('synced');
    } catch (error: any) {
        await handleWriteError(error, `saveBulkList:${listName}`);
    }
};

// --- Types ---
export interface FeedbackData {
    userId: string;
    type: 'bug' | 'feature' | 'general';
    message: string;
    ssoMetadata: { name: string; email: string };
    appMetadata: { version: string; userAgent: string; currentView: string };
    screenshotUrl?: string | null;
    status: 'new' | 'reviewed' | 'addressed';
    createdAt?: any;
}

export const api = {
    syncEvents,

    async seedDemoData(): Promise<void> {
        const classes = await this.getClasses();
        if (classes.length === 0) {
            // Populate from mockData
            for (const cls of mockData.mockClasses) {
                await this.addClass(cls);
            }
            for (const student of mockData.mockStudents) {
                await this.addStudent(student);
            }
            for (const inst of mockData.mockInstruments) {
                await this.addInstrument(inst);
            }
            for (const comp of mockData.mockCompetencies) {
                await this.addCompetencies([comp]);
            }
            await this.setTeacherProfile(mockData.mockTeacherProfile);
        }
    },

    async seedFirebaseDemoTemplate(): Promise<void> {
        const templateUid = mockData.DEMO_TEMPLATE_UID;
        console.log(`Seeding Firebase Demo Template: ${templateUid}`);

        const batch = writeBatch(db);

        // Simple helper to add to batch
        const addToBatch = (colName: string, items: any[]) => {
            items.forEach(item => {
                const docRef = doc(db, colName, item.id);
                batch.set(docRef, sanitizeData({ ...item, userId: templateUid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true });
            });
        };

        addToBatch(COLLECTIONS.CLASSES, mockData.mockClasses);
        addToBatch(COLLECTIONS.STUDENTS, mockData.mockStudents);
        addToBatch(COLLECTIONS.INSTRUMENTS, mockData.mockInstruments);
        addToBatch(COLLECTIONS.USER_COMPETENCIES, mockData.mockCompetencies);

        // Special case for list-based data if any (none yet in mockData but just in case)

        // Special case for Teacher Profile
        batch.set(doc(db, COLLECTIONS.TEACHER_PROFILE, templateUid), sanitizeData({ ...mockData.mockTeacherProfile, userId: templateUid }), { merge: true });

        try {
            await batch.commit();
        } catch (e) {
            await logRemoteError(e, 'seedDemoData');
        }
        console.log("Firebase Demo Template seeded successfully.");
    },

    async fetchFromTemplateIfEmpty<T extends { id: string }>(collectionName: string): Promise<T[]> {
        const local = getLocal<T>(collectionName);
        if (local.length > 0) return local;

        console.log(`Local storage for ${collectionName} is empty. Fetching from template...`);
        try {
            const q = query(collection(db, collectionName), where("userId", "==", mockData.DEMO_TEMPLATE_UID));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => migrateDocument<T>({ id: doc.id, ...doc.data() }, collectionName));
            setLocal(collectionName, data);
            return data;
        } catch (error) {
            console.error(`Error fetching ${collectionName} from template:`, error);
            return [];
        }
    },

    async fetchBulkListFromTemplateIfEmpty<T>(listName: string): Promise<T[]> {
        const local = getLocal<T>(listName);
        if (local.length > 0) return local;

        console.log(`Local storage for bulk list ${listName} is empty. Fetching from template...`);
        try {
            const uid = mockData.DEMO_TEMPLATE_UID;
            const docName = `${listName}_${uid}`;
            const docSnap = await getDoc(doc(db, COLLECTIONS.LISTS, docName));
            if (docSnap.exists()) {
                const rawItems = (docSnap.data().items as T[]) || [];
                const data = rawItems.map(item => migrateDocument<T>(item, listName));
                setLocal(listName, data);
                return data;
            }
            return [];
        } catch (error) {
            console.error(`Error fetching bulk list ${listName} from template:`, error);
            return [];
        }
    },


    async getCurriculumData(): Promise<CurriculumData> {
        if (curriculumCache) return curriculumCache;
        try {
            const response = await fetch('/curriculum.json');
            curriculumCache = await response.json();
            return curriculumCache!;
        } catch { return { levels: [] }; }
    },

    async getSystemLogs(limitCount: number = 50): Promise<any[]> {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return [];
        try {
            // Re-import because of dependency cycle or scope
            const { getDocs, query, collection, orderBy, limit, where } = await import("firebase/firestore");
            const q = query(
                collection(db, COLLECTIONS.SYSTEM_LOGS),
                orderBy("timestamp", "desc"),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching system logs:", error);
            return [];
        }
    },

    async clearSystemLogs(): Promise<void> {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return;
        try {
            const { getDocs, query, collection, writeBatch, doc, deleteDoc } = await import("firebase/firestore");
            const q = query(collection(db, COLLECTIONS.SYSTEM_LOGS));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch (error) {
            console.error("Error clearing system logs:", error);
        }
    },

    async getClasses(): Promise<Class[]> { return fetchCollection<Class>(COLLECTIONS.CLASSES); },
    async addClass(classData: Class | Omit<Class, 'id'>): Promise<Class[]> {
        const uid = getCurrentUserId();
        const newId = (classData as any).id || generateId('C');
        const newClass: Class = { ...classData, id: newId } as Class;

        // --- Auto-Linking Logic ---
        const currentClassesForLink = getLocal<Class>(COLLECTIONS.CLASSES);
        const matchingClass = currentClassesForLink.find(c =>
            c.grade === newClass.grade &&
            c.section === newClass.section &&
            c.schoolYear === newClass.schoolYear &&
            c.level === newClass.level &&
            c.id !== newId
        );

        if (matchingClass) {
            if (matchingClass.groupId) {
                newClass.groupId = matchingClass.groupId;
            } else {
                try {
                    const newGroup = await this.convertClassToGroup(matchingClass.id);
                    if (newGroup) {
                        newClass.groupId = newGroup.id;
                    }
                } catch (e) {
                    console.error("Auto-link error:", e);
                }
            }
        }

        const current = getLocal<Class>(COLLECTIONS.CLASSES);
        setLocal(COLLECTIONS.CLASSES, [...current, newClass]);

        if (!isVirtualMode() && uid) {
            try {
                syncEvents.notify('syncing');
                const timestampedClass = { ...newClass, updatedAt: new Date().toISOString() };

                // --- Wildcard / Official Competency Generation ---
                try {
                    // 1. Try to get Official Curriculum
                    const curriculum = await curriculumService.getCurriculumByGradeAndSubject(newClass.grade, newClass.name);

                    if (curriculum) {
                        console.log(`Found official curriculum for ${newClass.name} (${newClass.grade})`);
                        const competencies: Competency[] = curriculum.competenciesSummary.map(c => ({
                            id: generateId('CMP'),
                            classId: newId,
                            fundamentalId: c.fundamentalId,
                            code: c.code,
                            name: c.name,
                            description: `Competencia oficial del currículo: ${c.name}`,
                            evaluationGroup: c.evaluationGroup,
                            indicators: [], // Indicators specific to class instances might be added later or linked
                            schemaVersion: CURRENT_SCHEMA_VERSION,
                            userId: uid,
                            updatedAt: new Date().toISOString()
                        }));
                        await this.addCompetencies(competencies);
                    } else {
                        // 2. Wildcard Generation (No official curriculum found)
                        console.log(`No official curriculum for ${newClass.name}. Generating Wildcard Competencies.`);
                        const level = newClass.level || 'Nivel Secundario'; // Fallback
                        const isPrimary = level.includes('Primario') || level === 'PRIMARIO';

                        let wildcardCompetencies: Competency[] = [];

                        if (isPrimary) {
                            // Primary: 3 Generic Competencies (GP1, GP2, GP3)
                            // We use Fundamental Competencies as base or just generic names?
                            // Instruction says "Competencia Específica X (Genérica)"
                            (['GP1', 'GP2', 'GP3'] as const).forEach((group, index) => {
                                wildcardCompetencies.push({
                                    id: generateId('CMP'),
                                    classId: newId,
                                    fundamentalId: 'FC_GEN', // Placeholder
                                    code: `${group}-GEN`,
                                    name: `Competencia Específica ${index + 1} (Genérica)`,
                                    description: `Competencia generada automáticamente para evaluación ${group}`,
                                    evaluationGroup: group,
                                    indicators: [],
                                    schemaVersion: CURRENT_SCHEMA_VERSION,
                                    userId: uid,
                                    updatedAt: new Date().toISOString()
                                });
                            });
                        } else {
                            // Secondary: 4 Generic Competencies (PC1, PC2, PC3, PC4)
                            (['PC1', 'PC2', 'PC3', 'PC4'] as const).forEach((group, index) => {
                                wildcardCompetencies.push({
                                    id: generateId('CMP'),
                                    classId: newId,
                                    fundamentalId: 'FC_GEN',
                                    code: `CE-GEN-${index + 1}`,
                                    name: `Competencia Específica ${index + 1} (Genérica)`,
                                    description: `Competencia generada automáticamente para evaluación ${group}`,
                                    evaluationGroup: group,
                                    indicators: [],
                                    schemaVersion: CURRENT_SCHEMA_VERSION,
                                    userId: uid,
                                    updatedAt: new Date().toISOString()
                                });
                            });
                        }

                        if (wildcardCompetencies.length > 0) {
                            await this.addCompetencies(wildcardCompetencies);
                        }
                    }
                } catch (err) {
                    console.error("Error generating competencies for new class:", err);
                    // Don't fail class creation if competency generation fails, but log it.
                }

                if (isValidNetwork()) {
                    await withRetry(() => setDoc(doc(db, COLLECTIONS.CLASSES, newId), sanitizeData({ ...timestampedClass, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
                } else {
                    setDoc(doc(db, COLLECTIONS.CLASSES, newId), sanitizeData({ ...timestampedClass, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }).catch(e => logRemoteError(e, 'addClass:background'));
                }
                syncEvents.notify('synced');
            } catch (e: any) {
                await handleWriteError(e, `addClass:${newId}`);
            }
        }
        return this.getClasses();
    },
    async updateClass(classId: string, updatedData: Omit<Class, 'id'>): Promise<Class[]> {
        let finalData = { ...updatedData };
        const currentClassesForLink = getLocal<Class>(COLLECTIONS.CLASSES);
        const existingClass = currentClassesForLink.find(c => c.id === classId);

        if (existingClass && (
            finalData.grade !== existingClass.grade ||
            finalData.section !== existingClass.section ||
            finalData.schoolYear !== existingClass.schoolYear ||
            finalData.level !== existingClass.level
        )) {
            const matchingClass = currentClassesForLink.find(c =>
                c.id !== classId &&
                c.grade === finalData.grade &&
                c.section === finalData.section &&
                c.schoolYear === finalData.schoolYear &&
                c.level === finalData.level
            );

            if (matchingClass) {
                if (matchingClass.groupId) {
                    finalData.groupId = matchingClass.groupId;
                } else {
                    try {
                        const newGroup = await this.convertClassToGroup(matchingClass.id);
                        if (newGroup) {
                            finalData.groupId = newGroup.id;
                        }
                    } catch (e) {
                        console.error("Auto-link error:", e);
                    }
                }
            }
        }

        const current = getLocal<Class>(COLLECTIONS.CLASSES).map(c => c.id === classId ? { ...finalData, id: classId } : c);
        setLocal(COLLECTIONS.CLASSES, current);
        if (!isVirtualMode()) {
            try {
                syncEvents.notify('syncing');
                const updatedAt = new Date().toISOString();
                await withRetry(() => updateDoc(doc(db, COLLECTIONS.CLASSES, classId), sanitizeData({ ...finalData, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION })));
                syncEvents.notify('synced');
            } catch (e: any) {
                await handleWriteError(e, `updateClass:${classId}`);
            }
        }
        return this.getClasses();
    },

    async getDeletedClasses(): Promise<Class[]> { return fetchCollection<Class>(COLLECTIONS.DELETED_CLASSES); },

    async moveClassToBin(classId: string): Promise<{ classes: Class[], deletedClasses: Class[] }> {
        const uid = getCurrentUserId();
        const currentClasses = getLocal<Class>(COLLECTIONS.CLASSES);
        const classToMove = currentClasses.find(c => c.id === classId);

        if (!classToMove) return { classes: currentClasses, deletedClasses: getLocal<Class>(COLLECTIONS.DELETED_CLASSES) };

        const newClasses = currentClasses.filter(c => c.id !== classId);
        const newDeleted = [...getLocal<Class>(COLLECTIONS.DELETED_CLASSES), classToMove];

        setLocal(COLLECTIONS.CLASSES, newClasses);
        setLocal(COLLECTIONS.DELETED_CLASSES, newDeleted);

        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            batch.delete(doc(db, COLLECTIONS.CLASSES, classId));
            batch.set(doc(db, COLLECTIONS.DELETED_CLASSES, classId), sanitizeData({ ...classToMove, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true });
            try { await batch.commit(); } catch (e: any) {
                await handleWriteError(e, `moveClassToBin:${classId}`);
            }
        }
        return { classes: newClasses, deletedClasses: newDeleted };
    },

    async restoreClass(classId: string): Promise<{ classes: Class[], deletedClasses: Class[] }> {
        const uid = getCurrentUserId();
        const deletedClasses = getLocal<Class>(COLLECTIONS.DELETED_CLASSES);
        const classToRestore = deletedClasses.find(c => c.id === classId);

        if (!classToRestore) return { classes: getLocal<Class>(COLLECTIONS.CLASSES), deletedClasses };

        const newDeleted = deletedClasses.filter(c => c.id !== classId);
        const newClasses = [...getLocal<Class>(COLLECTIONS.CLASSES), classToRestore];

        setLocal(COLLECTIONS.CLASSES, newClasses);
        setLocal(COLLECTIONS.DELETED_CLASSES, newDeleted);

        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            batch.delete(doc(db, COLLECTIONS.DELETED_CLASSES, classId));
            batch.set(doc(db, COLLECTIONS.CLASSES, classId), sanitizeData({ ...classToRestore, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true });
            try { await batch.commit(); } catch (e: any) {
                await handleWriteError(e, `restoreClass:${classId}`);
            }
        }
        return { classes: newClasses, deletedClasses: newDeleted };
    },

    async permanentlyDeleteClass(classId: string): Promise<{ deletedClasses: Class[] }> {
        const newDeleted = getLocal<Class>(COLLECTIONS.DELETED_CLASSES).filter(c => c.id !== classId);
        setLocal(COLLECTIONS.DELETED_CLASSES, newDeleted);

        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.DELETED_CLASSES, classId)); } catch (e: any) {
                await handleWriteError(e, `permanentlyDeleteClass:${classId}`);
            }
        }
        return { deletedClasses: newDeleted };
    },
    async permanentlyDeleteClasses(classIds: string[]): Promise<{ deletedClasses: Class[] }> {
        const currentDeleted = getLocal<Class>(COLLECTIONS.DELETED_CLASSES);
        const newDeleted = currentDeleted.filter(c => !classIds.includes(c.id));
        setLocal(COLLECTIONS.DELETED_CLASSES, newDeleted);

        if (!isVirtualMode()) {
            const batch = writeBatch(db);
            classIds.forEach(id => {
                batch.delete(doc(db, COLLECTIONS.DELETED_CLASSES, id));
            });
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify('error');
            }
        }
        return { deletedClasses: newDeleted };
    },

    // --- School Groups (Shared Sections) ---
    async getGroups(): Promise<SchoolGroup[]> {
        const collectionName = COLLECTIONS.SCHOOL_GROUPS;
        if (isVirtualMode()) {
            return api.fetchFromTemplateIfEmpty<SchoolGroup>(collectionName);
        }

        try {
            const snapshot = await getDocs(collection(db, collectionName));
            const data = snapshot.docs.map(doc => migrateDocument<SchoolGroup>({ id: doc.id, ...doc.data() }, collectionName));
            setLocal(collectionName, data);
            return data;
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                console.warn(`Vicente: Permisos insuficientes para ${collectionName} (Global). Usando copia local.`);
            } else {
                console.error(`Error fetching ${collectionName}:`, error);
            }
            return getLocal<SchoolGroup>(collectionName);
        }
    },

    async addGroup(groupData: Omit<SchoolGroup, 'id'>): Promise<SchoolGroup[]> {
        const uid = getCurrentUserId();
        const newId = generateId('GRP');
        const newGroup: SchoolGroup = { ...groupData, id: newId };

        const current = getLocal<SchoolGroup>(COLLECTIONS.SCHOOL_GROUPS);
        setLocal(COLLECTIONS.SCHOOL_GROUPS, [...current, newGroup]);

        if (!isVirtualMode() && uid) {
            try {
                syncEvents.notify('syncing');
                const timestampedGroup = { ...newGroup, updatedAt: new Date().toISOString() };
                if (isValidNetwork()) {
                    await withRetry(() => setDoc(doc(db, COLLECTIONS.SCHOOL_GROUPS, newId), sanitizeData({ ...timestampedGroup, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
                } else {
                    setDoc(doc(db, COLLECTIONS.SCHOOL_GROUPS, newId), sanitizeData({ ...timestampedGroup, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }).catch(e => logRemoteError(e, 'addGroup:background'));
                }
                syncEvents.notify('synced');
            } catch (e: any) {
                await handleWriteError(e, `addGroup:${newId}`);
            }
        }
        return this.getGroups();
    },

    async updateGroup(groupId: string, updatedData: Partial<SchoolGroup>): Promise<SchoolGroup[]> {
        const current = getLocal<SchoolGroup>(COLLECTIONS.SCHOOL_GROUPS).map(g => g.id === groupId ? { ...g, ...updatedData } : g);
        setLocal(COLLECTIONS.SCHOOL_GROUPS, current);

        if (!isVirtualMode()) {
            try {
                syncEvents.notify('syncing');
                const updatedAt = new Date().toISOString();
                await withRetry(() => updateDoc(doc(db, COLLECTIONS.SCHOOL_GROUPS, groupId), sanitizeData({ ...updatedData, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION })));
                syncEvents.notify('synced');
            } catch (e: any) {
                await handleWriteError(e, `updateGroup:${groupId}`);
            }
        }
        return this.getGroups();
    },

    async deleteGroup(groupId: string): Promise<SchoolGroup[]> {
        const current = getLocal<SchoolGroup>(COLLECTIONS.SCHOOL_GROUPS).filter(g => g.id !== groupId);
        setLocal(COLLECTIONS.SCHOOL_GROUPS, current);

        if (!isVirtualMode()) {
            try {
                await deleteDoc(doc(db, COLLECTIONS.SCHOOL_GROUPS, groupId));
            } catch (e: any) {
                await handleWriteError(e, `deleteGroup:${groupId}`);
            }
        }
        return current;
    },

    // --- User Private Groups (Shared Sections) ---
    // Stored in 'lists' collection as 'school_groups_{userId}' to allow private management
    async getUserGroups(): Promise<SchoolGroup[]> {
        const uid = getCurrentUserId();
        if (!uid) return [];
        return fetchBulkList<SchoolGroup>('school_groups', []);
    },

    // Subscribe to user groups
    onUserGroupsChange(onData: (groups: SchoolGroup[]) => void, userIdOverride?: string): () => void {
        const uid = userIdOverride || getCurrentUserId();
        if (!uid) return () => { };
        return subscribeToBulkList<SchoolGroup>('school_groups', onData);
    },

    async addUserGroup(groupData: Omit<SchoolGroup, 'id'>): Promise<SchoolGroup[]> {
        const uid = getCurrentUserId();
        if (!uid) return [];
        const listName = 'school_groups';
        const current = getLocal<SchoolGroup>(listName);

        const newGroup = { ...groupData, id: generateId('GRP') };
        const updated = [...current, newGroup];

        await saveBulkList(listName, updated);
        return updated;
    },

    /**
     * Converts a standalone Class into a Shared Group.
     * 1. Creates a new User Group with the Class's details.
     * 2. Updates the Class to link to this Group.
     * 3. Updates all Students in this Class to link to this Group.
     */
    async convertClassToGroup(classId: string): Promise<SchoolGroup | null> {
        const uid = getCurrentUserId();
        const classes = getLocal<Class>(COLLECTIONS.CLASSES);
        const targetClass = classes.find(c => c.id === classId);

        if (!targetClass) return null;
        if (targetClass.groupId) {
            // Already has a group, return it exists
            const groups = await this.getUserGroups();
            return groups.find(g => g.id === targetClass.groupId) || null;
        }

        // 1. Create Group
        const newGroupData = {
            name: `${targetClass.grade} ${targetClass.section}`,
            grade: targetClass.grade,
            section: targetClass.section,
            schoolYear: targetClass.schoolYear,
            level: targetClass.level
        };
        const updatedGroups = await this.addUserGroup(newGroupData);
        const newGroup = updatedGroups[updatedGroups.length - 1]; // Last added

        // 2. Update Class
        await this.updateClass(classId, { groupId: newGroup.id });

        // 3. Update Students
        // We need to fetch students for this class and update them
        // Since we don't have a direct "getStudentsForClass", we get ALL students and filter.
        // This is inefficient but safe for now given the local cache architecture.
        const allStudents = getLocal<Student>(COLLECTIONS.STUDENTS);
        const classStudents = allStudents.filter(s => s.classId === classId);

        if (classStudents.length > 0) {
            // Batch update students locally and potentially remote
            // We can reuse updateStudent logic but it's one by one.
            // Let's manually construct update.
            const updatedStudentsList = allStudents.map(s =>
                s.classId === classId ? { ...s, groupId: newGroup.id } : s
            );
            setLocal(COLLECTIONS.STUDENTS, updatedStudentsList);

            // Remote update (Batch)
            if (!isVirtualMode() && uid) {
                const batch = writeBatch(db);
                classStudents.forEach(s => {
                    const docRef = doc(db, COLLECTIONS.STUDENTS, s.id);
                    batch.update(docRef, { groupId: newGroup.id, updatedAt: new Date().toISOString() });
                });
                try { await batch.commit(); } catch (e) { console.error('Error linking students to group:', e); }
            }
        }

        return newGroup;
    },

    async getStudents(classId?: string): Promise<Student[]> {
        // 1. If no classId provided, return ALL students (legacy behavior / admin view)
        if (!classId) return fetchCollection<Student>(COLLECTIONS.STUDENTS);

        // 2. Determine if we need to fetch by ClassID or GroupID
        // We need to look up the Class object to see if it has a groupId.
        // We can check the local cache of classes since it's usually loaded.
        const classes = getLocal<Class>(COLLECTIONS.CLASSES);
        const targetClass = classes.find(c => c.id === classId);

        let students = await fetchCollection<Student>(COLLECTIONS.STUDENTS);

        if (targetClass && targetClass.groupId) {
            // Case A: Shared Group
            // Filter students that belong to this group
            console.log(`Fetching students for Group: ${targetClass.groupId} (Class: ${targetClass.name})`);
            return students.filter(s => s.groupId === targetClass.groupId);
        } else {
            // Case B: Standalone Class (Legacy)
            // Filter students that belong to this classId (OR have this classId as checking fallback)
            // Note: In the new model, student.classId might be "deprecated" if they are in a group, 
            // but for backward compatibility, standalone students still use classId.
            return students.filter(s => s.classId === classId);
        }
    },
    async addStudent(studentData: Omit<Student, 'id'>): Promise<Student[]> {
        const uid = getCurrentUserId();
        const current = getLocal<Student>(COLLECTIONS.STUDENTS);

        // Automatic numbering logic
        const classStudents = current.filter(s => s.classId === studentData.classId);
        const nextOrderNumber = classStudents.length > 0
            ? Math.max(...classStudents.map(s => s.orderNumber || 0)) + 1
            : 1;

        // Use random ID to prevent collisions in shared collection
        const newId = generateId('ST');
        const newStudent: Student = { ...studentData, id: newId, orderNumber: nextOrderNumber };

        setLocal(COLLECTIONS.STUDENTS, [...current, newStudent]);

        if (!isVirtualMode() && uid) {
            try {
                const updatedAt = new Date().toISOString();
                const studentToSave = { ...newStudent, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION };
                if (isValidNetwork()) {
                    await setDoc(doc(db, COLLECTIONS.STUDENTS, newId), sanitizeData(studentToSave), { merge: true });
                } else {
                    setDoc(doc(db, COLLECTIONS.STUDENTS, newId), sanitizeData(studentToSave), { merge: true }).catch(e => logRemoteError(e, 'addStudent:background'));
                }
            } catch (error: any) {
                await handleWriteError(error, `addStudent:${newId}`);
            }
        }
        return this.getStudents();
    },
    async addStudents(studentsData: Omit<Student, 'id'>[]): Promise<Student[]> {
        const uid = getCurrentUserId();
        const current = getLocal<Student>(COLLECTIONS.STUDENTS);

        const classId = studentsData[0]?.classId;
        const classStudentsCount = current.filter(s => s.classId === classId).length;
        let nextOrderNumber = classStudentsCount > 0
            ? Math.max(...current.filter(s => s.classId === classId).map(s => s.orderNumber || 0)) + 1
            : 1;

        const newStudents = studentsData.map(s => {
            const seqNumber = nextOrderNumber++;
            return {
                ...s,
                id: generateId('ST'),
                orderNumber: seqNumber
            };
        });

        setLocal(COLLECTIONS.STUDENTS, [...current, ...newStudents]);

        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            newStudents.forEach(s => batch.set(doc(db, COLLECTIONS.STUDENTS, s.id), sanitizeData({ ...s, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
            try { await withRetry(() => batch.commit()); } catch (e: any) {
                await handleWriteError(e, `addStudents:${newStudents.length}`);
            }
        }
        return this.getStudents();
    },
    async setStudents(students: Student[]): Promise<void> {
        setLocal(COLLECTIONS.STUDENTS, students);
        const uid = getCurrentUserId();
        if (isVirtualMode() || !uid) return;
        const batch = writeBatch(db);
        const updatedAt = new Date().toISOString();
        students.forEach(s => batch.set(doc(db, COLLECTIONS.STUDENTS, s.id), sanitizeData({ ...s, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
        try { await withRetry(() => batch.commit()); } catch (e: any) {
            await handleWriteError(e, `setStudents:${students.length}`);
        }
    },
    async updateStudent(studentId: string, studentData: Partial<Student>): Promise<void> {
        let finalData = { ...studentData };

        // --- Auto-Linking logic on move ---
        if (finalData.classId) {
            const currentStudents = getLocal<Student>(COLLECTIONS.STUDENTS);
            const currentStudent = currentStudents.find(s => s.id === studentId);

            if (currentStudent && currentStudent.classId !== finalData.classId) {
                // Class changed, check if target class has a groupId
                const currentClasses = getLocal<Class>(COLLECTIONS.CLASSES);
                const targetClass = currentClasses.find(c => c.id === finalData.classId);

                if (targetClass && targetClass.groupId) {
                    finalData.groupId = targetClass.groupId;
                } else {
                    finalData.groupId = undefined; // Remove group id if target class has no group
                }
            }
        }

        const current = getLocal<Student>(COLLECTIONS.STUDENTS).map(s => {
            if (s.id === studentId) {
                const { groupId, ...rest } = finalData;
                return finalData.groupId === undefined ? { ...s, ...rest, groupId: undefined } : { ...s, ...finalData };
            }
            return s;
        });
        setLocal(COLLECTIONS.STUDENTS, current);
        if (!isVirtualMode()) {
            try {
                const updatedAt = new Date().toISOString();

                // Firestore requires deleteField() to remove a field
                let updatePayload = sanitizeData({ ...finalData, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION });
                if (finalData.groupId === undefined) {
                    updatePayload.groupId = deleteField();
                }

                if (isValidNetwork()) {
                    await withRetry(() => updateDoc(doc(db, COLLECTIONS.STUDENTS, studentId), updatePayload));
                } else {
                    updateDoc(doc(db, COLLECTIONS.STUDENTS, studentId), updatePayload).catch(e => logRemoteError(e, 'updateStudent:background'));
                }
            } catch (e: any) {
                await handleWriteError(e, `updateStudent:${studentId}`);
            }
        }
    },

    async getTeams(): Promise<WorkTeam[]> { return fetchCollection<WorkTeam>(COLLECTIONS.TEAMS); },
    async addTeam(team: Omit<WorkTeam, 'id'>): Promise<WorkTeam[]> {
        const uid = getCurrentUserId();
        const newId = generateId('T');
        const newTeam: WorkTeam = { ...team, id: newId } as WorkTeam;
        const current = getLocal<WorkTeam>(COLLECTIONS.TEAMS);
        setLocal(COLLECTIONS.TEAMS, [...current, newTeam]);

        if (!isVirtualMode() && uid) {
            try {
                syncEvents.notify('syncing');
                const timestampedTeam = { ...newTeam, updatedAt: new Date().toISOString() };
                if (isValidNetwork()) {
                    await withRetry(() => setDoc(doc(db, COLLECTIONS.TEAMS, newId), sanitizeData({ ...timestampedTeam, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
                } else {
                    setDoc(doc(db, COLLECTIONS.TEAMS, newId), sanitizeData({ ...timestampedTeam, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }).catch(e => logRemoteError(e, 'addTeam:background'));
                }
                syncEvents.notify('synced');
            } catch (e: any) {
                await handleWriteError(e, `addTeam:${newId}`);
            }
        }
        return this.getTeams();
    },
    async addStudentToTeam(teamId: string, studentId: string): Promise<WorkTeam[]> {
        const current = getLocal<WorkTeam>(COLLECTIONS.TEAMS);
        const updated = current.map(t => t.id === teamId ? { ...t, studentIds: Array.from(new Set([...t.studentIds, studentId])) } : t);
        setLocal(COLLECTIONS.TEAMS, updated);

        const uid = getCurrentUserId();
        if (!isVirtualMode() && uid) {
            try {
                const updatePayload = { studentIds: arrayUnion(studentId), updatedAt: new Date().toISOString() };
                if (isValidNetwork()) {
                    await withRetry(() => updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), updatePayload));
                } else {
                    updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), updatePayload).catch(e => logRemoteError(e, 'addStudentToTeam:background'));
                }
            } catch (e: any) {
                await handleWriteError(e, `addStudentToTeam:${teamId}`);
            }
        }
        return updated;
    },
    async removeStudentFromTeam(teamId: string, studentId: string): Promise<WorkTeam[]> {
        const current = getLocal<WorkTeam>(COLLECTIONS.TEAMS);
        const updated = current.map(t => t.id === teamId ? { ...t, studentIds: t.studentIds.filter(id => id !== studentId) } : t);
        setLocal(COLLECTIONS.TEAMS, updated);

        const uid = getCurrentUserId();
        if (!isVirtualMode() && uid) {
            try {
                const updatePayload = { studentIds: arrayRemove(studentId), updatedAt: new Date().toISOString() };
                if (isValidNetwork()) {
                    await withRetry(() => updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), updatePayload));
                } else {
                    updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), updatePayload).catch(e => logRemoteError(e, 'removeStudentFromTeam:background'));
                }
            } catch (e: any) {
                await handleWriteError(e, `removeStudentFromTeam:${teamId}`);
            }
        }
        return updated;
    },
    async updateTeam(teamId: string, updatedData: Partial<WorkTeam>): Promise<WorkTeam[]> {
        const current = getLocal<WorkTeam>(COLLECTIONS.TEAMS);
        const updated = current.map(t => t.id === teamId ? { ...t, ...updatedData } : t);
        setLocal(COLLECTIONS.TEAMS, updated);

        const uid = getCurrentUserId();
        if (!isVirtualMode() && uid) {
            try {
                const updatePayload = { ...updatedData, updatedAt: new Date().toISOString() };
                if (isValidNetwork()) {
                    await withRetry(() => updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), updatePayload));
                } else {
                    updateDoc(doc(db, COLLECTIONS.TEAMS, teamId), updatePayload).catch(e => logRemoteError(e, 'updateTeam:background'));
                }
            } catch (e: any) {
                await handleWriteError(e, `updateTeam:${teamId}`);
            }
        }
        return this.getTeams();
    },
    async deleteTeam(teamId: string): Promise<WorkTeam[]> {
        const current = getLocal<WorkTeam>(COLLECTIONS.TEAMS);
        const updated = current.filter(t => t.id !== teamId);
        setLocal(COLLECTIONS.TEAMS, updated);

        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.TEAMS, teamId)); } catch (e: any) {
                await handleWriteError(e, `deleteTeam:${teamId}`);
            }
        }
        return this.getTeams();
    },
    subscribeToTeams(onData: (data: WorkTeam[]) => void, userIdOverride?: string, classId?: string | null): Unsubscribe {
        return subscribeToCollection<WorkTeam>(COLLECTIONS.TEAMS, onData, userIdOverride, classId);
    },

    async getDeletedStudents(): Promise<Student[]> { return fetchCollection<Student>(COLLECTIONS.DELETED_STUDENTS); },
    async moveStudentsToBin(studentsToMove: Student[]): Promise<{ students: Student[], deletedStudents: Student[] }> {
        const uid = getCurrentUserId();
        const studentIds = new Set(studentsToMove.map(s => s.id));
        const newStudents = getLocal<Student>(COLLECTIONS.STUDENTS).filter(s => !studentIds.has(s.id));
        const newDeleted = [...getLocal<Student>(COLLECTIONS.DELETED_STUDENTS), ...studentsToMove];
        setLocal(COLLECTIONS.STUDENTS, newStudents);
        setLocal(COLLECTIONS.DELETED_STUDENTS, newDeleted);

        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            studentsToMove.forEach(s => {
                batch.delete(doc(db, COLLECTIONS.STUDENTS, s.id));
                batch.set(doc(db, COLLECTIONS.DELETED_STUDENTS, s.id), sanitizeData({ ...s, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true });
            });
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify('error');
            }
        }
        return { students: newStudents, deletedStudents: newDeleted };
    },
    async restoreStudent(studentToRestore: Student): Promise<{ students: Student[], deletedStudents: Student[] }> {
        const uid = getCurrentUserId();
        const newDeleted = getLocal<Student>(COLLECTIONS.DELETED_STUDENTS).filter(s => s.id !== studentToRestore.id);
        const newStudents = [...getLocal<Student>(COLLECTIONS.STUDENTS), studentToRestore];
        setLocal(COLLECTIONS.STUDENTS, newStudents);
        setLocal(COLLECTIONS.DELETED_STUDENTS, newDeleted);

        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            batch.delete(doc(db, COLLECTIONS.DELETED_STUDENTS, studentToRestore.id));
            batch.set(doc(db, COLLECTIONS.STUDENTS, studentToRestore.id), sanitizeData({ ...studentToRestore, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true });
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify('error');
            }
        }
        return { students: newStudents, deletedStudents: newDeleted };
    },
    async permanentlyDeleteStudent(studentId: string): Promise<{ deletedStudents: Student[], attendance: AttendanceRecord[], anecdotes: AnecdotalRecord[], grades: Grade[] }> {
        const newDeleted = getLocal<Student>(COLLECTIONS.DELETED_STUDENTS).filter(s => s.id !== studentId);
        setLocal(COLLECTIONS.DELETED_STUDENTS, newDeleted);

        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.DELETED_STUDENTS, studentId)); } catch (e: any) {
                await handleWriteError(e, `permanentlyDeleteStudent:${studentId}`);
            }
        }
        return {
            deletedStudents: newDeleted,
            attendance: await this.getAttendance(),
            anecdotes: await this.getAnecdotes(),
            grades: await this.getGrades() // In a real app we would cleanup these too, but for now we just return them
        };
    },
    async permanentlyDeleteStudents(studentIds: string[]): Promise<{ deletedStudents: Student[] }> {
        const currentDeleted = getLocal<Student>(COLLECTIONS.DELETED_STUDENTS);
        const newDeleted = currentDeleted.filter(s => !studentIds.includes(s.id));
        setLocal(COLLECTIONS.DELETED_STUDENTS, newDeleted);

        if (!isVirtualMode()) {
            const batch = writeBatch(db);
            studentIds.forEach(id => {
                batch.delete(doc(db, COLLECTIONS.DELETED_STUDENTS, id));
            });
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify('error');
            }
        }
        return { deletedStudents: newDeleted };
    },
    async updateStudentsOrder(classId: string, orderedStudentIds: string[]): Promise<Student[]> {
        const current = getLocal<Student>(COLLECTIONS.STUDENTS);

        // Update local orderNumbers
        const updated = current.map(s => {
            if (s.classId === classId) {
                const newIndex = orderedStudentIds.indexOf(s.id);
                if (newIndex !== -1) {
                    return { ...s, orderNumber: newIndex + 1 };
                }
            }
            return s;
        });

        setLocal(COLLECTIONS.STUDENTS, updated);

        if (!isVirtualMode()) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            updated.filter(s => s.classId === classId).forEach(s => {
                const docRef = doc(db, COLLECTIONS.STUDENTS, s.id);
                batch.update(docRef, { orderNumber: s.orderNumber, updatedAt });
            });
            try {
                await batch.commit();
            } catch (e: any) {
                await handleWriteError(e, `updateStudentsOrder:${classId}`);
            }
        }

        return this.getStudents();
    },

    async getAttendance(): Promise<AttendanceRecord[]> { return fetchBulkList('attendance', []); },
    async setAttendance(attendance: AttendanceRecord[]): Promise<void> { return saveBulkList('attendance', attendance); },
    async updateAttendancePartial(fullAttendance: AttendanceRecord[], changedRecords: AttendanceRecord[]): Promise<void> {
        setLocal('attendance', fullAttendance);
        const uid = getCurrentUserId();
        if (isVirtualMode() || !uid || changedRecords.length === 0) return;

        try {
            const updatedAt = new Date().toISOString();
            syncEvents.notify('syncing');

            const chunkArray = (arr: any[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                    arr.slice(i * size, i * size + size)
                );

            const chunks = chunkArray(changedRecords, 450);

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach((item: any) => {
                    if (item.id) {
                        const docRef = doc(db, 'attendance', item.id);
                        batch.set(docRef, sanitizeData({
                            ...item,
                            schemaVersion: CURRENT_SCHEMA_VERSION,
                            userId: uid,
                            updatedAt
                        }), { merge: true });
                    }
                });
                await withRetry(() => batch.commit());
            }

            syncEvents.notify('synced');
        } catch (error: any) {
            await handleWriteError(error, `updateAttendancePartial`);
        }
    },
    async deleteAttendanceRecords(recordIds: string[]): Promise<void> {
        if (isVirtualMode() || !auth.currentUser) return;
        try {
            const colRef = collection(db, 'attendance');
            
            const chunkArray = (arr: any[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                    arr.slice(i * size, i * size + size)
                );
            
            const chunks = chunkArray(recordIds, 450);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(id => {
                    batch.delete(doc(colRef, id));
                });
                await withRetry(() => batch.commit());
            }
        } catch (error) {
            console.error("Error deleting attendance records", error);
        }
    },
    async getDailyNotes(): Promise<DailyNote[]> { return fetchBulkList('daily_notes', []); },
    async setDailyNotes(notes: DailyNote[]): Promise<void> { return saveBulkList('daily_notes', notes); },

    async getAnecdotes(): Promise<AnecdotalRecord[]> { return fetchCollection<AnecdotalRecord>(COLLECTIONS.ANECDOTES); },
    async addAnecdotes(newRecords: AnecdotalRecord[]): Promise<AnecdotalRecord[]> {
        const uid = getCurrentUserId();
        console.log("Vicente Debug: api.addAnecdotes called with:", newRecords.length, "records. UID:", uid);
        const current = getLocal<AnecdotalRecord>(COLLECTIONS.ANECDOTES);
        const updated = [...current, ...newRecords];
        setLocal(COLLECTIONS.ANECDOTES, updated);
        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            newRecords.forEach(r => batch.set(doc(db, COLLECTIONS.ANECDOTES, r.id), sanitizeData({ ...r, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
            try { await withRetry(() => batch.commit()); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify('error');
                await handleWriteError(e, 'addAnecdotes');
            }
        }
        return updated;
    },

    async getFundamentalCompetencies(userIdOverride?: string): Promise<FundamentalCompetency[]> {
        // For now returning mock data as template, but accepting the argument for consistent API
        return mockFundamentalCompetencies;
    },
    async getCompetencies(): Promise<Competency[]> { return fetchCollection<Competency>(COLLECTIONS.USER_COMPETENCIES); },
    async addCompetencies(competenciesData: Omit<Competency, 'id'>[]): Promise<Competency[]> {
        const uid = getCurrentUserId();
        const newComps = competenciesData.map(c => ({ ...c, id: generateId('COMP') }));
        const current = getLocal<Competency>(COLLECTIONS.USER_COMPETENCIES);
        const updated = [...current, ...newComps];
        setLocal(COLLECTIONS.USER_COMPETENCIES, updated);
        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            const updatedAt = new Date().toISOString();
            newComps.forEach(c => batch.set(doc(db, COLLECTIONS.USER_COMPETENCIES, c.id), sanitizeData({ ...c, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
            try { await withRetry(() => batch.commit()); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify('error');
            }
        }
        return updated;
    },
    async updateCompetency(competencyId: string, updatedData: Omit<Competency, 'id'>): Promise<Competency[]> {
        const current = getLocal<Competency>(COLLECTIONS.USER_COMPETENCIES).map(c => c.id === competencyId ? { ...updatedData, id: competencyId } : c);
        setLocal(COLLECTIONS.USER_COMPETENCIES, current);
        if (!isVirtualMode()) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => updateDoc(doc(db, COLLECTIONS.USER_COMPETENCIES, competencyId), sanitizeData({ ...updatedData, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION })));
            } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify('error');
            }
        }
        return current;
    },
    async deleteCompetency(competencyId: string): Promise<Competency[]> {
        const current = getLocal<Competency>(COLLECTIONS.USER_COMPETENCIES).filter(c => c.id !== competencyId);
        setLocal(COLLECTIONS.USER_COMPETENCIES, current);
        if (!isVirtualMode()) {
            try { await withRetry(() => deleteDoc(doc(db, COLLECTIONS.USER_COMPETENCIES, competencyId))); } catch (e: any) {
                await handleWriteError(e, `deleteUserCompetency:${competencyId}`);
            }
        }
        return current;
    },

    async copyCompetency(competency: Competency, targetClassIds: string[]): Promise<void> {
        const newCompetencies = targetClassIds.map(classId => ({
            ...competency,
            id: generateId('COMP'),
            classId,
            userId: getCurrentUserId() || competency.userId, // Ensure ownership transfers if needed (though usually same user)
        }));

        await this.addCompetencies(newCompetencies);
    },

    async addLinkedInstruments(instrumentData: Omit<EvaluationInstrument, 'id'>, classIds: string[], existingSyncGroupId?: string): Promise<EvaluationInstrument[]> {
        const uid = getCurrentUserId();
        const syncGroupId = existingSyncGroupId || generateId('SYNC');
        const updatedAt = new Date().toISOString();

        const newInstruments: EvaluationInstrument[] = classIds.map(classId => ({
            ...instrumentData,
            id: generateId('INST'),
            classId,
            syncGroupId
        }));

        const current = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS);
        const updated = [...current, ...newInstruments];
        setLocal(COLLECTIONS.INSTRUMENTS, updated);

        if (!isVirtualMode() && uid) {
            try {
                const batch = writeBatch(db);
                newInstruments.forEach(inst => {
                    batch.set(doc(db, COLLECTIONS.INSTRUMENTS, inst.id), sanitizeData({
                        ...inst,
                        userId: uid,
                        updatedAt,
                        schemaVersion: CURRENT_SCHEMA_VERSION
                    }), { merge: true });
                });
                await withRetry(() => batch.commit());
            } catch (e: any) {
                await handleWriteError(e, `addLinkedInstruments:${classIds.length}`);
            }
        }
        return updated;
    },

    async replicateInstrument(instrumentId: string, targetClassIds: string[]): Promise<EvaluationInstrument[]> {
        const currentInstruments = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS);
        const source = currentInstruments.find(i => i.id === instrumentId);
        if (!source) return currentInstruments;

        // If source doesn't have a syncGroupId, assign one
        let syncGroupId = source.syncGroupId;
        if (!syncGroupId) {
            syncGroupId = generateId('SYNC');
            // Update source with the new syncGroupId
            await this.updateInstrument(instrumentId, { ...source, syncGroupId });
        }

        const instrumentData: Omit<EvaluationInstrument, 'id'> = {
            ...source,
            syncGroupId
        };
        // Remove id and classId from data to be replicated (addLinkedInstruments handles these)
        const { id, classId, ...rest } = source;
        return this.addLinkedInstruments({ ...rest, syncGroupId } as any, targetClassIds, syncGroupId);
    },

    async getInstruments(): Promise<EvaluationInstrument[]> { return fetchCollection<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS); },
    async addInstrument(instrumentData: Omit<EvaluationInstrument, 'id'>): Promise<EvaluationInstrument[]> {
        const uid = getCurrentUserId();
        const newId = generateId('INST');
        const newInst: EvaluationInstrument = { ...instrumentData, id: newId };
        const current = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS);
        const updated = [...current, newInst];
        setLocal(COLLECTIONS.INSTRUMENTS, updated);
        if (!isVirtualMode() && uid) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => setDoc(doc(db, COLLECTIONS.INSTRUMENTS, newId), sanitizeData({ ...newInst, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
            } catch (e: any) {
                await handleWriteError(e, `addInstrument:${newId}`);
            }
        }
        return updated;
    },
    async updateInstrument(instrumentId: string, updatedData: Omit<EvaluationInstrument, 'id'>, syncAll: boolean = false): Promise<EvaluationInstrument[]> {
        const uid = getCurrentUserId();
        const updatedAt = new Date().toISOString();
        const currentInstruments = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS);
        const targetInstrument = currentInstruments.find(i => i.id === instrumentId);

        let instrumentsToUpdate: string[] = [instrumentId];

        if (syncAll && targetInstrument?.syncGroupId) {
            instrumentsToUpdate = currentInstruments
                .filter(i => i.syncGroupId === targetInstrument.syncGroupId)
                .map(i => i.id);
        }

        const updated = currentInstruments.map(i => {
            if (instrumentsToUpdate.includes(i.id)) {
                // When syncing, we preserve the original classId of each linked instrument
                return { ...i, ...updatedData, id: i.id, classId: i.classId, syncGroupId: i.syncGroupId };
            }
            return i;
        });

        setLocal(COLLECTIONS.INSTRUMENTS, updated);

        if (!isVirtualMode() && uid) {
            try {
                const batch = writeBatch(db);
                instrumentsToUpdate.forEach(id => {
                    const inst = updated.find(u => u.id === id);
                    if (inst) {
                        batch.update(doc(db, COLLECTIONS.INSTRUMENTS, id), sanitizeData({
                            ...updatedData,
                            classId: inst.classId,
                            updatedAt,
                            schemaVersion: CURRENT_SCHEMA_VERSION
                        }));
                    }
                });
                await withRetry(() => batch.commit());
            } catch (e: any) {
                await handleWriteError(e, `updateInstrument:${instrumentId}`);
            }
        }
        return updated;
    },

    async deleteInstrument(instrumentId: string): Promise<EvaluationInstrument[]> {
        const current = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS).filter(i => i.id !== instrumentId);
        setLocal(COLLECTIONS.INSTRUMENTS, current);
        // Also remove grades for this instrument from local
        const currentGrades = getLocal<Grade>('grades').filter(g => g.instrumentId !== instrumentId);
        setLocal('grades', currentGrades);
        if (!isVirtualMode()) {
            try {
                // Delete grades subcollection first
                const gradesRef = collection(db, getGradesCollectionPath(instrumentId));
                const gradesDocs = await getDocs(gradesRef);
                const batch = writeBatch(db);
                gradesDocs.forEach(d => batch.delete(d.ref));
                batch.delete(doc(db, COLLECTIONS.INSTRUMENTS, instrumentId));
                await batch.commit();
            } catch (e: any) {
                await handleWriteError(e, `deleteInstrument:${instrumentId}`);
            }
        }
        return current;
    },

    async getGrades(instrumentId: string): Promise<Grade[]> {
        if (isVirtualMode() || !isValidNetwork()) {
            return getLocal<Grade>('grades').filter(g => g.instrumentId === instrumentId);
        }
        try {
            const remoteGrades = await fetchCollection<Grade>(getGradesCollectionPath(instrumentId));
            if (remoteGrades && remoteGrades.length > 0) return remoteGrades;
            const localGrades = getLocal<Grade>('grades').filter(g => g.instrumentId === instrumentId);
            return localGrades;
        } catch (e) {
            return getLocal<Grade>('grades').filter(g => g.instrumentId === instrumentId);
        }
    },

    async setGrades(grades: Grade[]): Promise<void> {
        // ALWAYS update local first for Optimistic UI & Offline support
        const existingGrades = getLocal<Grade>('grades') || [];
        const newGradesMap = new Map(grades.map(g => [`${g.instrumentId}_${g.studentId}`, g]));
        const updatedGrades = [
            ...existingGrades.filter(g => !newGradesMap.has(`${g.instrumentId}_${g.studentId}`)),
            ...grades
        ];
        setLocal('grades', updatedGrades);

        if (isVirtualMode()) return;

        const uid = getCurrentUserId();
        if (!uid) return;

        try {
            syncEvents.notify('syncing');
            const batch = writeBatch(db);
            const timestamp = serverTimestamp();

            // Group grades by instrument for efficient batching
            const gradesByInstrument = grades.reduce((acc, grade) => {
                if (!acc[grade.instrumentId]) acc[grade.instrumentId] = [];
                acc[grade.instrumentId].push(grade);
                return acc;
            }, {} as Record<string, Grade[]>);

            Object.entries(gradesByInstrument).forEach(([instrumentId, instrumentGrades]) => {
                instrumentGrades.forEach(grade => {
                    // Use getGradeDocPath helper
                    const gradeDocRef = doc(db, getGradeDocPath(instrumentId, grade.studentId));
                    const gradeData: GradeDocument = {
                        userId: uid,
                        score: grade.score, // Correctly mapping score
                        criteriaScores: grade.criteriaScores || {},
                        updatedAt: timestamp
                    };
                    batch.set(gradeDocRef, gradeData, { merge: true });
                });
            });

            await withRetry(() => batch.commit());
            syncEvents.notify('synced');
        } catch (error: any) {
            await handleWriteError(error, 'setGrades');
            throw error;
        }
    },

    /**
     * Helper to map a competency to a PC group (PC1-PC4).
     * @param subject Subject name (for specific rules if needed)
     * @param competencyId Competency ID
     * @returns 'PC1' | 'PC2' | 'PC3' | 'PC4'
     */
    getCompetencyGroup(subject: string, competencyId: string): 'PC1' | 'PC2' | 'PC3' | 'PC4' {
        // TODO: Implement subject-specific mapping rules if provided.
        // For now, we'll try to infer from the competency code or ID,
        // or default to a round-robin or hash if no metadata exists.
        // Ideally, the Competency object should have a 'group' field 'PC1'...'PC4'.
        // Checking existing types... Competency has 'fundamentalId' and 'code'.
        // FundamentalCompetency has 'group' ('G1'...'G4'). Assumed mapping: G1->PC1...

        // We need to fetch the competency or assume the caller passes the group.
        // Since this is a synchronous helper, we can't fetch.
        // We'll assume the Competency's `fundamentalId` or equivalent helps.
        // BUT, we don't have the Competency object here, just ID.
        // Strategy: In calculateAcademicSummary, we will look up the Competency object.
        return 'PC1'; // Placeholder, logic moved to calculateAcademicSummary
    },

    // calculateAcademicSummary imported from ./gradeHelpers

    /**
     * NEW: Load all grades for user (loads from all instruments)
     * Used mainly for migration/export. For UI, use onInstrumentGradesChange.
     */
    async getAllGradesSubcollection(userId: string): Promise<any[]> {
        if (isVirtualMode()) return getLocal('grades') || [];

        try {
            const instruments = await this.getInstruments();
            const allGrades: Grade[] = [];

            for (const instrument of instruments) {
                const gradesRef = collection(db, getGradesCollectionPath(instrument.id));
                const q = query(gradesRef, where('userId', '==', userId));
                const snapshot = await getDocs(q);

                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data() as GradeDocument;
                    allGrades.push({
                        id: docSnap.id,
                        studentId: docSnap.id,
                        instrumentId: instrument.id,
                        score: data.score,
                        criteriaScores: data.criteriaScores,
                        userId: data.userId,
                        updatedAt: data.updatedAt,
                        schemaVersion: CURRENT_SCHEMA_VERSION
                    });
                });
            }
            return allGrades;
        } catch (error) {
            console.error('Error loading all grades from subcollections:', error);
            return [];
        }
    },
    async saveGrade(grade: Grade): Promise<void> {
        const uid = getCurrentUserId();
        if (!uid) return;
        const grades = getLocal<Grade>('grades'); // Using string literal 'grades' as per existing saveBulkList usage

        const existingIndex = grades.findIndex(g => g.studentId === grade.studentId && g.instrumentId === grade.instrumentId);

        // Optimistic UI Update
        if (existingIndex >= 0) {
            grades[existingIndex] = { ...grades[existingIndex], ...grade };
        } else {
            grades.push({ ...grade, id: generateId('G'), userId: uid });
        }
        setLocal('grades', grades);

        if (!isVirtualMode()) {
            try {
                const batch = writeBatch(db);
                const timestamp = serverTimestamp();
                const updatedAt = new Date().toISOString();

                // Path: instruments/{instId}/grades/{studentId}
                const gradeDocRef = doc(db, getGradeDocPath(grade.instrumentId, grade.studentId));

                // 1. Save main Grade document
                const gradeData: GradeDocument = {
                    userId: uid,
                    score: grade.score,
                    criteriaScores: grade.criteriaScores || {},
                    updatedAt: timestamp
                };
                batch.set(gradeDocRef, gradeData, { merge: true });

                // 2. History Sidecar (Append-Only)
                // Path: instruments/{instId}/grades/{studentId}/history/{autoId}
                const historyRef = doc(collection(gradeDocRef, "history"));
                batch.set(historyRef, {
                    gradeId: grade.studentId,
                    score: grade.score,
                    timestamp: timestamp,
                    userId: uid,
                    action: 'UPDATE',
                    deviceTime: updatedAt
                });

                // 3. Update Academic Summary (Fan-out)
                // We need all grades for this student to recalculate.
                // Optimisation: Use the local 'grades' array which we just updated!
                // We also need instruments and competencies to map groups.
                // NEW: We need to know the Class Level ('Nivel Primario' vs Secondary).
                // calculateAcademicSummary now requires 'level'.
                // We have instrumentId -> we can find classId from instrument? 
                // instruments are loaded.
                const studentGrades = grades.filter(g => g.studentId === grade.studentId);
                const instruments = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS);
                const competencies = getLocal<Competency>(COLLECTIONS.USER_COMPETENCIES);
                const recoveryGrades = getLocal<RecoveryGrade>('recovery_grades');

                // Find Class Level
                let level = 'SECUNDARIO';
                const currentInstrument = instruments.find(i => i.id === grade.instrumentId);
                if (currentInstrument) {
                    const classes = getLocal<Class>(COLLECTIONS.CLASSES);
                    const cls = classes.find(c => c.id === currentInstrument.classId);
                    if (cls && cls.level) {
                        level = cls.level;
                    }
                }

                const summary = calculateAcademicSummary(
                    grade.studentId,
                    studentGrades,
                    instruments,
                    competencies,
                    recoveryGrades,
                    level
                );

                // Path: students/{studentId}/academic_summary/{year} 
                // Or just students/{studentId} if we merge it? 
                // Let's use a subcollection for cleanliness: students/{studentId}/academic/summary
                const summaryRef = doc(db, COLLECTIONS.STUDENTS, grade.studentId, 'academic', 'summary');
                batch.set(summaryRef, summary, { merge: true });

                syncEvents.notify('syncing');
                await withRetry(() => batch.commit());
                syncEvents.notify('synced');
            } catch (error: any) {
                await handleWriteError(error, `saveGrade:${grade.studentId}:${grade.instrumentId}`);
            }
        }
    },
    async getRecoveryGrades(): Promise<RecoveryGrade[]> { return fetchBulkList('recovery_grades', []); },
    async saveRecoveryGrade(newGrade: Omit<RecoveryGrade, 'id'>): Promise<RecoveryGrade[]> {
        const current = getLocal<RecoveryGrade>('recovery_grades');
        const idx = current.findIndex(rg => rg.studentId === newGrade.studentId && rg.period === newGrade.period && rg.competencyGroup === newGrade.competencyGroup);
        let updated;
        if (idx > -1) {
            updated = [...current];
            updated[idx] = { ...newGrade, id: current[idx].id };
        } else {
            updated = [...current, { ...newGrade, id: generateId('RG') }];
        }
        await this.setRecoveryGrades(updated);
        return updated;
    },
    async setRecoveryGrades(grades: RecoveryGrade[]): Promise<void> { return saveBulkList('recovery_grades', grades); },

    async logGradesHistory(updates: { studentId: string; instrumentId: string; score: number | null; criteriaScores?: any }[]): Promise<void> {
        if (isVirtualMode()) return;
        const uid = getCurrentUserId();
        if (!uid) return;

        try {
            const batch = writeBatch(db);
            const timestamp = serverTimestamp();
            const deviceTime = new Date().toISOString();

            updates.forEach(update => {
                // Shared history at instrument level
                const historyCollectionRef = collection(db, `${COLLECTIONS.INSTRUMENTS}/${update.instrumentId}/history`);
                const historyRef = doc(historyCollectionRef);
                batch.set(historyRef, {
                    studentId: update.studentId,
                    score: update.score,
                    criteriaScores: update.criteriaScores,
                    timestamp: timestamp,
                    userId: uid,
                    action: 'UPDATE',
                    deviceTime: deviceTime
                });
            });

            await batch.commit();
            console.log("Batch history write committed successfully");
        } catch (e) {
            await logRemoteError(e, 'logGradesHistory');
            // Non-blocking error
        }
    },

    async getTeacherProfile(): Promise<TeacherProfileData> {
        const uid = getCurrentUserId();
        if (isVirtualMode() || !isValidNetwork()) {
            return JSON.parse(localStorage.getItem('regis_profile') || JSON.stringify(defaultTeacherProfile));
        }

        try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.TEACHER_PROFILE, uid!));
            if (docSnap.exists()) return docSnap.data() as TeacherProfileData;

            // For new users, return a profile pre-populated with auth info
            return {
                ...defaultTeacherProfile,
                name: auth.currentUser?.displayName || defaultTeacherProfile.name,
                email: auth.currentUser?.email || defaultTeacherProfile.email,
                profilePictureUrl: auth.currentUser?.photoURL || defaultTeacherProfile.profilePictureUrl
            };
        } catch {
            return JSON.parse(localStorage.getItem('regis_profile') || JSON.stringify(defaultTeacherProfile));
        }
    },
    async setTeacherProfile(profile: TeacherProfileData): Promise<void> {
        localStorage.setItem('regis_profile', JSON.stringify(profile));
        notifyLocalChange('teacher_profile', profile);

        const uid = getCurrentUserId();
        if (isVirtualMode() || !uid) return;

        const updatedAt = new Date().toISOString();
        const profileDataToSave = sanitizeData({ ...profile, userId: uid, updatedAt });

        if (isValidNetwork()) {
            try {
                await withRetry(() => setDoc(doc(db, COLLECTIONS.TEACHER_PROFILE, uid), profileDataToSave, { merge: true }));
            } catch (e: any) {
                await handleWriteError(e, 'setTeacherProfile');
            }
        } else {
            // Offline: Escribir en segundo plano y capturar error sin bloquear UI
            setDoc(doc(db, COLLECTIONS.TEACHER_PROFILE, uid), profileDataToSave, { merge: true }).catch(e => logRemoteError(e, 'setTeacherProfile:background'));
        }
    },

    async getJournalEntries(): Promise<JournalEntry[]> { return fetchCollection<JournalEntry>(COLLECTIONS.JOURNAL); },
    async addJournalEntry(content: string, classId?: string): Promise<JournalEntry[]> {
        const uid = getCurrentUserId();
        const newId = generateId('J');
        const newEntry: JournalEntry = { id: newId, date: new Date().toISOString(), content, classId };
        const current = getLocal<JournalEntry>(COLLECTIONS.JOURNAL);
        const updated = [...current, newEntry];
        setLocal(COLLECTIONS.JOURNAL, updated);
        if (!isVirtualMode() && uid) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => setDoc(doc(db, COLLECTIONS.JOURNAL, newId), sanitizeData({ ...newEntry, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
            } catch (e: any) {
                await handleWriteError(e, `addJournalEntry:${newId}`);
            }
        }
        return updated;
    },
    async updateJournalEntry(entryId: string, content: string, classId?: string): Promise<JournalEntry[]> {
        const uid = getCurrentUserId();
        const updatedAt = new Date().toISOString();
        const current = getLocal<JournalEntry>(COLLECTIONS.JOURNAL);
        const updated = current.map(e => e.id === entryId ? { ...e, content, classId } : e);
        setLocal(COLLECTIONS.JOURNAL, updated);
        if (!isVirtualMode() && uid) {
            try {
                await withRetry(() => updateDoc(doc(db, COLLECTIONS.JOURNAL, entryId), sanitizeData({ content, classId, updatedAt })));
            } catch (e: any) {
                await handleWriteError(e, `updateJournalEntry:${entryId}`);
            }
        }
        return updated;
    },
    async deleteJournalEntry(entryId: string): Promise<JournalEntry[]> {
        const current = getLocal<JournalEntry>(COLLECTIONS.JOURNAL).filter(e => e.id !== entryId);
        setLocal(COLLECTIONS.JOURNAL, current);
        if (!isVirtualMode()) {
            try {
                await deleteDoc(doc(db, COLLECTIONS.JOURNAL, entryId));
            } catch (e: any) {
                await handleWriteError(e, `deleteJournalEntry:${entryId}`);
            }
        }
        return current;
    },

    async getResources(): Promise<Resource[]> { return fetchCollection<Resource>(COLLECTIONS.RESOURCES); },
    async addResource(title: string, url: string, description: string): Promise<Resource[]> {
        const uid = getCurrentUserId();
        const newId = generateId('R');
        const newRes: Resource = { id: newId, title, url, description };
        const current = getLocal<Resource>(COLLECTIONS.RESOURCES);
        const updated = [...current, newRes];
        setLocal(COLLECTIONS.RESOURCES, updated);
        if (!isVirtualMode() && uid) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => setDoc(doc(db, COLLECTIONS.RESOURCES, newId), sanitizeData({ ...newRes, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION }), { merge: true }));
            } catch (e: any) {
                await handleWriteError(e, `addResource:${newId}`);
            }
        }
        return updated;
    },
    async saveAttendance(record: AttendanceRecord): Promise<void> {
        const uid = getCurrentUserId();
        if (!uid) return;
        // Local logic omitted for brevity as it mirrors others
        const attendance = getLocal<AttendanceRecord>('attendance'); // Note: Collection name inconsistency in local storage logic vs COLLECTIONS constant usage elsewhere. Assuming 'attendance' is key here or inconsistent.
        // Actually, let's fix the local storage key to be consistent if possible, but sticking to existing logic for now.
        // The original code used 'attendance' string literal for local storage getLocal.

        const existingIndex = attendance.findIndex(a => a.studentId === record.studentId && a.date === record.date);
        if (existingIndex >= 0) {
            attendance[existingIndex] = record;
        } else {
            attendance.push(record);
        }
        setLocal('attendance', attendance);

        if (!isVirtualMode()) {
            const updatedAt = new Date().toISOString();
            const dataToSave = { ...record, userId: uid, updatedAt, schemaVersion: CURRENT_SCHEMA_VERSION };
            const docId = `${record.studentId}_${record.date}`;
            try {
                await withRetry(() => setDoc(doc(db, COLLECTIONS.ATTENDANCE, docId), sanitizeData(dataToSave), { merge: true }));
            } catch (e: any) {
                await handleWriteError(e, `saveAttendance:${docId}`);
            }
        }
    },

    async getCustomEvents(): Promise<CustomEvent[]> { return fetchCollection<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS); },
    async addCustomEvent(eventData: Omit<CustomEvent, 'id'>): Promise<CustomEvent[]> {
        const uid = getCurrentUserId();
        const newId = generateId('E');
        const newEvent: CustomEvent = { ...eventData, id: newId };
        const current = getLocal<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS);
        const updated = [...current, newEvent];
        setLocal(COLLECTIONS.CUSTOM_EVENTS, updated);
        if (!isVirtualMode() && uid) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => setDoc(doc(db, COLLECTIONS.CUSTOM_EVENTS, newId), sanitizeData({ ...newEvent, userId: uid, updatedAt }), { merge: true }));
            } catch (e: any) {
                await handleWriteError(e, `addCustomEvent:${newId}`);
            }
        }
        return updated;
    },
    async updateCustomEvent(eventId: string, updatedData: Omit<CustomEvent, 'id'>): Promise<CustomEvent[]> {
        const current = getLocal<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS).map(e => e.id === eventId ? { ...updatedData, id: eventId } : e);
        setLocal(COLLECTIONS.CUSTOM_EVENTS, current);
        if (!isVirtualMode()) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => updateDoc(doc(db, COLLECTIONS.CUSTOM_EVENTS, eventId), sanitizeData({ ...updatedData, updatedAt })));
            } catch (e: any) {
                await handleWriteError(e, `updateCustomEvent:${eventId}`);
            }
        }
        return current;
    },
    async deleteCustomEvent(eventId: string): Promise<CustomEvent[]> {
        const current = getLocal<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS).filter(e => e.id !== eventId);
        setLocal(COLLECTIONS.CUSTOM_EVENTS, current);
        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.CUSTOM_EVENTS, eventId)); } catch (e: any) {
                await handleWriteError(e, `deleteCustomEvent:${eventId}`);
            }
        }
        return current;
    },

    async getLessonPlans(): Promise<LessonPlan[]> { return fetchCollection<LessonPlan>(COLLECTIONS.LESSON_PLANS); },
    async addLessonPlan(planData: Omit<LessonPlan, 'id'>): Promise<LessonPlan[]> {
        const uid = getCurrentUserId();
        const newId = generateId('LP');
        const newPlan: LessonPlan = { ...planData, id: newId };
        const current = getLocal<LessonPlan>(COLLECTIONS.LESSON_PLANS);
        const updated = [...current, newPlan];
        setLocal(COLLECTIONS.LESSON_PLANS, updated);
        if (!isVirtualMode() && uid) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => setDoc(doc(db, COLLECTIONS.LESSON_PLANS, newId), sanitizeData({ ...newPlan, userId: uid, updatedAt }), { merge: true }));
            } catch (e: any) {
                await handleWriteError(e, `addLessonPlan:${newId}`);
            }
        }
        return updated;
    },
    async updateLessonPlan(planId: string, updatedData: Omit<LessonPlan, 'id'>): Promise<LessonPlan[]> {
        const current = getLocal<LessonPlan>(COLLECTIONS.LESSON_PLANS).map(p => p.id === planId ? { ...updatedData, id: planId } : p);
        setLocal(COLLECTIONS.LESSON_PLANS, current);
        if (!isVirtualMode()) {
            try {
                const updatedAt = new Date().toISOString();
                await withRetry(() => updateDoc(doc(db, COLLECTIONS.LESSON_PLANS, planId), sanitizeData({ ...updatedData, updatedAt })));
            } catch (e: any) {
                await handleWriteError(e, `updateLessonPlan:${planId}`);
            }
        }
        return current;
    },
    async deleteLessonPlan(planId: string): Promise<LessonPlan[]> {
        const current = getLocal<LessonPlan>(COLLECTIONS.LESSON_PLANS).filter(p => p.id !== planId);
        setLocal(COLLECTIONS.LESSON_PLANS, current);
        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.LESSON_PLANS, planId)); } catch (e: any) {
                await handleWriteError(e, `deleteLessonPlan:${planId}`);
            }
        }
        return current;
    },

    async getIsDarkMode(): Promise<boolean> { return JSON.parse(localStorage.getItem('teacherkit-isDarkMode') || 'false'); },
    async setIsDarkMode(isDark: boolean): Promise<void> { localStorage.setItem('teacherkit-isDarkMode', JSON.stringify(isDark)); },
    async getIsSidebarCollapsed(): Promise<boolean> { return JSON.parse(localStorage.getItem('teacherkit-isSidebarCollapsed') || 'false'); },
    async setIsSidebarCollapsed(isCollapsed: boolean): Promise<void> { localStorage.setItem('teacherkit-isSidebarCollapsed', JSON.stringify(isCollapsed)); },
    async getFontSize(): Promise<FontSize> { return (localStorage.getItem('teacherkit-fontSize') as FontSize) || 'base'; },
    async setFontSize(size: FontSize): Promise<void> { localStorage.setItem('teacherkit-fontSize', size); },
    async getLastSelectedClassId(): Promise<string | null> { return localStorage.getItem('teacherkit-lastSelectedClassId'); },
    async setLastSelectedClassId(classId: string): Promise<void> { localStorage.setItem('teacherkit-lastSelectedClassId', classId); },
    async getAIFeatures(userIdOverride?: string): Promise<AIFeatures> {
        if (!isVirtualMode()) {
            try {
                const docSnap = await getDoc(doc(db, COLLECTIONS.APP_CONFIG, 'global_ai_features'));
                if (docSnap.exists()) {
                    return docSnap.data().features as AIFeatures;
                }
            } catch (error) {
                console.error("Error fetching AI features:", error);
            }
        }
        return JSON.parse(localStorage.getItem('teacherkit-aiFeatures') || JSON.stringify({
            summaryGeneration: false,
            criteriaGeneration: false,
            lessonPlanning: false,
            studentExtraction: false,
            audioAnalysis: false,
            vicenteAssistant: false,
        }));
    },
    async setAIFeatures(features: AIFeatures): Promise<void> {
        localStorage.setItem('teacherkit-aiFeatures', JSON.stringify(features));
        if (!isVirtualMode()) {
            try {
                await setDoc(doc(db, COLLECTIONS.APP_CONFIG, 'global_ai_features'), { features: sanitizeData(features) }, { merge: true });
            } catch (error) {
                await logRemoteError(error, 'setAIFeatures');
            }
        }
    },
    onAIFeaturesChange(callback: (features: AIFeatures) => void, userIdOverride?: string) {
        if (isVirtualMode() && !userIdOverride) return () => { };
        return onSnapshot(doc(db, COLLECTIONS.APP_CONFIG, 'global_ai_features'), (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data().features as AIFeatures);
            }
        });
    },

    // Subscriptions
    onClassesChange(callback: (classes: Class[]) => void, uid?: string) { return subscribeToCollection<Class>(COLLECTIONS.CLASSES, callback, uid); },
    onStudentsChange(callback: (students: Student[]) => void, uid?: string) { return subscribeToCollection<Student>(COLLECTIONS.STUDENTS, callback, uid); },
    onDeletedStudentsChange(callback: (students: Student[]) => void, uid?: string) { return subscribeToCollection<Student>(COLLECTIONS.DELETED_STUDENTS, callback, uid); },
    onDeletedClassesChange(callback: (classes: Class[]) => void, uid?: string) { return subscribeToCollection<Class>(COLLECTIONS.DELETED_CLASSES, callback, uid); },
    onAttendanceChange(callback: (attendance: AttendanceRecord[]) => void, uid?: string, classId?: string | null) { return subscribeToBulkList<AttendanceRecord>('attendance', callback, uid, classId); },
    onDailyNotesChange(callback: (notes: DailyNote[]) => void, uid?: string, classId?: string | null) { return subscribeToBulkList<DailyNote>('daily_notes', callback, uid, classId); },
    onAnecdotesChange(callback: (anecdotes: AnecdotalRecord[]) => void, uid?: string) { return subscribeToCollection<AnecdotalRecord>(COLLECTIONS.ANECDOTES, callback, uid); },
    onInstrumentsChange(callback: (instruments: EvaluationInstrument[]) => void, uid?: string) { return subscribeToCollection<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS, callback, uid); },

    onInstrumentGradesChange(instrumentId: string, userId: string, callback: (grades: Grade[]) => void): (() => void) {
        if (isVirtualMode()) {
            const allGrades = getLocal<Grade>('grades') || [];
            const instrumentGrades = allGrades.filter(g => g.instrumentId === instrumentId);
            callback(instrumentGrades);
            return () => { };
        }

        if (!userId) {
            console.error(`onInstrumentGradesChange: Missing userId for instrument ${instrumentId}`);
            callback([]);
            return () => { };
        }

        const gradesCollectionRef = collection(db, getGradesCollectionPath(instrumentId));
        const q = query(gradesCollectionRef, where('userId', '==', userId));

        return onSnapshot(q, (snapshot) => {
            const grades: Grade[] = snapshot.docs.map(docSnap => {
                const data = docSnap.data() as GradeDocument;
                return {
                    id: docSnap.id,
                    studentId: docSnap.id,
                    instrumentId: instrumentId,
                    score: data.score,
                    criteriaScores: data.criteriaScores,
                    userId: data.userId,
                    updatedAt: data.updatedAt,
                    schemaVersion: CURRENT_SCHEMA_VERSION
                };
            });
            callback(grades);
            callback(grades);
        }, (error) => {
            if (error.code === 'permission-denied') {
                // Expected on logout, ignore
                return;
            }
            console.error(`Error listening to instrument ${instrumentId} grades:`, error);
            callback([]);
        });
    },
    onRecoveryGradesChange(callback: (grades: RecoveryGrade[]) => void, uid?: string) { return subscribeToBulkList<RecoveryGrade>('recovery_grades', callback, uid); },
    onCompetenciesChange(callback: (competencies: Competency[]) => void, uid?: string) { return subscribeToCollection<Competency>(COLLECTIONS.USER_COMPETENCIES, callback, uid); },
    onJournalChange(callback: (entries: JournalEntry[]) => void, uid?: string) { return subscribeToCollection<JournalEntry>(COLLECTIONS.JOURNAL, callback, uid); },
    onResourcesChange(callback: (resources: Resource[]) => void, uid?: string) { return subscribeToCollection<Resource>(COLLECTIONS.RESOURCES, callback, uid); },
    onEventsChange(callback: (events: CustomEvent[]) => void, uid?: string) { return subscribeToCollection<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS, callback, uid); },
    onLessonPlansChange(callback: (plans: LessonPlan[]) => void, uid?: string, classId?: string | null) { return subscribeToCollection<LessonPlan>(COLLECTIONS.LESSON_PLANS, callback, uid, classId); },
    /**
     * DIAGNOSTIC: Check for "Ghost Grades"
     * Finds cases where a history record exists (write verified) but the parent Grade document is missing.
     */
    async diagnoseGhostGrades(): Promise<any[]> {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return [];

        console.log("Starting Ghost Grade Diagnosis...");
        const ghosts: any[] = [];

        try {
            // 1. Get all history entries for this user (requires Collection Group Index on 'userId')
            // Note: This might fail if index doesn't exist. Fallback to checking local grades vs remote.
            const historyQuery = query(collectionGroup(db, 'history'), where('userId', '==', uid));
            const historySnap = await getDocs(historyQuery);

            console.log(`Found ${historySnap.size} history entries. Checking for orphans...`);

            // Map key: gradePath -> boolean (exists)
            const parentCache: Record<string, boolean> = {};

            for (const historyDoc of historySnap.docs) {
                const parentRef = historyDoc.ref.parent.parent; // history -> grade
                if (!parentRef) continue;

                const parentPath = parentRef.path;

                if (parentCache[parentPath] === undefined) {
                    const parentSnap = await getDoc(parentRef);
                    parentCache[parentPath] = parentSnap.exists();
                }

                if (parentCache[parentPath] === false) {
                    ghosts.push({
                        type: 'ORPHAN_HISTORY',
                        historyId: historyDoc.id,
                        gradePath: parentPath,
                        data: historyDoc.data()
                    });
                }
            }

            // 2. Local vs Remote Sanity Check
            const localGrades = getLocal<Grade>('grades');
            for (const lGrade of localGrades) {
                const path = getGradeDocPath(lGrade.instrumentId, lGrade.studentId);
                if (parentCache[path] === false) { // verified missing above
                    ghosts.push({
                        type: 'MISSING_REMOTE',
                        localGrade: lGrade,
                        path
                    });
                } else if (parentCache[path] === undefined) {
                    // Check specifically if not checked yet
                    const ref = doc(db, path);
                    const snap = await getDoc(ref);
                    if (!snap.exists()) {
                        ghosts.push({
                            type: 'MISSING_REMOTE',
                            localGrade: lGrade,
                            path
                        });
                    }
                }
            }

        } catch (e) {
            console.error("Diagnosis failed (likely missing index on 'history' collection group):", e);
            return [{ error: 'Diagnosis failed. Check console.' }];
        }

        console.log(`Diagnosis complete. Found ${ghosts.length} issues.`);
        return ghosts;
    },

    onTeacherProfileChange(callback: (profile: TeacherProfileData) => void, userIdOverride?: string) {
        const uid = userIdOverride || getCurrentUserId();
        if (!uid) {
            // If truly no UID, at least provide default to avoid blank screen in some states
            callback(defaultTeacherProfile);
            return () => { };
        }

        if (isVirtualMode()) {
            this.getTeacherProfile().then(callback);
            return subscribeToLocal('teacher_profile', callback);
        }

        const handleSnapshotError = (error: any) => {
            // On permission error or any other, provide fallback
            callback({
                ...defaultTeacherProfile,
                name: auth.currentUser?.displayName || (userIdOverride ? 'Usuario' : defaultTeacherProfile.name),
                email: auth.currentUser?.email || (userIdOverride ? '' : defaultTeacherProfile.email),
                profilePictureUrl: auth.currentUser?.photoURL || defaultTeacherProfile.profilePictureUrl,
                _isFallback: true
            } as any);
        };

        return onSnapshot(doc(db, COLLECTIONS.TEACHER_PROFILE, uid), (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data() as TeacherProfileData);
            } else {
                // Return default profile for new users to prevent blank screen
                callback({
                    ...defaultTeacherProfile,
                    name: auth.currentUser?.displayName || (userIdOverride ? 'Usuario' : defaultTeacherProfile.name),
                    email: auth.currentUser?.email || (userIdOverride ? '' : defaultTeacherProfile.email),
                    profilePictureUrl: auth.currentUser?.photoURL || defaultTeacherProfile.profilePictureUrl,
                    _isFallback: true
                } as any);
            }
        }, handleSnapshotError);
    },

    async getLatestVersion(): Promise<string> {
        if (isVirtualMode()) return 'LOCAL';
        try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.APP_CONFIG, 'global_config'));
            if (docSnap.exists()) {
                return docSnap.data().version || '';
            }
        } catch (error) {
            console.error("Error fetching latest version:", error);
        }
        return '';
    },

    // Connection Monitoring
    isValidNetwork,
    checkConnection,
    monitorConnection,
    subscribeToConnectionStatus,

    // Subscription Management (Premium Account System)
    async getSubscription(userIdOverride?: string): Promise<UserSubscription> {
        const uid = userIdOverride || getCurrentUserId();
        const defaultFree: UserSubscription = {
            tier: 'free',
            status: 'active',
            expiresAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'manual'
        };

        if (!uid || isVirtualMode()) return defaultFree;

        try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.SUBSCRIPTIONS, uid));
            if (docSnap.exists()) {
                return docSnap.data() as UserSubscription;
            }
        } catch (error) {
            console.error("Error fetching subscription:", error);
        }

        // Cache in localStorage for offline access
        const cached = localStorage.getItem(`regis-subscription-${uid}`);
        if (cached) {
            try {
                return JSON.parse(cached) as UserSubscription;
            } catch { }
        }

        return defaultFree;
    },

    onSubscriptionChange(callback: (subscription: UserSubscription) => void, userIdOverride?: string) {
        const uid = userIdOverride || getCurrentUserId();
        if (!uid || isVirtualMode()) {
            // Return default for demo mode
            callback({
                tier: 'free',
                status: 'active',
                expiresAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'manual'
            });
            return () => { };
        }

        return onSnapshot(doc(db, COLLECTIONS.SUBSCRIPTIONS, uid), (snapshot) => {
            if (snapshot.exists()) {
                const sub = snapshot.data() as UserSubscription;
                // Cache for offline
                localStorage.setItem(`regis-subscription-${uid}`, JSON.stringify(sub));
                callback(sub);
            } else {
                // No subscription doc = free tier
                callback({
                    tier: 'free',
                    status: 'active',
                    expiresAt: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: 'manual'
                });
            }
        }, (error) => {
            // Gracefully handle permission errors (e.g., during logout or for new users)
            if (error.code === 'permission-denied') return;
            console.error("Subscription listener error:", error);
            callback({
                tier: 'free',
                status: 'active',
                expiresAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'manual'
            });
        });
    },

    /**
     * Track student extraction usage for free tier limits
     * Increments count and resets monthly if needed
     */
    async trackStudentExtraction(userIdOverride?: string): Promise<void> {
        const uid = userIdOverride || getCurrentUserId();
        if (!uid || isVirtualMode()) return;

        try {
            const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, uid);
            const subSnap = await getDoc(subRef);

            const now = new Date();
            const currentMonth = now.toISOString();

            if (!subSnap.exists()) {
                // Create initial subscription doc with usage
                await setDoc(subRef, {
                    tier: 'free',
                    status: 'active',
                    expiresAt: null,
                    createdAt: currentMonth,
                    updatedAt: currentMonth,
                    source: 'manual',
                    usage: {
                        studentExtractions: {
                            count: 1,
                            lastReset: currentMonth
                        }
                    }
                });
                return;
            }

            const subscription = subSnap.data() as UserSubscription;
            const usage = subscription.usage?.studentExtractions;

            if (!usage) {
                // First extraction
                await setDoc(subRef, {
                    ...subscription,
                    updatedAt: currentMonth,
                    usage: {
                        studentExtractions: {
                            count: 1,
                            lastReset: currentMonth
                        }
                    }
                }, { merge: true });
                return;
            }

            // Check if we need to reset (new month)
            const lastReset = new Date(usage.lastReset);
            const needsReset =
                now.getMonth() !== lastReset.getMonth() ||
                now.getFullYear() !== lastReset.getFullYear();

            if (needsReset) {
                // Reset counter for new month
                await setDoc(subRef, {
                    ...subscription,
                    updatedAt: currentMonth,
                    usage: {
                        studentExtractions: {
                            count: 1,
                            lastReset: currentMonth
                        }
                    }
                }, { merge: true });
            } else {
                // Increment counter
                await setDoc(subRef, {
                    ...subscription,
                    updatedAt: currentMonth,
                    usage: {
                        studentExtractions: {
                            count: usage.count + 1,
                            lastReset: usage.lastReset
                        }
                    }
                }, { merge: true });
            }
        } catch (error) {
            await logRemoteError(error, 'trackStudentExtraction');
        }
    },

    /**
     * Check if user can create a new class based on subscription limits.
     *
     * Strategy:
     *   1. If online → call Cloud Function validateClassLimit (server-side, unfakeable)
     *   2. If offline → fall back to local logic (optimistic, same UX as before)
     *
     * The Cloud Function is the authoritative check when monetization is active.
     */
    async checkClassLimit(userIdOverride?: string): Promise<{
        canCreate: boolean;
        current: number;
        limit: number;
        remaining: number;
        reason?: 'free_limit_reached' | 'grandfathered' | 'premium';
    }> {
        const uid = userIdOverride || getCurrentUserId();

        if (!uid || isVirtualMode()) {
            return { canCreate: true, current: 0, limit: Infinity, remaining: Infinity };
        }

        // --- Server-side check (when online) ---
        if (isValidNetwork()) {
            try {
                const functions = getFunctions();
                const fn = httpsCallable<{}, {
                    canCreate: boolean;
                    current?: number;
                    limit?: number;
                    remaining?: number;
                    reason?: string;
                }>(functions, 'validateClassLimit');

                const result = await fn({});
                const data = result.data;

                return {
                    canCreate: data.canCreate,
                    current: data.current ?? 0,
                    limit: data.limit ?? 10,
                    remaining: data.remaining ?? 0,
                    reason: data.reason as any,
                };
            } catch (fnError) {
                // Cloud Function unavailable (cold start timeout, deploy in progress, etc.)
                // Fall through to local logic — fail open
                console.warn('validateClassLimit CF unavailable, using local fallback:', fnError);
            }
        }

        // --- Offline / fallback: local logic ---
        try {
            const subscription = await this.getSubscription(uid);
            const classesSnapshot = await getDocs(
                query(collection(db, COLLECTIONS.CLASSES), where('userId', '==', uid))
            );
            const currentCount = classesSnapshot.size;

            if (subscription.tier === 'premium' && subscription.status === 'active') {
                return { canCreate: true, current: currentCount, limit: Infinity, remaining: Infinity, reason: 'premium' };
            }

            if (subscription.grandfathered) {
                return { canCreate: true, current: currentCount, limit: Infinity, remaining: Infinity, reason: 'grandfathered' };
            }

            const FREE_CLASS_LIMIT = 10;
            const canCreate = currentCount < FREE_CLASS_LIMIT;

            return {
                canCreate,
                current: currentCount,
                limit: FREE_CLASS_LIMIT,
                remaining: Math.max(0, FREE_CLASS_LIMIT - currentCount),
                reason: canCreate ? undefined : 'free_limit_reached'
            };
        } catch (error) {
            console.error('Error checking class limit (local fallback):', error);
            return { canCreate: true, current: 0, limit: 10, remaining: 10 };
        }
    },
    async checkSyncStatus(): Promise<void> {
        const uid = getCurrentUserId();
        if (!uid || isVirtualMode()) return;

        // NEW: Sync pending feedback
        try {
            const pendingFeedback = getLocal<any>('pending_feedback');
            if (pendingFeedback.length > 0) {
                console.log(`Syncing ${pendingFeedback.length} pending feedback items...`);
                // Process sequentially to maintain order
                const remaining: any[] = [];
                for (const item of pendingFeedback) {
                    try {
                        const feedbackRef = collection(db, 'feedback');
                        await addDoc(feedbackRef, {
                            ...item,
                            createdAt: item.createdAt ? new Date(item.createdAt) : serverTimestamp(),
                            syncedAt: serverTimestamp()
                        });
                    } catch (e) {
                        console.error("Failed to sync feedback item:", e);
                        remaining.push(item);
                    }
                }
                setLocal('pending_feedback', remaining);
                if (remaining.length < pendingFeedback.length) {
                    console.log("Feedback sync completed.");
                }
            }
        } catch (e) {
            console.error("Error syncing pending feedback:", e);
        }

        try {
            const classes = await this.getClasses();
            const legacyClasses = classes.filter(c => (c.schemaVersion || 0) < CURRENT_SCHEMA_VERSION);
            if (legacyClasses.length > 0) {
                console.info(`Vicente: Found ${legacyClasses.length} legacy classes. Migration required in Phase III.`);
            }
        } catch (e) {
            console.error("Sync status check failed:", e);
        }
    },

    // --- Feedback ---
    async addFeedback(data: any): Promise<void> {
        if (isVirtualMode()) {
            console.log('[Virtual] Feedback submitted:', data);
            return;
        }

        // Offline Handling
        if (!isValidNetwork()) {
            console.log('[Offline] Queueing feedback:', data);
            const currentQueue = getLocal<any>('pending_feedback');
            // Store with local timestamp
            const queueItem = { ...data, createdAt: new Date().toISOString() };
            setLocal('pending_feedback', [...currentQueue, queueItem]);
            return;
        }

        try {
            const feedbackRef = collection(db, 'feedback');
            await addDoc(feedbackRef, {
                ...data,
                createdAt: serverTimestamp()
            });
        } catch (error: any) {
            console.warn('Error submitting feedback, falling back to offline queue:', error);
            // Fallback to queue if write fails
            const currentQueue = getLocal<any>('pending_feedback');
            const queueItem = { ...data, createdAt: new Date().toISOString() };
            setLocal('pending_feedback', [...currentQueue, queueItem]);
        }
    },

    async uploadFeedbackScreenshot(blob: Blob): Promise<string> {
        if (isVirtualMode()) {
            return 'offline:screenshot_' + Date.now();
        }
        const filename = `feedback_screenshots/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    },

    // --- Referral System ---
    async getOrCreateReferralCode(userIdOverride?: string): Promise<string> {
        const uid = userIdOverride || getCurrentUserId();
        if (!uid) return generateReferralCode('demo_teacher');

        const sub = await this.getSubscription(uid);
        if (sub.referralCode) {
            return sub.referralCode;
        }

        const newCode = generateReferralCode(uid);
        if (!isVirtualMode() && isValidNetwork()) {
            try {
                const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, uid);
                await setDoc(subRef, { referralCode: newCode, updatedAt: new Date().toISOString() }, { merge: true });
            } catch (err) {
                console.warn('Error saving referralCode to Firestore:', err);
            }
        }
        return newCode;
    },

    async claimReferralCode(codeToClaim: string): Promise<{ success: boolean; message: string }> {
        const uid = getCurrentUserId();
        if (!uid) {
            return { success: false, message: 'Debes iniciar sesión para canjear un código.' };
        }

        const trimmedCode = codeToClaim.trim().toUpperCase();
        if (!validateReferralCodeFormat(trimmedCode)) {
            return { success: false, message: 'El formato del código de referencia no es válido.' };
        }

        const sub = await this.getSubscription(uid);
        if (sub.referralClaimed) {
            return { success: false, message: 'Ya has canjeado un código de referencia previamente.' };
        }

        if (sub.referralCode === trimmedCode) {
            return { success: false, message: 'No puedes canjear tu propio código de referencia.' };
        }

        // Online mode: use Cloud Function or Firestore atomic update
        if (isValidNetwork() && !isVirtualMode()) {
            try {
                const functions = getFunctions();
                const fn = httpsCallable<{ code: string }, { success: boolean; message: string }>(functions, 'claimReferralCode');
                const res = await fn({ code: trimmedCode });
                return res.data;
            } catch (fnErr: any) {
                console.warn('Cloud function claimReferralCode failed, falling back to direct atomic update:', fnErr);
            }
        }

        // Local / Fallback optimistic update
        try {
            const newExpiresAt = calculateRewardExtension(sub.expiresAt, 30);
            const updatedSub: UserSubscription = {
                ...sub,
                tier: 'premium',
                status: 'active',
                expiresAt: newExpiresAt,
                referralClaimed: true,
                updatedAt: new Date().toISOString()
            };

            setLocal(COLLECTIONS.SUBSCRIPTIONS, updatedSub);

            if (!isVirtualMode() && isValidNetwork()) {
                const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, uid);
                await setDoc(subRef, {
                    tier: 'premium',
                    status: 'active',
                    expiresAt: newExpiresAt,
                    referralClaimed: true,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }

            return {
                success: true,
                message: '¡Código canjeado con éxito! Has obtenido 30 días de Plan Premium gratis.'
            };
        } catch (err: any) {
            return { success: false, message: err?.message || 'Error al canjear el código.' };
        }
    }
};

if (typeof window !== 'undefined') (window as any).api = api;
