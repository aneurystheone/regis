import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnecdotalRecord, Student, Competency, InstrumentType } from '../types';

// Safe initialization:
// We use a function to get the model so that if the API key is missing
// (e.g. during initial load or if not set), the app doesn't crash immediately.
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    // Try both Vite standard and the process.env fallback (handled by vite define)
    const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY; 
    if (apiKey) {
      genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn("Vicente: API Key is missing. AI features will be disabled.");
    }
  }
  return genAI;
};

const VICENTE_PERSONA = "Eres Vicente, un asistente docente con décadas de experiencia, cálido, organizado y siempre dispuesto a ayudar a tus colegas profesores. Tu tono es motivador, profesional y empático.";

const getModel = (jsonMode: boolean = false) => {
  const ai = getGenAI();
  if (!ai) return null;
  return ai.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
  });
};

export const generateStudentSummary = async (student: Student, anecdotes: AnecdotalRecord[]): Promise<string> => {
  const model = getModel();
  if (!model) return "Vicente no está disponible (falta configuración).";

  const prompt = `
    ${VICENTE_PERSONA}
    Como colega, he revisado los registros de ${student.name} y he preparado este resumen para ti.
    Analiza estos registros anecdóticos para resaltar fortalezas y sugerir estrategias. 
    Escribe como Vicente, hablándole directamente al docente.
    
    Registros:
    ${anecdotes.map(a => `- ${new Date(a.date).toLocaleDateString()}: [${a.category}] "${a.note}"`).join('\n')}
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text() || "Hola, soy Vicente. No pude procesar el resumen en este momento.";
  } catch (error: any) {
    console.error("Error en Vicente (Summary):", error);
    return "Lo siento, soy Vicente. Hubo un pequeño error técnico al intentar ayudarte.";
  }
};

export const generateEvaluationCriteria = async (competencies: Competency[], content: string, instrumentType: InstrumentType): Promise<string[]> => {
  const model = getModel(true);
  if (!model) return [];

  const prompt = `
        ${VICENTE_PERSONA}
        Ayúdame a diseñar los criterios para un instrumento de "${instrumentType}" sobre "${content}".
        Competencias:
        ${competencies.map(c => `- ${c.name}`).join('\n')}

        Devuelve un array JSON de strings con 5-7 criterios claros.
        Ejemplo: ["Criterio 1", "Criterio 2"]
    `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text ? JSON.parse(text) : [];
  } catch (error: any) {
    console.error("Error en Vicente (Criteria):", error);
    return [];
  }
};

export const transcribeAndAnalyzeAnecdote = async (
  audioBase64: string,
  mimeType: string,
  studentName: string
): Promise<{ transcribedNote: string; category: AnecdotalRecord['category'] } | null> => {
  const model = getModel(true);
  if (!model) return null;

  const prompt = `
    ${VICENTE_PERSONA}
    He escuchado tu nota sobre ${studentName}.
    Transcribe el audio y categorízalo.
    Responde en JSON con 'transcribedNote' y 'category' (Académico, Comportamiento, Social, Otro).
  `;

  try {
    // Note: The new SDK expects 'inlineData' structure slightly differently if passing direct parts
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: audioBase64, mimeType } }
    ]);
    const text = result.response.text();
    return text ? JSON.parse(text) : null;
  } catch (error: any) {
    console.error("Error en Vicente (Audio):", error);
    return null;
  }
};

export const generateLessonPlan = async (
  grade: string,
  subject: string,
  topic: string
): Promise<{ objectives: string[]; materials: string[]; activities: { time: string; description: string }[] } | null> => {
  const model = getModel(true);
  if (!model) return null;

  const prompt = `
    ${VICENTE_PERSONA}
    He preparado una propuesta de planificación para tu clase de ${grade} en ${subject} sobre "${topic}".
    Como tu colega, busco actividades que enganchen a los alumnos.
    
    Responde en JSON con: 'objectives' (array), 'materials' (array), 'activities' (array de objetos {time, description}).
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text ? JSON.parse(text) : null;
  } catch (error: any) {
    console.error("Error en Vicente (Planificación):", error);
    return null;
  }
};

export const extractStudentsFromImage = async (
  imageBase64: string,
  mimeType: string
): Promise<Array<{ name: string; orderNumber?: number }>> => {
  const model = getModel(true);
  if (!model) return [];

  const prompt = `
    ${VICENTE_PERSONA}
    He escaneado la lista que me pasaste. He intentado leer todos los nombres con cuidado.
    Responde en JSON: array de objetos {name, orderNumber}.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType } }
    ]);
    const text = result.response.text();
    return text ? JSON.parse(text) : [];
  } catch (error: any) {
    console.error("Error en Vicente (Extractor):", error);
    return [];
  }
};
