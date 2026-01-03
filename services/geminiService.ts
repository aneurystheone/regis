import { GoogleGenAI, Type } from "@google/genai";
import type { AnecdotalRecord, Student, Competency, InstrumentType } from '../types';

// Obtención de la API KEY desde el entorno.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const VICENTE_PERSONA = "Eres Vicente, un asistente docente con décadas de experiencia, cálido, organizado y siempre dispuesto a ayudar a tus colegas profesores. Tu tono es motivador, profesional y empático.";

export const generateStudentSummary = async (student: Student, anecdotes: AnecdotalRecord[]): Promise<string> => {
  const prompt = `
    ${VICENTE_PERSONA}
    Como colega, he revisado los registros de ${student.name} y he preparado este resumen para ti.
    Analiza estos registros anecdóticos para resaltar fortalezas y sugerir estrategias. 
    Escribe como Vicente, hablándole directamente al docente.
    
    Registros:
    ${anecdotes.map(a => `- ${new Date(a.date).toLocaleDateString()}: [${a.category}] "${a.note}"`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    return response.text || "Hola, soy Vicente. No pude procesar el resumen en este momento.";
  } catch (error: any) {
    console.error("Error en Vicente (Summary):", error);
    alert(`Error en Vicente (Resumen): ${error.message || 'Verifica tu API Key'}`);
    return "Lo siento, soy Vicente. Hubo un pequeño error técnico al intentar ayudarte.";
  }
};

export const generateEvaluationCriteria = async (competencies: Competency[], content: string, instrumentType: InstrumentType): Promise<string[]> => {
  const prompt = `
        ${VICENTE_PERSONA}
        Ayúdame a diseñar los criterios para un instrumento de "${instrumentType}" sobre "${content}".
        Competencias:
        ${competencies.map(c => `- ${c.name}`).join('\n')}

        Devuelve un array JSON de strings con 5-7 criterios claros.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });

    let jsonStr = response.text ? response.text.trim() : "[]";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Error en Vicente (Criteria):", error);
    alert(`Error en Vicente (Criterios): ${error.message || 'Verifica tu API Key'}`);
    return [];
  }
};

export const transcribeAndAnalyzeAnecdote = async (
  audioBase64: string,
  mimeType: string,
  studentName: string
): Promise<{ transcribedNote: string; category: AnecdotalRecord['category'] } | null> => {
  const prompt = `
    ${VICENTE_PERSONA}
    He escuchado tu nota sobre ${studentName}. Aquí tienes mi transcripción sugerida y la categoría donde creo que encaja mejor.
    Responde en JSON con 'transcribedNote' y 'category' (Académico, Comportamiento, Social, Otro).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: audioBase64 } }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcribedNote: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["transcribedNote", "category"],
        },
      },
    });

    let jsonStr = response.text ? response.text.trim() : "{}";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    alert(`Error en Vicente (Audio): ${error.message || 'Verifica tu API Key'}`);
    return null;
  }
};

export const generateLessonPlan = async (
  grade: string,
  subject: string,
  topic: string
): Promise<{ objectives: string[]; materials: string[]; activities: { time: string; description: string }[] } | null> => {
  const prompt = `
    ${VICENTE_PERSONA}
    He preparado una propuesta de planificación para tu clase de ${grade} en ${subject} sobre "${topic}".
    Como tu colega, busco actividades que enganchen a los alumnos.
    
    Responde en JSON con: 'objectives' (array), 'materials' (array), 'activities' (array de objetos {time, description}).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
            materials: { type: Type.ARRAY, items: { type: Type.STRING } },
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { time: { type: Type.STRING }, description: { type: Type.STRING } },
                required: ['time', 'description']
              }
            }
          },
          required: ['objectives', 'materials', 'activities']
        }
      }
    });

    let jsonStr = response.text ? response.text.trim() : "{}";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    alert(`Error en Vicente (Planificación): ${error.message || 'Verifica tu API Key'}`);
    return null;
  }
};

export const extractStudentsFromImage = async (
  imageBase64: string,
  mimeType: string
): Promise<Array<{ name: string; orderNumber?: number }>> => {
  const prompt = `
    ${VICENTE_PERSONA}
    He escaneado la lista que me pasaste. He intentado leer todos los nombres con cuidado.
    Responde en JSON: array de objetos {name, orderNumber}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              orderNumber: { type: Type.INTEGER },
            },
            required: ["name"],
          },
        },
      },
    });

    let jsonStr = response.text ? response.text.trim() : "[]";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    alert(`Error en Vicente (Extractor): ${error.message || 'Verifica tu API Key'}`);
    return [];
  }
};