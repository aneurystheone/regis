
import { db } from '../firebase-firestore';
import { doc, writeBatch, collection, getDocs, query, where, getDoc } from "firebase/firestore";
import type { CurriculumData, FirestoreCurriculum, FirestoreCompetency, FirestoreIndicator } from '../types';

// --- MIGRATION / SEEDER ---

export const uploadCurriculumData = async () => {
    if (!db) {
        throw new Error("Firebase no está configurado. Revise firebase.ts.");
    }

    try {
        console.log("🚀 Iniciando migración basada en manifiesto...");
        const batch = writeBatch(db);
        let opCount = 0;
        const MAX_BATCH_SIZE = 450;

        // 1. Load Manifest
        const indexRes = await fetch('/data/index.json');
        if (!indexRes.ok) throw new Error('No se pudo leer data/index.json');
        const manifest: { curriculums: string[] } = await indexRes.json();

        console.log(`📜 Manifiesto cargado. ${manifest.curriculums.length} archivos a procesar.`);

        // 2. Iterate and Load Files
        for (const filePath of manifest.curriculums) {
            try {
                console.log(`Processing: ${filePath}...`);
                const res = await fetch(`/data/${filePath}`);
                if (!res.ok) {
                    console.warn(`⚠️ 404/Error fetching: ${filePath}`);
                    continue;
                }
                const curr: FirestoreCurriculum = await res.json();

                // Validate basic structure (optional but recommended)
                if (!curr.id || !curr.contents || !curr.competenciesSummary) {
                    console.warn(`⚠️ Invalid Schema in: ${filePath}. Skipping.`);
                    continue;
                }

                // 3. Queue Curriculum Document
                const curriculumRef = doc(db, "curriculums", curr.id);
                batch.set(curriculumRef, curr, { merge: true });
                opCount++;

                // 4. Queue Competencies (Extracted from summary if needed, but usually strictly defined elsewhere)
                // Note: In this new hierarchy, competencies might be embedded or linked. 
                // The prompt implies we are seeding the curriculum document itself.
                // If we need to seed "competencies" collection separately, we'd need full competency definitions.
                // Assuming for this task we are storing the payload into 'curriculums' collection mainly.

                // However, the previous logic also seeded 'competencies' and 'indicators' collections.
                // If the new JSONs ONLY have 'competenciesSummary', we can't fully seed the 'competencies' collection 
                // unless we fetch detailed competency files or if the new structure embeds them deeper.
                // The provided example JSON has 'competenciesSummary' which lacks 'indicators' list detail.
                // BUT, the prompt asked to Refactor "uploadCurriculumData".
                // Let's stick to uploading the Curriculum object as the primary goal per the new schema.
                // If the user wants to seed *detailed* competencies/indicators, they would need separate files or a richer JSON.
                // For now, we strictly follow the manifest to seed valid FirestoreCurriculum objects.

            } catch (e) {
                console.error(`❌ Error parsing/processing ${filePath}:`, e);
            }
        }

        if (opCount > 0) {
            await batch.commit();
            console.log(`✅ ¡Proceso completado! ${opCount} documentos escritos/actualizados.`);
        } else {
            console.log("⚠️ No se encontraron documentos válidos para subir.");
        }

        return true;

    } catch (error) {
        console.error("🔥 Error crítico durante la migración:", error);
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
        console.error("Error fetching curriculum by grade/subject (Firestore):", error);
        console.log("Attempting local fallback...");
        return await _findLocalCurriculum(grade, subject);
    }
};

const _findLocalCurriculum = async (grade: string, subject: string): Promise<FirestoreCurriculum | null> => {
    try {
        const indexRes = await fetch('/data/index.json');
        if (!indexRes.ok) return null;

        const manifest: { curriculums: string[] } = await indexRes.json();

        // Normalize strings for rough matching
        const normGrade = grade.toLowerCase().replace(' ', '_');
        const normSubject = subject.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_'); // remove accents

        // 1. Try to find by filename hint first (Optimization)
        // e.g. "1ro" and "matematica" in "nivel_secundario/primer_ciclo/1ro/matematica.json"

        // Simple heuristic: check if path contains grade (e.g. "1ro") and subject logic
        // But subject might be mapped differently. Let's iterate but fetch only if filename looks promising or just iterate all for now since list is small.

        for (const filePath of manifest.curriculums) {
            const res = await fetch(`/data/${filePath}`);
            if (!res.ok) continue;

            const curr: FirestoreCurriculum = await res.json();

            // Check exact match
            if (curr.grade === grade && curr.subject === subject) {
                return curr;
            }

            // Check sloppy match (e.g. "1ro de Secundaria" vs "1ro")
            if (curr.grade.includes(grade) && curr.subject === subject) {
                return curr;
            }
        }
    } catch (e) {
        console.error("Local fallback failed:", e);
    }
    return null;
};

export const searchIndicators = async (queryText: string): Promise<FirestoreIndicator[]> => {
    if (!db || !queryText) return [];
    console.warn("Full text search requires Algolia extension in Firestore.");
    return [];
};
