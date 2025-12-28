
import { db, auth } from '../firebase';
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
    where
} from "firebase/firestore";
import type { Class, Student, AttendanceRecord, AnecdotalRecord, Competency, EvaluationInstrument, Grade, FundamentalCompetency, TeacherProfileData, JournalEntry, Resource, User, CustomEvent, RecoveryGrade, FontSize, DailyNote, CurriculumData, LessonPlan } from '../types';

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
    INSTRUMENTS: 'instruments',
    ANECDOTES: 'anecdotes',
    USER_COMPETENCIES: 'user_competencies',
    FUNDAMENTAL_COMPETENCIES: 'fundamental_competencies',
    TEACHER_PROFILE: 'teacher_profile',
    JOURNAL: 'journal',
    RESOURCES: 'resources',
    CUSTOM_EVENTS: 'custom_events',
    LISTS: 'lists',
    LESSON_PLANS: 'lesson_plans'
};

const mockFundamentalCompetencies: FundamentalCompetency[] = [
    { id: 'FC1', name: 'Ética y Ciudadana', description: 'Actúa con autonomía, responsabilidad y respeto a los principios éticos y democráticos.', group: 'G3' },
    { id: 'FC2', name: 'Comunicativa', description: 'Expresa e interpreta conceptos, pensamientos, sentimientos y hechos de forma oral y escrita.', group: 'G1' },
    { id: 'FC3', name: 'Pensamiento Lógico, Creativo y Crítico', description: 'Elabora y argumenta sus juicios y opiniones, y aborda la realidad de forma reflexiva.', group: 'G2' },
    { id: 'FC4', name: 'Resolución de Problemas', description: 'Identifica y analiza problemas para generar soluciones efectivas y pertinentes.', group: 'G2' },
    { id: 'FC5', name: 'Científica y Tecnológica', description: 'Aplica el conocimiento científico y tecnológico para comprender y transformar la realidad.', group: 'G4' },
    { id: 'FC6', name: 'Ambiental y de la Salud', description: 'Adopta hábitos de vida saludable y actúa con responsabilidad ante el medio ambiente.', group: 'G4' },
    { id: 'FC7', name: 'Desarrollo Personal y Espiritual', description: 'Desarrolla una autoimagen equilibrada y una relación sana consigo mismo y con los demás.', group: 'G3' },
];

const defaultTeacherProfile: TeacherProfileData = { name: 'Usuario', email: 'usuario@example.com', phone: '', specialization: 'Educación', experienceYears: 0, profilePictureUrl: 'https://ui-avatars.com/api/?name=User&background=random' };

const isVirtualMode = () => localStorage.getItem('regis_virtual_demo') === 'true' || !auth?.currentUser;

const getLocal = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(`regis_store_${key}`);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const setLocal = (key: string, data: any) => {
    localStorage.setItem(`regis_store_${key}`, JSON.stringify(data));
};

const getCurrentUserId = () => {
    if (auth?.currentUser?.uid) return auth.currentUser.uid;
    if (isVirtualMode()) return 'DEMO_GUEST_USER';
    return null;
};

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

const fetchCollection = async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
    const uid = getCurrentUserId();
    if (!uid) return [];
    if (isVirtualMode()) return getLocal<T>(collectionName);

    try {
        const q = query(collection(db, collectionName), where("userId", "==", uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ ...doc.data() as T, id: doc.id }));
        setLocal(collectionName, data);
        syncEvents.notify(false);
        return data;
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.error(`Vicente: Permisos insuficientes para ${collectionName}. Usando copia local.`);
            syncEvents.notify(true);
        }
        return getLocal<T>(collectionName);
    }
};

const fetchBulkList = async <T>(listName: string, defaultData: T[]): Promise<T[]> => {
    const uid = getCurrentUserId();
    if (!uid) return defaultData;
    if (isVirtualMode()) return getLocal<T>(listName);

    try {
        const docName = `${listName}_${uid}`;
        const docSnap = await getDoc(doc(db, COLLECTIONS.LISTS, docName));
        if (docSnap.exists()) {
            const data = (docSnap.data().items as T[]) || [];
            setLocal(listName, data);
            syncEvents.notify(false);
            return data;
        }
        return getLocal<T>(listName);
    } catch (error: any) {
        if (error.code === 'permission-denied') syncEvents.notify(true);
        return getLocal<T>(listName);
    }
};

const saveBulkList = async <T>(listName: string, items: T[]): Promise<void> => {
    setLocal(listName, items);
    const uid = getCurrentUserId();
    if (isVirtualMode() || !uid) return;

    try {
        const docName = `${listName}_${uid}`;
        await setDoc(doc(db, COLLECTIONS.LISTS, docName), { items: sanitizeData(items), userId: uid });
        syncEvents.notify(false);
    } catch (error: any) {
        if (error.code === 'permission-denied') syncEvents.notify(true);
    }
};

export const api = {
    async seedDemoData(): Promise<void> {
        const classes = await this.getClasses();
        if (classes.length === 0) {
            const classId = `C_SEED_${Date.now()}`;
            const demoClass: Class = {
                id: classId, name: 'Ciencias Sociales', grade: '4to', section: 'B',
                schoolYear: '2024-2025', schedule: 'Mañanas', color: '#1F3A5F', level: 'Nivel Secundario'
            };
            await this.addClass(demoClass);
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
    async addClass(classData: Omit<Class, 'id'>): Promise<Class[]> {
        const uid = getCurrentUserId();
        const newId = `C${Date.now()}`;
        const newClass: Class = { ...classData, id: newId };

        const current = getLocal<Class>(COLLECTIONS.CLASSES);
        setLocal(COLLECTIONS.CLASSES, [...current, newClass]);

        if (!isVirtualMode() && uid) {
            try { await setDoc(doc(db, COLLECTIONS.CLASSES, newId), sanitizeData({ ...newClass, userId: uid })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return this.getClasses();
    },
    async updateClass(classId: string, updatedData: Omit<Class, 'id'>): Promise<Class[]> {
        const current = getLocal<Class>(COLLECTIONS.CLASSES).map(c => c.id === classId ? { ...updatedData, id: classId } : c);
        setLocal(COLLECTIONS.CLASSES, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.CLASSES, classId), sanitizeData(updatedData)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return this.getClasses();
    },

    async getStudents(): Promise<Student[]> { return fetchCollection<Student>(COLLECTIONS.STUDENTS); },
    async addStudent(studentData: Omit<Student, 'id'>): Promise<Student[]> {
        const uid = getCurrentUserId();

        // Generate Standardized ID (ST-YYYY-XXXX)
        const current = getLocal<Student>(COLLECTIONS.STUDENTS);
        const year = new Date().getFullYear();
        // Count students from current year to determine sequence
        const currentYearCount = current.filter(s => s.id.startsWith(`ST-${year}`)).length;
        const sequence = (currentYearCount + 1).toString().padStart(4, '0');
        const newId = `ST-${year}-${sequence}`;

        const newStudent: Student = { ...studentData, id: newId };

        setLocal(COLLECTIONS.STUDENTS, [...current, newStudent]);

        if (!isVirtualMode() && uid) {
            try { await setDoc(doc(db, COLLECTIONS.STUDENTS, newId), sanitizeData({ ...newStudent, userId: uid })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return this.getStudents();
    },
    async addStudents(studentsData: Omit<Student, 'id'>[]): Promise<Student[]> {
        const uid = getCurrentUserId();
        const current = getLocal<Student>(COLLECTIONS.STUDENTS);

        const year = new Date().getFullYear();
        let currentSequence = current.filter(s => s.id.startsWith(`ST-${year}`)).length;

        const newStudents = studentsData.map(s => {
            currentSequence++;
            const sequence = currentSequence.toString().padStart(4, '0');
            return {
                ...s,
                id: `ST-${year}-${sequence}`
            };
        });

        setLocal(COLLECTIONS.STUDENTS, [...current, ...newStudents]);

        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            newStudents.forEach(s => batch.set(doc(db, COLLECTIONS.STUDENTS, s.id), sanitizeData({ ...s, userId: uid })));
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
        students.forEach(s => batch.set(doc(db, COLLECTIONS.STUDENTS, s.id), sanitizeData({ ...s, userId: uid })));
        try { await batch.commit(); } catch (e: any) {
            if (e.code === 'permission-denied') syncEvents.notify(true);
        }
    },
    async updateStudent(studentId: string, studentData: Partial<Student>): Promise<void> {
        const current = getLocal<Student>(COLLECTIONS.STUDENTS).map(s => s.id === studentId ? { ...s, ...studentData } : s);
        setLocal(COLLECTIONS.STUDENTS, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.STUDENTS, studentId), sanitizeData(studentData)); } catch (e: any) {
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
                batch.set(doc(db, COLLECTIONS.DELETED_STUDENTS, s.id), sanitizeData({ ...s, userId: uid }));
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
            batch.set(doc(db, COLLECTIONS.STUDENTS, studentToRestore.id), sanitizeData({ ...studentToRestore, userId: uid }));
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
            grades: await this.getGrades()
        };
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
            newRecords.forEach(r => batch.set(doc(db, COLLECTIONS.ANECDOTES, r.id), sanitizeData({ ...r, userId: uid })));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },

    async getFundamentalCompetencies(): Promise<FundamentalCompetency[]> { return mockFundamentalCompetencies; },
    async getCompetencies(): Promise<Competency[]> { return fetchCollection<Competency>(COLLECTIONS.USER_COMPETENCIES); },
    async addCompetencies(competenciesData: Omit<Competency, 'id'>[]): Promise<Competency[]> {
        const uid = getCurrentUserId();
        const newComps = competenciesData.map(c => ({ ...c, id: `COMP${Date.now()}${Math.random().toString(36).substr(2, 5)}` }));
        const current = getLocal<Competency>(COLLECTIONS.USER_COMPETENCIES);
        const updated = [...current, ...newComps];
        setLocal(COLLECTIONS.USER_COMPETENCIES, updated);
        if (!isVirtualMode() && uid) {
            const batch = writeBatch(db);
            newComps.forEach(c => batch.set(doc(db, COLLECTIONS.USER_COMPETENCIES, c.id), sanitizeData({ ...c, userId: uid })));
            try { await batch.commit(); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },

    async getInstruments(): Promise<EvaluationInstrument[]> { return fetchCollection<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS); },
    async addInstrument(instrumentData: Omit<EvaluationInstrument, 'id'>): Promise<EvaluationInstrument[]> {
        const uid = getCurrentUserId();
        const newId = `INST${Date.now()}`;
        const newInst: EvaluationInstrument = { ...instrumentData, id: newId };
        const current = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS);
        const updated = [...current, newInst];
        setLocal(COLLECTIONS.INSTRUMENTS, updated);
        if (!isVirtualMode() && uid) {
            try { await setDoc(doc(db, COLLECTIONS.INSTRUMENTS, newId), sanitizeData({ ...newInst, userId: uid })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },
    async updateInstrument(instrumentId: string, updatedData: Omit<EvaluationInstrument, 'id'>): Promise<EvaluationInstrument[]> {
        const current = getLocal<EvaluationInstrument>(COLLECTIONS.INSTRUMENTS).map(i => i.id === instrumentId ? { ...updatedData, id: instrumentId } : i);
        setLocal(COLLECTIONS.INSTRUMENTS, current);
        if (!isVirtualMode()) {
            try { await updateDoc(doc(db, COLLECTIONS.INSTRUMENTS, instrumentId), sanitizeData(updatedData)); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return current;
    },

    async getGrades(): Promise<Grade[]> { return fetchBulkList('grades', []); },
    async setGrades(grades: Grade[]): Promise<void> { return saveBulkList('grades', grades); },
    async getRecoveryGrades(): Promise<RecoveryGrade[]> { return fetchBulkList('recovery_grades', []); },
    async saveRecoveryGrade(newGrade: Omit<RecoveryGrade, 'id'>): Promise<RecoveryGrade[]> {
        const current = getLocal<RecoveryGrade>('recovery_grades');
        const idx = current.findIndex(rg => rg.studentId === newGrade.studentId && rg.period === newGrade.period && rg.competencyGroup === newGrade.competencyGroup);
        let updated;
        if (idx > -1) {
            updated = [...current];
            updated[idx] = { ...newGrade, id: current[idx].id };
        } else {
            updated = [...current, { ...newGrade, id: `RG${Date.now()}` }];
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
            return docSnap.exists() ? docSnap.data() as TeacherProfileData : defaultTeacherProfile;
        } catch { return defaultTeacherProfile; }
    },
    async setTeacherProfile(profile: TeacherProfileData): Promise<void> {
        localStorage.setItem('regis_profile', JSON.stringify(profile));
        const uid = getCurrentUserId();
        if (isVirtualMode() || !uid) return;
        try { await setDoc(doc(db, COLLECTIONS.TEACHER_PROFILE, uid), sanitizeData({ ...profile, userId: uid })); } catch (e: any) {
            if (e.code === 'permission-denied') syncEvents.notify(true);
        }
    },

    async getJournalEntries(): Promise<JournalEntry[]> { return fetchCollection<JournalEntry>(COLLECTIONS.JOURNAL); },
    async addJournalEntry(content: string): Promise<JournalEntry[]> {
        const uid = getCurrentUserId();
        const newId = `J${Date.now()}`;
        const newEntry: JournalEntry = { id: newId, date: new Date().toISOString(), content };
        const current = getLocal<JournalEntry>(COLLECTIONS.JOURNAL);
        const updated = [...current, newEntry];
        setLocal(COLLECTIONS.JOURNAL, updated);
        if (!isVirtualMode() && uid) {
            try { await setDoc(doc(db, COLLECTIONS.JOURNAL, newId), sanitizeData({ ...newEntry, userId: uid })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },

    async getResources(): Promise<Resource[]> { return fetchCollection<Resource>(COLLECTIONS.RESOURCES); },
    async addResource(title: string, url: string, description: string): Promise<Resource[]> {
        const uid = getCurrentUserId();
        const newId = `R${Date.now()}`;
        const newRes: Resource = { id: newId, title, url, description };
        const current = getLocal<Resource>(COLLECTIONS.RESOURCES);
        const updated = [...current, newRes];
        setLocal(COLLECTIONS.RESOURCES, updated);
        if (!isVirtualMode() && uid) {
            try { await setDoc(doc(db, COLLECTIONS.RESOURCES, newId), sanitizeData({ ...newRes, userId: uid })); } catch (e: any) {
                if (e.code === 'permission-denied') syncEvents.notify(true);
            }
        }
        return updated;
    },

    async getCustomEvents(): Promise<CustomEvent[]> { return fetchCollection<CustomEvent>(COLLECTIONS.CUSTOM_EVENTS); },
    async addCustomEvent(eventData: Omit<CustomEvent, 'id'>): Promise<CustomEvent[]> {
        const uid = getCurrentUserId();
        const newId = `E${Date.now()}`;
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
        const newId = `LP${Date.now()}`;
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
    async setLastSelectedClassId(classId: string): Promise<void> { localStorage.setItem('teacherkit-lastSelectedClassId', classId); }
};
