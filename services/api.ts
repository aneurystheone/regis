
import { db, auth } from '../firebase';
import * as mockData from './mockData';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    onSnapshot,
    addDoc
} from "firebase/firestore";
import type { Class, Student, AttendanceRecord, AnecdotalRecord, Competency, EvaluationInstrument, Grade, FundamentalCompetency, TeacherProfileData, JournalEntry, Resource, User, CustomEvent, RecoveryGrade, FontSize, DailyNote, CurriculumData, LessonPlan, AIFeatures, BaseEntity } from '../types';
import { CURRENT_SCHEMA_VERSION } from '../types';

let curriculumCache: CurriculumData | null = null;

// Bus de eventos simple para notificar errores de sincronización
export const syncEvents = {
    listeners: [] as ((hasError: boolean) => void)[],
    subscribe(callback: (hasError: boolean) => void) {
        this.listeners.push(callback);
        return () => { this.listeners = this.listeners.filter(l => l !== callback); };
    },
    notify(hasError: boolean) {
        this.listeners.forEach(l => l(hasError));
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
    ATTENDANCE: 'attendance'
};

const mockFundamentalCompetencies: FundamentalCompetency[] = [
    { id: 'FC1', name: 'Comunicativa', description: 'Expresa e interpreta conceptos, pensamientos, sentimientos y hechos de forma oral y escrita.', group: 'G1' },
    { id: 'FC2', name: 'Pensamiento Lógico, Creativo y Crítico', description: 'Elabora y argumenta sus juicios y opiniones, y aborda la realidad de forma reflexiva.', group: 'G2' },
    { id: 'FC3', name: 'Resolución de Problemas', description: 'Identifica y analiza problemas para generar soluciones efectivas y pertinentes.', group: 'G2' },
    { id: 'FC4', name: 'Ética y Ciudadana', description: 'Actúa con autonomía, responsabilidad y respeto a los principios éticos y democráticos.', group: 'G3' },
    { id: 'FC5', name: 'Científica y Tecnológica', description: 'Aplica el conocimiento científico y tecnológico para comprender y transformar la realidad.', group: 'G4' },
    { id: 'FC6', name: 'Ambiental y de la Salud', description: 'Adopta hábitos de vida saludable y actúa con responsabilidad ante el medio ambiente.', group: 'G4' },
    { id: 'FC7', name: 'Desarrollo Personal y Espiritual', description: 'Desarrolla una autoimagen equilibrada y una relación sana consigo mismo y con los demás.', group: 'G3' },
];

const defaultTeacherProfile: TeacherProfileData = { name: 'Usuario', email: 'usuario@example.com', phone: '', specialization: 'Educación', experienceYears: 0, profilePictureUrl: 'https://ui-avatars.com/api/?name=User&background=random' };

const isVirtualMode = () => localStorage.getItem('regis_virtual_demo') === 'true' || !auth?.currentUser || auth.currentUser.isAnonymous;

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

const getLocal = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(`regis_store_${key}`);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const setLocal = (key: string, data: any) => {
    localStorage.setItem(`regis_store_${key}`, JSON.stringify(data));
    notifyLocalChange(key, data);
};

const getCurrentUserId = () => {
    if (auth?.currentUser?.uid) return auth.currentUser.uid;
    if (isVirtualMode()) return 'DEMO_GUEST_USER';
    return null;
};

// --- Connection Monitoring ---
type ConnectionStatus = 'online' | 'offline';
let connectionStatus: ConnectionStatus = 'online';
const connectionListeners: ((status: ConnectionStatus) => void)[] = [];

const notifyConnectionChange = (status: ConnectionStatus) => {
    if (connectionStatus === status) return;
    connectionStatus = status;
    connectionListeners.forEach(l => l(status));
};

export const monitorConnection = () => {
    if (typeof window === 'undefined') return;

    // 1. Initial check
    checkLatency();

    // 2. Periodic Latency Check (Ping)
    // Runs every 30s to ensure "good" connectivity
    setInterval(checkLatency, 30000);

    // 3. Browser Online/Offline events
    window.addEventListener('online', () => checkLatency());
    window.addEventListener('offline', () => notifyConnectionChange('offline'));
};

const checkLatency = async () => {
    // If browser thinks we are offline, we are offline.
    if (!navigator.onLine) {
        notifyConnectionChange('offline');
        return;
    }

    const start = Date.now();
    try {
        // Fetch a tiny resource or ping a reliable endpoint.
        // Using a simple fetch to a public CDN or just a non-cached resource.
        // Or if we want to stay within firebase, we could try a very cheap read, but public ping is often better for "internet" check.
        // We'll try to fetch the favicon or similar, or just a HEAD request to google.com (might be blocked by cors).
        // Safest is to just assume if Firestore is connected, we are good, BUT the user asked for "Time out function".
        // Let's implement a "race" against a timeout.

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)); // 5s timeout
        // We simulate a ping by just checking if we can write/read a timestamp to a local-only or client-metadata location if possible,
        // OR simply trust navigator.onLine + Firestore.
        // The user specifically asked for "time out function for bad internet".
        // Let's use a fetch to a high-availability simple endpoint that returns 200, like Google's gen_204 or similar if CORS allowed.
        // Actually, let's just use a dummy fetch to the app's own URL (which might be cached, so add timestamp).

        await Promise.race([
            fetch('/?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' }),
            timeoutPromise
        ]);

        // If we get here, latency < 5s
        notifyConnectionChange('online');
    } catch (e) {
        // Timeout or fetch error
        console.warn("Latency check failed or timed out. Switching to offline mode.");
        notifyConnectionChange('offline');
    }
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

function generateId(prefix: string): string {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
}

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
        syncEvents.notify(false);
        return data;
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.error(`Vicente: Permisos insuficientes para ${collectionName}. Usando copia local.`);
            syncEvents.notify(true);
        }

        // If in virtual mode AND firebase failed (or no auth), try template
        if (isVirtualMode() && getLocal(collectionName).length === 0) {
            return api.fetchFromTemplateIfEmpty<T>(collectionName);
        }

        return getLocal<T>(collectionName);
    }
};

const subscribeToCollection = <T extends { id: string }>(collectionName: string, onData: (data: T[]) => void, userIdOverride?: string) => {
    const uid = userIdOverride || getCurrentUserId();

    if (!uid || isVirtualMode()) {
        onData(getLocal<T>(collectionName));
        if (isVirtualMode()) {
            return subscribeToLocal(collectionName, onData);
        }
        return () => { };
    }
    // ...

    const q = query(collection(db, collectionName), where("userId", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => migrateDocument<T>({ id: doc.id, ...doc.data() }, collectionName));
        setLocal(collectionName, data);
        onData(data);
        syncEvents.notify(false);
    }, (error) => {
        if (error.code === 'permission-denied') syncEvents.notify(true);
        console.error(`Error in ${collectionName} subscription:`, error);
        // Fallback to local data on error
        onData(getLocal<T>(collectionName));
    });
};

const fetchBulkList = async <T>(listName: string, defaultData: T[]): Promise<T[]> => {
    const uid = getCurrentUserId();
    if (!uid) return defaultData;
    if (isVirtualMode()) return getLocal<T>(listName);

    try {
        const docName = `${listName}_${uid}`;
        const docSnap = await getDoc(doc(db, COLLECTIONS.LISTS, docName));
        if (docSnap.exists()) {
            const rawItems = (docSnap.data().items as T[]) || [];
            const data = rawItems.map(item => migrateDocument<T>(item, listName));
            setLocal(listName, data);
            syncEvents.notify(false);
            return data;
        }

        // If doc doesn't exist and in virtual mode, try template
        if (isVirtualMode() && getLocal(listName).length === 0) {
            return api.fetchBulkListFromTemplateIfEmpty<T>(listName);
        }

        return getLocal<T>(listName);
    } catch (error: any) {
        if (error.code === 'permission-denied') syncEvents.notify(true);

        if (isVirtualMode() && getLocal(listName).length === 0) {
            return api.fetchBulkListFromTemplateIfEmpty<T>(listName);
        }

        return getLocal<T>(listName);
    }
};

const subscribeToBulkList = <T>(listName: string, onData: (data: T[]) => void, userIdOverride?: string) => {
    const uid = userIdOverride || getCurrentUserId();

    if (!uid || isVirtualMode()) {
        onData(getLocal<T>(listName));
        if (isVirtualMode()) {
            return subscribeToLocal(listName, onData);
        }
        return () => { };
    }

    const docName = `${listName}_${uid}`;

    // In Virtual Mode, we rely on api.fetchBulkList to trigger any template population
    if (isVirtualMode()) {
        const localData = getLocal<T>(listName);
        onData(localData);
        return () => { };
    }

    return onSnapshot(doc(db, COLLECTIONS.LISTS, docName), (snapshot) => {
        if (snapshot.exists()) {
            const rawItems = (snapshot.data().items as T[]) || [];
            const data = rawItems.map(item => migrateDocument<T>(item, listName));
            setLocal(listName, data);
            onData(data);
            syncEvents.notify(false);
        } else {
            onData([]);
        }
    }, (error) => {
        if (error.code === 'permission-denied') syncEvents.notify(true);
        console.error(`Error in ${listName} bulk subscription:`, error);
        onData(getLocal<T>(listName));
    });
};

const saveBulkList = async <T>(listName: string, items: T[]): Promise<void> => {
    setLocal(listName, items);
    const uid = getCurrentUserId();
    if (isVirtualMode() || !uid) return;

    try {
        const docName = `${listName}_${uid}`;
        // Inject schema version into each item for consistency
        const versionedItems = items.map(item => ({ ...item, schemaVersion: CURRENT_SCHEMA_VERSION }));
        await setDoc(doc(db, COLLECTIONS.LISTS, docName), { items: sanitizeData(versionedItems), userId: uid });
        syncEvents.notify(false);
    } catch (error: any) {
        console.error(`Error saving bulk list ${listName}:`, error);
        if (error.code === 'permission-denied') syncEvents.notify(true);
    }
};

export const api = {
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
                batch.set(docRef, sanitizeData({ ...item, userId: templateUid, schemaVersion: CURRENT_SCHEMA_VERSION }));
            });
        };

        addToBatch(COLLECTIONS.CLASSES, mockData.mockClasses);
        addToBatch(COLLECTIONS.STUDENTS, mockData.mockStudents);
        addToBatch(COLLECTIONS.INSTRUMENTS, mockData.mockInstruments);
        addToBatch(COLLECTIONS.USER_COMPETENCIES, mockData.mockCompetencies);

        // Special case for list-based data if any (none yet in mockData but just in case)

        // Special case for Teacher Profile
        batch.set(doc(db, COLLECTIONS.TEACHER_PROFILE, templateUid), sanitizeData({ ...mockData.mockTeacherProfile, userId: templateUid }));

        await batch.commit();
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

    async getClasses(): Promise<Class[]> { return fetchCollection<Class>(COLLECTIONS.CLASSES); },
    async addClass(classData: Class | Omit<Class, 'id'>): Promise<Class[]> {
        const uid = getCurrentUserId();
        const newId = (classData as any).id || generateId('C');
        const newClass: Class = { ...classData, id: newId } as Class;

        const current = getLocal<Class>(COLLECTIONS.CLASSES);
        setLocal(COLLECTIONS.CLASSES, [...current, newClass]);

        if (!isVirtualMode() && uid) {
            try { await setDoc(doc(db, COLLECTIONS.CLASSES, newId), sanitizeData({ ...newClass, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return this.getClasses();
    },
    async updateClass(classId: string, updatedData: Omit<Class, 'id'>): Promise<Class[]> {
        const current = getLocal<Class>(COLLECTIONS.CLASSES).map(c => c.id === classId ? { ...updatedData, id: classId } : c);
        setLocal(COLLECTIONS.CLASSES, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.CLASSES, classId), sanitizeData({ ...updatedData, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            batch.delete(doc(db, COLLECTIONS.CLASSES, classId));
            batch.set(doc(db, COLLECTIONS.DELETED_CLASSES, classId), sanitizeData({ ...classToMove, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            batch.delete(doc(db, COLLECTIONS.DELETED_CLASSES, classId));
            batch.set(doc(db, COLLECTIONS.CLASSES, classId), sanitizeData({ ...classToRestore, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return { classes: newClasses, deletedClasses: newDeleted };
    },

    async permanentlyDeleteClass(classId: string): Promise<{ deletedClasses: Class[] }> {
        const newDeleted = getLocal<Class>(COLLECTIONS.DELETED_CLASSES).filter(c => c.id !== classId);
        setLocal(COLLECTIONS.DELETED_CLASSES, newDeleted);

        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.DELETED_CLASSES, classId)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return { deletedClasses: newDeleted };
    },

    async getStudents(): Promise<Student[]> { return fetchCollection<Student>(COLLECTIONS.STUDENTS); },
    async addStudent(studentData: Omit<Student, 'id'>): Promise<Student[]> {
        const uid = getCurrentUserId();

        // Generate Standardized ID (ST-YYYY-XXXX)
        const current = getLocal<Student>(COLLECTIONS.STUDENTS);
        const year = new Date().getFullYear();

        // Find the highest sequence number currently in use for this year
        const yearPrefix = `ST-${year}-`;
        const yearStudents = current.filter(s => s.id.startsWith(yearPrefix));

        let maxSequence = 0;
        yearStudents.forEach(s => {
            const seqPart = s.id.replace(yearPrefix, '');
            const seqNum = parseInt(seqPart, 10);
            if (!isNaN(seqNum) && seqNum > maxSequence) {
                maxSequence = seqNum;
            }
        });

        const newSequence = (maxSequence + 1).toString().padStart(4, '0');
        // Automatic numbering logic
        const classStudents = current.filter(s => s.classId === studentData.classId);
        const nextOrderNumber = classStudents.length > 0
            ? Math.max(...classStudents.map(s => s.orderNumber || 0)) + 1
            : 1;

        const newId = `${yearPrefix}${newSequence}`;
        const newStudent: Student = { ...studentData, id: newId, orderNumber: nextOrderNumber };

        setLocal(COLLECTIONS.STUDENTS, [...current, newStudent]);

        if (!isVirtualMode() && uid) {
            try {
                console.log('Attempting to save student to Firestore:', {
                    studentId: newId,
                    userId: uid,
                    isVirtual: isVirtualMode(),
                    authUser: auth?.currentUser?.uid
                });
                await setDoc(doc(db, COLLECTIONS.STUDENTS, newId), sanitizeData({ ...newStudent, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }));
                console.log('Student saved successfully to Firestore');
            } catch (e: any) {
                console.error("Error saving student:", e);
                console.error("Error details:", { code: e.code, message: e.message, uid, isVirtual: isVirtualMode() });
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        } else {
            console.log('Skipping Firestore save (virtual mode or no uid):', { isVirtual: isVirtualMode(), uid });
        }
        return this.getStudents();
    },
    async addStudents(studentsData: Omit<Student, 'id'>[]): Promise<Student[]> {
        const uid = getCurrentUserId();
        const current = getLocal<Student>(COLLECTIONS.STUDENTS);

        const year = new Date().getFullYear();
        const yearPrefix = `ST-${year}-`;

        // Find the current max sequence
        let maxSequence = 0;
        current.filter(s => s.id.startsWith(yearPrefix)).forEach(s => {
            const seqNum = parseInt(s.id.replace(yearPrefix, ''), 10);
            if (!isNaN(seqNum) && seqNum > maxSequence) {
                maxSequence = seqNum;
            }
        });

        const classId = studentsData[0]?.classId;
        const classStudentsCount = current.filter(s => s.classId === classId).length;
        let nextOrderNumber = classStudentsCount > 0
            ? Math.max(...current.filter(s => s.classId === classId).map(s => s.orderNumber || 0)) + 1
            : 1;

        let currentSequence = maxSequence;
        const newStudents = studentsData.map(s => {
            currentSequence++;
            const seqNumber = nextOrderNumber++;
            const sequence = currentSequence.toString().padStart(4, '0');
            return {
                ...s,
                id: `ST-${year}-${sequence}`,
                orderNumber: seqNumber
            };
        });

        setLocal(COLLECTIONS.STUDENTS, [...current, ...newStudents]);

        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            newStudents.forEach(s => batch.set(doc(db, COLLECTIONS.STUDENTS, s.id), sanitizeData({ ...s, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return this.getStudents();
    },
    async setStudents(students: Student[]): Promise<void> {
        setLocal(COLLECTIONS.STUDENTS, students);
        const uid = getCurrentUserId();
        if (isVirtualMode() || !uid) return;
        const batch = writeBatch(db);
        students.forEach(s => batch.set(doc(db, COLLECTIONS.STUDENTS, s.id), sanitizeData({ ...s, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })));
        try { await batch.commit(); } catch (e: any) {
            console.error("Error saving students batch:", e);
            if (e.code === 'permission-denied') syncEvents.notify(true);
        }
    },
    async updateStudent(studentId: string, studentData: Partial<Student>): Promise<void> {
        const current = getLocal<Student>(COLLECTIONS.STUDENTS).map(s => s.id === studentId ? { ...s, ...studentData } : s);
        setLocal(COLLECTIONS.STUDENTS, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.STUDENTS, studentId), sanitizeData({ ...studentData, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
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
            studentsToMove.forEach(s => {
                batch.delete(doc(db, COLLECTIONS.STUDENTS, s.id));
                batch.set(doc(db, COLLECTIONS.DELETED_STUDENTS, s.id), sanitizeData({ ...s, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }));
            });
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            batch.delete(doc(db, COLLECTIONS.DELETED_STUDENTS, studentToRestore.id));
            batch.set(doc(db, COLLECTIONS.STUDENTS, studentToRestore.id), sanitizeData({ ...studentToRestore, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION }));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return { students: newStudents, deletedStudents: newDeleted };
    },
    async permanentlyDeleteStudent(studentId: string): Promise<{ deletedStudents: Student[], attendance: AttendanceRecord[], anecdotes: AnecdotalRecord[], grades: Grade[] }> {
        const newDeleted = getLocal<Student>(COLLECTIONS.DELETED_STUDENTS).filter(s => s.id !== studentId);
        setLocal(COLLECTIONS.DELETED_STUDENTS, newDeleted);

        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.DELETED_STUDENTS, studentId)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            updated.filter(s => s.classId === classId).forEach(s => {
                const docRef = doc(db, COLLECTIONS.STUDENTS, s.id);
                batch.update(docRef, { orderNumber: s.orderNumber });
            });
            try {
                await batch.commit();
            } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }

        return this.getStudents();
    },

    async getAttendance(): Promise<AttendanceRecord[]> { return fetchBulkList('attendance', []); },
    async setAttendance(attendance: AttendanceRecord[]): Promise<void> { return saveBulkList('attendance', attendance); },
    async getDailyNotes(): Promise<DailyNote[]> { return fetchBulkList('daily_notes', []); },
    async setDailyNotes(notes: DailyNote[]): Promise<void> { return saveBulkList('daily_notes', notes); },

    async getAnecdotes(): Promise<AnecdotalRecord[]> { return fetchCollection<AnecdotalRecord>(COLLECTIONS.ANECDOTES); },
    async addAnecdotes(newRecords: AnecdotalRecord[]): Promise<AnecdotalRecord[]> {
        const uid = getCurrentUserId();
        const current = getLocal<AnecdotalRecord>(COLLECTIONS.ANECDOTES);
        const updated = [...current, ...newRecords];
        setLocal(COLLECTIONS.ANECDOTES, updated);
        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            newRecords.forEach(r => batch.set(doc(db, COLLECTIONS.ANECDOTES, r.id), sanitizeData({ ...r, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            newComps.forEach(c => batch.set(doc(db, COLLECTIONS.USER_COMPETENCIES, c.id), sanitizeData({ ...c, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },
    async updateCompetency(competencyId: string, updatedData: Omit<Competency, 'id'>): Promise<Competency[]> {
        const current = getLocal<Competency>(COLLECTIONS.USER_COMPETENCIES).map(c => c.id === competencyId ? { ...updatedData, id: competencyId } : c);
        setLocal(COLLECTIONS.USER_COMPETENCIES, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.USER_COMPETENCIES, competencyId), sanitizeData({ ...updatedData, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return current;
    },
    async deleteCompetency(competencyId: string): Promise<Competency[]> {
        const current = getLocal<Competency>(COLLECTIONS.USER_COMPETENCIES).filter(c => c.id !== competencyId);
        setLocal(COLLECTIONS.USER_COMPETENCIES, current);
        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.USER_COMPETENCIES, competencyId)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return current;
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
            try { await setDoc(doc(db, COLLECTIONS.INSTRUMENTS, newId), sanitizeData({ ...newInst, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },
    async updateInstrument(instrumentId: string, updatedData: Omit<EvaluationInstrument, 'id'>): Promise<EvaluationInstrument[]> {
        const current = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS).map(i => i.id === instrumentId ? { ...updatedData, id: instrumentId } : i);
        setLocal(COLLECTIONS.INSTRUMENTS, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.INSTRUMENTS, instrumentId), sanitizeData({ ...updatedData, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return current;
    },

    async getGrades(): Promise<Grade[]> { return fetchBulkList('grades', []); },
    async setGrades(grades: Grade[]): Promise<void> { return saveBulkList('grades', grades); },
    async saveGrade(grade: Grade): Promise<void> {
        const uid = getCurrentUserId();
        if (!uid) return;
        const grades = getLocal<Grade>('grades'); // Using string literal 'grades' as per existing saveBulkList usage

        const existingIndex = grades.findIndex(g => g.studentId === grade.studentId && g.instrumentId === grade.instrumentId);

        const dataToSave = { ...grade, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION };

        if (existingIndex >= 0) {
            grades[existingIndex] = { ...grades[existingIndex], ...grade };
        } else {
            grades.push({ ...grade, id: generateId('G'), userId: uid });
        }
        setLocal('grades', grades); // Using string literal 'grades'

        if (!isVirtualMode()) {
            try {
                const q = query(
                    collection(db, COLLECTIONS.GRADES),
                    where("studentId", "==", grade.studentId),
                    where("instrumentId", "==", grade.instrumentId),
                    where("userId", "==", uid)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    await updateDoc(doc(db, COLLECTIONS.GRADES, snapshot.docs[0].id), sanitizeData(dataToSave));
                } else {
                    await addDoc(collection(db, COLLECTIONS.GRADES), sanitizeData(dataToSave));
                }
            } catch (e: any) {
                console.error("Error saving grade:", e);
                if (e.code === 'permission-denied') syncEvents.notify(true);
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

    async getTeacherProfile(): Promise<TeacherProfileData> {
        const uid = getCurrentUserId();
        if (isVirtualMode()) return JSON.parse(localStorage.getItem('regis_profile') || JSON.stringify(defaultTeacherProfile));
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
        } catch { return defaultTeacherProfile; }
    },
    async setTeacherProfile(profile: TeacherProfileData): Promise<void> {
        localStorage.setItem('regis_profile', JSON.stringify(profile));
        notifyLocalChange('teacher_profile', profile);
        const uid = getCurrentUserId();
        if (isVirtualMode() || !uid) return;
        try { await setDoc(doc(db, COLLECTIONS.TEACHER_PROFILE, uid), sanitizeData({ ...profile, userId: uid })); } catch (e: any) {
            if (e.code === 'permission-denied') syncEvents.notify(true);
        }
    },

    async getJournalEntries(): Promise<JournalEntry[]> { return fetchCollection<JournalEntry>(COLLECTIONS.JOURNAL); },
    async addJournalEntry(content: string): Promise<JournalEntry[]> {
        const uid = getCurrentUserId();
        const newId = generateId('J');
        const newEntry: JournalEntry = { id: newId, date: new Date().toISOString(), content };
        const current = getLocal<JournalEntry>(COLLECTIONS.JOURNAL);
        const updated = [...current, newEntry];
        setLocal(COLLECTIONS.JOURNAL, updated);
        if (!isVirtualMode() && uid) {
            try { await setDoc(doc(db, COLLECTIONS.JOURNAL, newId), sanitizeData({ ...newEntry, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
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
            try { await setDoc(doc(db, COLLECTIONS.RESOURCES, newId), sanitizeData({ ...newRes, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            const dataToSave = { ...record, userId: uid, schemaVersion: CURRENT_SCHEMA_VERSION };
            const docId = `${record.studentId}_${record.date}`;
            try {
                await setDoc(doc(db, COLLECTIONS.ATTENDANCE, docId), sanitizeData(dataToSave));
            } catch (e: any) {
                console.error("Error saving attendance:", e);
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            try { await setDoc(doc(db, COLLECTIONS.CUSTOM_EVENTS, newId), sanitizeData({ ...newEvent, userId: uid })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },
    async updateCustomEvent(eventId: string, updatedData: Omit<CustomEvent, 'id'>): Promise<CustomEvent[]> {
        const current = getLocal<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS).map(e => e.id === eventId ? { ...updatedData, id: eventId } : e);
        setLocal(COLLECTIONS.CUSTOM_EVENTS, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.CUSTOM_EVENTS, eventId), sanitizeData(updatedData)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return current;
    },
    async deleteCustomEvent(eventId: string): Promise<CustomEvent[]> {
        const current = getLocal<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS).filter(e => e.id !== eventId);
        setLocal(COLLECTIONS.CUSTOM_EVENTS, current);
        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.CUSTOM_EVENTS, eventId)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
            try { await setDoc(doc(db, COLLECTIONS.LESSON_PLANS, newId), sanitizeData({ ...newPlan, userId: uid })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },
    async updateLessonPlan(planId: string, updatedData: Omit<LessonPlan, 'id'>): Promise<LessonPlan[]> {
        const current = getLocal<LessonPlan>(COLLECTIONS.LESSON_PLANS).map(p => p.id === planId ? { ...updatedData, id: planId } : p);
        setLocal(COLLECTIONS.LESSON_PLANS, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.LESSON_PLANS, planId), sanitizeData(updatedData)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return current;
    },
    async deleteLessonPlan(planId: string): Promise<LessonPlan[]> {
        const current = getLocal<LessonPlan>(COLLECTIONS.LESSON_PLANS).filter(p => p.id !== planId);
        setLocal(COLLECTIONS.LESSON_PLANS, current);
        if (!isVirtualMode()) {
            try { await deleteDoc(doc(db, COLLECTIONS.LESSON_PLANS, planId)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
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
                await setDoc(doc(db, COLLECTIONS.APP_CONFIG, 'global_ai_features'), { features: sanitizeData(features) });
            } catch (error) {
                console.error("Error saving AI features:", error);
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
    onAttendanceChange(callback: (attendance: AttendanceRecord[]) => void, uid?: string) { return subscribeToBulkList<AttendanceRecord>('attendance', callback, uid); },
    onDailyNotesChange(callback: (notes: DailyNote[]) => void, uid?: string) { return subscribeToBulkList<DailyNote>('daily_notes', callback, uid); },
    onAnecdotesChange(callback: (anecdotes: AnecdotalRecord[]) => void, uid?: string) { return subscribeToCollection<AnecdotalRecord>(COLLECTIONS.ANECDOTES, callback, uid); },
    onInstrumentsChange(callback: (instruments: EvaluationInstrument[]) => void, uid?: string) { return subscribeToCollection<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS, callback, uid); },
    onGradesChange(callback: (grades: Grade[]) => void, uid?: string) { return subscribeToBulkList<Grade>('grades', callback, uid); },
    onRecoveryGradesChange(callback: (grades: RecoveryGrade[]) => void, uid?: string) { return subscribeToBulkList<RecoveryGrade>('recovery_grades', callback, uid); },
    onCompetenciesChange(callback: (competencies: Competency[]) => void, uid?: string) { return subscribeToCollection<Competency>(COLLECTIONS.USER_COMPETENCIES, callback, uid); },
    onJournalChange(callback: (entries: JournalEntry[]) => void, uid?: string) { return subscribeToCollection<JournalEntry>(COLLECTIONS.JOURNAL, callback, uid); },
    onResourcesChange(callback: (resources: Resource[]) => void, uid?: string) { return subscribeToCollection<Resource>(COLLECTIONS.RESOURCES, callback, uid); },
    onEventsChange(callback: (events: CustomEvent[]) => void, uid?: string) { return subscribeToCollection<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS, callback, uid); },
    onLessonPlansChange(callback: (plans: LessonPlan[]) => void, uid?: string) { return subscribeToCollection<LessonPlan>(COLLECTIONS.LESSON_PLANS, callback, uid); },
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
            console.error('Vicente Debug: Teacher profile subscription error:', error);
            // On permission error or any other, provide fallback
            callback({
                ...defaultTeacherProfile,
                name: auth.currentUser?.displayName || (userIdOverride ? 'Usuario' : defaultTeacherProfile.name),
                email: auth.currentUser?.email || (userIdOverride ? '' : defaultTeacherProfile.email),
                profilePictureUrl: auth.currentUser?.photoURL || defaultTeacherProfile.profilePictureUrl,
                _isFallback: true
            } as any);
        };

        console.log('Vicente Debug: Subscribing to teacher profile', uid);
        return onSnapshot(doc(db, COLLECTIONS.TEACHER_PROFILE, uid), (snapshot) => {
            console.log('Vicente Debug: Teacher profile snapshot exists:', snapshot.exists());
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
    monitorConnection,
    subscribeToConnectionStatus,
};

if (typeof window !== 'undefined') (window as any).api = api;
