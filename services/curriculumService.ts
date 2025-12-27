
import { db } from '../firebase';
import { doc, writeBatch, collection, getDocs, query, where, getDoc } from "firebase/firestore";
import type { CurriculumData, FirestoreCurriculum, FirestoreCompetency, FirestoreIndicator } from '../types';

// --- MIGRATION / SEEDER ---

export const uploadCurriculumData = async () => {
  if (!db) {
      throw new Error("Firebase no está configurado. Revise firebase.ts.");
  }

  try {
    console.log("Iniciando migración fragmentada...");
    const batch = writeBatch(db);
    let opCount = 0;
    const MAX_BATCH_SIZE = 450;

    // 1. Load Curriculums
    const curriculumsRes = await fetch('/data/curriculums.json');
    if (!curriculumsRes.ok) throw new Error('No se pudo leer data/curriculums.json');
    const curriculums: FirestoreCurriculum[] = await curriculumsRes.json();

    // 2. Load Competencies (Fragmented)
    const competencyFiles = [
        '/data/competencies_sociales.json',
        '/data/competencies_sociales_sec_2ciclo.json',
        '/data/competencies_matematica.json',
        '/data/competencies_lengua.json',
        '/data/competencies_naturales_sec_1ciclo.json',
        // Add more as needed, failing silently if not found is safer for partial updates
    ];

    let allCompetencies: FirestoreCompetency[] = [];
    for (const file of competencyFiles) {
        try {
            const res = await fetch(file);
            if (res.ok) {
                const comps: FirestoreCompetency[] = await res.json();
                allCompetencies = [...allCompetencies, ...comps];
            }
        } catch (e) {
            console.warn(`Skipping ${file}:`, e);
        }
    }

    // 3. Process Curriculums
    for (const curr of curriculums) {
        const curriculumRef = doc(db, "curriculums", curr.id);
        batch.set(curriculumRef, curr);
        opCount++;
    }

    // 4. Process Competencies and Indicators
    for (const comp of allCompetencies) {
        // Create Competency Document
        const compRef = doc(db, "competencies", comp.code);
        batch.set(compRef, comp);
        opCount++;

        // Create Indicator Documents
        if (comp.indicators) {
            for (const ind of comp.indicators) {
                const indRef = doc(db, "indicators", ind.id);
                const indicatorData: FirestoreIndicator = {
                    id: ind.id,
                    text: ind.text,
                    curriculumId: comp.curriculumId,
                    competencyId: comp.code,
                    grade: "", // These are derived in the types but not stored flat here usually, 
                               // but let's keep it consistent with previous logic if possible.
                               // Actually, curriculumId links it back.
                    subject: ""
                };
                batch.set(indRef, indicatorData);
                opCount++;
            }
        }

        if (opCount >= MAX_BATCH_SIZE) {
            console.warn("Límite de batch alcanzado. Esto es una migración simple, por favor ejecute en chunks si falla.");
        }
    }

    await batch.commit();
    console.log("¡Migración a Firestore completada con éxito!");
    return true;

  } catch (error) {
    console.error("Error durante la migración:", error);
    throw error;
  }
};

// --- OPTIMIZED READ OPERATIONS ---

export const getCurriculumsFromFirestore = async (): Promise<FirestoreCurriculum[]> => {
    if (!db) return [];
    try {
        const snapshot = await getDocs(collection(db, "curriculums"));
        return snapshot.docs.map(doc => doc.data() as FirestoreCurriculum);
    } catch (error) {
        console.error("Error fetching curriculums:", error);
        return [];
    }
};

export const getCompetencyDetail = async (competencyId: string): Promise<FirestoreCompetency | null> => {
    if (!db) return null;
    try {
        const docRef = doc(db, "competencies", competencyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as FirestoreCompetency;
        }
        return null;
    } catch (error) {
        console.error("Error fetching competency detail:", error);
        return null;
    }
};

export const getCurriculumByGradeAndSubject = async (grade: string, subject: string): Promise<FirestoreCurriculum | null> => {
    if (!db) return null;
    try {
        let q = query(
            collection(db, "curriculums"),
            where("grade", "==", grade),
            where("subject", "==", subject)
        );
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty && !grade.includes("Grado")) {
             q = query(
                collection(db, "curriculums"),
                where("grade", "==", `${grade} Grado`),
                where("subject", "==", subject)
            );
            querySnapshot = await getDocs(q);
        }

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as FirestoreCurriculum;
        }
        return null;
    } catch (error) {
        console.error("Error fetching curriculum by grade/subject:", error);
        return null;
    }
};

export const searchIndicators = async (queryText: string): Promise<FirestoreIndicator[]> => {
    if (!db || !queryText) return [];
    console.warn("Full text search requires Algolia extension in Firestore.");
    return [];
};
