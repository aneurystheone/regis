import { getFunctions, httpsCallable } from 'firebase/functions';
import type { AnecdotalRecord, Student, Competency, InstrumentType, AttendanceRecord, EvaluationInstrument, Grade, RecoveryGrade } from '../types';
import { logAiAssistance, logAiError } from './usageService';
import { app } from '../firebase-core';

// ---------------------------------------------------------------------------
// Security: Gemini API key is NEVER embedded in this bundle.
// All AI calls go through the authenticated Firebase Function 'callGemini',
// which holds the key server-side (process.env.GEMINI_API_KEY).
// ---------------------------------------------------------------------------

// Schema type constants — mirrors @google/genai Type enum without the frontend SDK dependency
const SchemaType = {
  OBJECT: "OBJECT" as const,
  ARRAY: "ARRAY" as const,
  STRING: "STRING" as const,
  NUMBER: "NUMBER" as const,
  BOOLEAN: "BOOLEAN" as const,
  INTEGER: "INTEGER" as const,
};

const VICENTE_PERSONA = "Eres Vicente, un asistente docente dominicano con décadas de experiencia, experto en la Adecuación Curricular del Ministerio de Educación (MINERD). Tu tono es cálido, profesional, empático y siempre usas términos pedagógicos correctos del contexto dominicano.";

// Lazy reference to the callable function (initialized once)
let _callGemini: ReturnType<typeof httpsCallable> | null = null;
const getCallGemini = () => {
  if (!_callGemini) {
    _callGemini = httpsCallable(getFunctions(app), 'callGemini', { timeout: 120000 });
  }
  return _callGemini;
};

/**
 * Unified execution wrapper — calls the server-side callGemini Firebase Function.
 * The model fallback logic lives in the Function; the client only cares about { text }.
 */
const generateContentWithFallback = async (contents: any, config?: any): Promise<{ text: string | undefined }> => {
  const callGemini = getCallGemini();
  const result = await callGemini({ prompt: contents, config });
  return { text: (result.data as any).text as string | undefined };
};

export const generateStudentSummary = async (student: Student, anecdotes: AnecdotalRecord[]): Promise<string> => {
  const prompt = `
    ${VICENTE_PERSONA}
    Como colega, he revisado los registros de ${student.name} y he preparado este resumen para ti.
    Analiza estos registros anecdóticos para resaltar fortalezas (basadas en competencias) y sugerir estrategias pedagógicas. 
    Escribe como Vicente, hablándole directamente al docente.
    
    Registros Actuales:
    ${anecdotes.map(a => `- ${new Date(a.date).toLocaleDateString()}: [${a.category}] "${a.note}"`).join('\n')}
  `;

  try {
    const response = await generateContentWithFallback(prompt);

    // Log AI Adoption Metric
    await logAiAssistance('Vicente Summary');

    return response.text || "Hola, soy Vicente. No pude procesar el resumen en este momento.";
  } catch (error: any) {
    console.error("Error en Vicente (Summary):", error);
    await logAiError('Vicente Summary', error, { studentId: student?.id });
    return "Lo siento, soy Vicente. En este momento ocurrió un pequeño inconveniente al generar el resumen. Por favor, verifica tu conexión a internet o intenta nuevamente en unos momentos.";
  }
};

export const generateEvaluationCriteria = async (competencies: Competency[], content: string, instrumentType: InstrumentType): Promise<string[]> => {
  const prompt = `
        ${VICENTE_PERSONA}
        Ayúdame a diseñar los indicadores de logro o criterios para un instrumento de "${instrumentType}" sobre el tema: "${content}".
        
        Competencias Específicas vinculadas:
        ${competencies.map(c => `- ${c.name} (${c.description})`).join('\n')}

        Instrucciones:
        1. Genera exactamente 6 criterios claros y medibles.
        2. Asegúrate de que los criterios estén alineados con la Adecuación Curricular dominicana.
        3. Devuelve un array JSON de strings.
    `;

  try {
    const response = await generateContentWithFallback(prompt, {
      responseMimeType: "application/json",
      responseSchema: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
    });

    // Log AI Adoption Metric
    await logAiAssistance('Vicente Criteria');

    let jsonStr = response.text ? response.text.trim() : "[]";
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Error en Vicente (Criteria):", error);
    await logAiError('Vicente Criteria', error, { instrumentType, content });
    return [];
  }
};

export type AudioTranscriptionResult =
  | { confidence: 'high'; transcribedNote: string; category: AnecdotalRecord['category'] }
  | { confidence: 'low'; rawAudio: string; category: AnecdotalRecord['category'] };

export const transcribeAndAnalyzeAnecdote = async (
  audioBase64: string,
  mimeType: string,
  studentName: string
): Promise<AudioTranscriptionResult | null> => {
  const prompt = `
    ${VICENTE_PERSONA}
    Escucha con atención este audio sobre ${studentName}.

    Tu tarea tiene DOS partes:
    1. Transcribir lo que se dice en el audio.
    2. Evaluar la CALIDAD del audio de forma honesta.

    Reglas estrictas:
    - Si el audio es claro y entiendes la idea principal: devuelve confidence = "high" y una transcripción limpia y pedagógica en 'transcribedNote'.
    - Si el audio tiene ruido, es ininteligible, está cortado, o no puedes entender el mensaje central: devuelve confidence = "low". En 'rawAudio' escribe literalmente lo poco que lograste percibir (aunque sean fragmentos sueltos o "[ininteligible]"). NO inventes ni complete frases.
    - Siempre clasifica la categoría aunque no entiendas el audio bien (usa tu mejor juicio o pon "Otro").
    - NUNCA devuelvas confidence = "high" si no entiendes la idea principal.

    Responde en JSON con: confidence ("high" o "low"), transcribedNote (solo si high, si no ponlo vacío ""), rawAudio (solo si low, si no ponlo vacío ""), category.
  `;

  try {
    const response = await generateContentWithFallback(
      { parts: [{ text: prompt }, { inlineData: { mimeType, data: audioBase64 } }] },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            confidence: { type: SchemaType.STRING, description: "'high' si el audio es claro, 'low' si es ininteligible o de mala calidad" },
            transcribedNote: { type: SchemaType.STRING, description: "Transcripción limpia (solo cuando confidence=high)" },
            rawAudio: { type: SchemaType.STRING, description: "Fragmentos percibidos literalmente (solo cuando confidence=low)" },
            category: { type: SchemaType.STRING, description: "Académico, Comportamiento, Social o Otro" },
          },
          required: ["confidence", "transcribedNote", "rawAudio", "category"],
        },
      }
    );

    // Log AI Adoption Metric
    await logAiAssistance('Vicente Audio');

    let jsonStr = response.text ? response.text.trim() : "{}";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    const category = (['Académico', 'Comportamiento', 'Social', 'Otro'].includes(parsed.category)
      ? parsed.category
      : 'Otro') as AnecdotalRecord['category'];

    if (parsed.confidence === 'low') {
      return { confidence: 'low', rawAudio: parsed.rawAudio || '', category };
    }
    return { confidence: 'high', transcribedNote: parsed.transcribedNote || '', category };
  } catch (error: any) {
    console.error("Error en Vicente (Audio):", error);
    await logAiError('Vicente Audio', error, { studentName, mimeType });
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
    const response = await generateContentWithFallback(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          objectives: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          materials: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          activities: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: { time: { type: SchemaType.STRING }, description: { type: SchemaType.STRING } },
              required: ['time', 'description']
            }
          }
        },
        required: ['objectives', 'materials', 'activities']
      }
    });

    // Log AI Adoption Metric
    await logAiAssistance('Vicente Lesson Plan');

    let jsonStr = response.text ? response.text.trim() : "{}";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Error en Vicente (Planificación):", error);
    await logAiError('Vicente Lesson Plan', error, { grade, subject, topic });
    return null;
  }
};

export const extractStudentsFromImage = async (
  imageBase64: string,
  mimeType: string
): Promise<Array<{ firstName: string; lastName: string }>> => {
  const prompt = `
    ${VICENTE_PERSONA}
    Analiza esta imagen de una lista escolar. Extrae solo los nombres de los estudiantes.
    - Ignora encabezados, fechas, números de orden o notas.
    - Separa claramente Nombres y Apellidos.
    - Devuelve un JSON array estricto: [{ "firstName": "Juan", "lastName": "Pérez" }].
    - Si no hay nombres claros, devuelve [].
  `;

  try {
    const base64Only = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const response = await generateContentWithFallback(
      { parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Only } }] },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              firstName: { type: SchemaType.STRING },
              lastName: { type: SchemaType.STRING },
            },
            required: ["firstName", "lastName"],
          },
        },
      }
    );

    // Log AI Adoption Metric
    await logAiAssistance('Vicente OCR Photo');

    let jsonStr = response.text ? response.text.trim() : "[]";
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error(`Error en Vicente (Extractor):`, error);
    await logAiError('Vicente OCR Photo', error, { mimeType });
    return [];
  }
};

export const extractStudentsFromDoc = async (
  base64Data: string,
  mimeType: string
): Promise<{ students: Array<{ firstName: string; lastName: string; id: string }> }> => {
  const prompt = `
    ${VICENTE_PERSONA}
    Analiza este documento (lista de estudiantes). 
    Extrae los nombres completos de los estudiantes y, si está disponible, su número de orden o ID correlativo.
    Lee cuidadosamente las columnas si es una lista larga.

    Reglas:
    - Ignora encabezados decorativos, fechas, nombres de la escuela o notas marginales.
    - Separa con precisión Nombres y Apellidos.
    - Si hay un número a la izquierda o una columna de "No." o "ID", extráelo como el campo "id".
    - Devuelve una estructura JSON con la propiedad "students".
    - Formato: { "students": [{ "firstName": "Juan", "lastName": "Pérez", "id": "1" }] }.
    - Si no encuentras nombres válidos, devuelve { "students": [] }.
  `;

  try {
    const response = await generateContentWithFallback(
      { parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data.split(',')[1] || base64Data } }] },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            students: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  firstName: { type: SchemaType.STRING, description: "Nombre" },
                  lastName: { type: SchemaType.STRING, description: "Apellido" },
                  id: { type: SchemaType.STRING, description: "ID o número de orden (opcional)" },
                },
                required: ["firstName", "lastName"],
              },
            },
          },
          required: ["students"],
        },
      }
    );

    // Log AI Adoption Metric
    await logAiAssistance('Vicente OCR Doc');

    let jsonStr = response.text ? response.text.trim() : '{"students":[]}';
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error(`Error en Vicente (DocExtractor):`, error);
    await logAiError('Vicente OCR Doc', error, { mimeType });
    return { students: [] };
  }
};

export const extractScheduleFromImage = async (
  imageBase64: string
): Promise<{ courses: Array<{ name: string; grade: string; section?: string; schedule?: string; hoursPerWeek?: number }> }> => {
  const prompt = `
    ${VICENTE_PERSONA}
    Analiza esta imagen de un horario docente dominicano.
    Extrae cada curso (materia) con su grado, sección y horario.
    
    Instrucciones ESTRICTAS:
    - Identifica nombres de materias (ej. Matemáticas, Lengua Española, Ciencias Sociales).
    - **GRADO vs SECCIÓN**: Separa el grado de la sección.
      - Grado = el nivel numérico: "1ro", "2do", "3ro", "4to", "5to", "6to"
      - Sección = la letra: "A", "B", "C", "D"
      - Ejemplos de cómo interpretar:
        "1ero B" → grade: "1ro", section: "B"
        "1° A" → grade: "1ro", section: "A"  
        "Primero B" → grade: "1ro", section: "B"
        "2do-C" → grade: "2do", section: "C"
        "3ero A" → grade: "3ro", section: "A"
        "4to" → grade: "4to", section: "" (sin sección explícita)
      - Normaliza siempre el grado al formato corto: 1ro, 2do, 3ro, 4to, 5to, 6to.
    - **HORARIO**: Lee los días y horas de cada curso. Consolida todas las horas de una misma materia+grado+sección en un solo string.
      - Formato deseado: "Lunes 7:00-8:00, Miércoles 9:00-10:00"
      - **SIMPLIFICA horas consecutivas**: Si una materia tiene bloques seguidos el mismo día (ej. Lunes 7:00-8:00 y Lunes 8:00-9:00), unifícalos en un solo rango: "Lunes 7:00-9:00".
      - Si no puedes leer las horas, deja el campo schedule vacío.
    - **NO repitas** la misma combinación materia+grado+sección. Si aparece varias veces (distintos días), consolídala en UNA SOLA entrada con todas sus horas en el campo "schedule".
    - **SÍ repite** si la misma materia se da en DISTINTAS secciones. Ej. "Matemática 1ro A" y "Matemática 1ro B" son DOS entradas diferentes.
    - Normaliza los nombres de materias con la primera letra en mayúscula (ej. "Lengua Española", no "LENGUA ESPAÑOLA").
    - Si puedes contar las horas a la semana, inclúyelas en hoursPerWeek.
    - Si no encuentras materias claras, devuelve { "courses": [] }.
  `;

  try {
    const response = await generateContentWithFallback(
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: imageBase64.split(',')[1] || imageBase64 } }
        ]
      },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            courses: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING, description: "Nombre de la materia" },
                  grade: { type: SchemaType.STRING, description: "Grado normalizado (1ro, 2do, 3ro, etc.)" },
                  section: { type: SchemaType.STRING, description: "Sección (A, B, C, D)" },
                  schedule: { type: SchemaType.STRING, description: "Horario consolidado (ej. Lunes 7:00-8:00, Miércoles 9:00-10:00)" },
                  hoursPerWeek: { type: SchemaType.NUMBER, description: "Horas a la semana" }
                },
                required: ["name", "grade"],
              },
            },
          },
          required: ["courses"],
        },
      }
    );

    // Log AI Adoption Metric
    await logAiAssistance('Vicente OCR Schedule');

    let jsonStr = response.text ? response.text.trim() : '{"courses":[]}';
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error(`Error en Vicente (ScheduleExtractor):`, error);
    await logAiError('Vicente OCR Schedule', error);
    return { courses: [] };
  }
};

/**
 * Genera un informe de Alerta Temprana y Diagnóstico Pedagógico analizando ausencias, anécdotas y tendencias de calificaciones.
 */
export const generateEarlyWarningReport = async (
  student: Student,
  attendanceRecords: AttendanceRecord[],
  anecdotes: AnecdotalRecord[],
  grades: { instrumentName: string; score: number | null; totalPoints: number }[]
): Promise<string> => {
  const absentCount = attendanceRecords.filter(a => a.status === 'Ausente').length;
  const lateCount = attendanceRecords.filter(a => a.status === 'Tarde').length;
  const totalDays = attendanceRecords.length;

  const prompt = `
    ${VICENTE_PERSONA}
    Escribe un informe de **Alerta Temprana y Diagnóstico Pedagógico** para el docente sobre el estudiante ${student.name}.
    
    Datos del Estudiante:
    - Nombre: ${student.name}
    - Asistencia registrada: ${absentCount} ausencias y ${lateCount} tardanzas en ${totalDays} días registrados.
    - Anécdotas/Observaciones:
    ${anecdotes.length > 0 ? anecdotes.map(a => `- ${a.category}: ${a.note}`).join('\n') : 'Sin anécdotas registradas.'}
    - Rendimiento en Instrumentos de Evaluación:
    ${grades.length > 0 ? grades.map(g => `- ${g.instrumentName}: ${g.score ?? 'Sin nota'}/${g.totalPoints}`).join('\n') : 'Sin calificaciones registradas.'}
    
    Estructura requerida del informe:
    1. **Resumen Ejecutivo de Riesgo** (Nivel de riesgo: Bajo, Medio o Alto).
    2. **Factores Detectados** (Análisis de asistencia, rendimiento académico y conducta).
    3. **Recomendaciones Pedagógicas Preventivas** (3 acciones concretas que el Docente puede aplicar en el aula).
  `;

  try {
    const response = await generateContentWithFallback(prompt);
    await logAiAssistance('Vicente Early Warning');
    return response.text || "No se pudo generar la alerta temprana en este momento.";
  } catch (error: any) {
    console.error("Error en Vicente (Early Warning):", error);
    await logAiError('Vicente Early Warning', error, { studentId: student?.id });
    return "Lo siento, soy Vicente. Ocurrió un inconveniente al generar el informe de Alerta Temprana. Por favor, verifica tu conexión a internet e inténtalo nuevamente.";
  }
};

/**
 * Genera un comunicado formal y empático dirigido a los padres o tutores del estudiante.
 */
export const generateParentCommunication = async (
  student: Student,
  period: string,
  attendanceRecords: AttendanceRecord[],
  anecdotes: AnecdotalRecord[],
  grades: { instrumentName: string; score: number | null; totalPoints: number }[]
): Promise<string> => {
  const tutorName = student.familyInfo?.motherName || student.familyInfo?.fatherName || student.familyInfo?.guardianName || "Tutor/a";
  const absentCount = attendanceRecords.filter(a => a.status === 'Ausente').length;

  const prompt = `
    ${VICENTE_PERSONA}
    Escribe una carta/comunicado formal, cálido y constructivo dirigido a los padres/tutores de ${student.name} para el periodo ${period}.
    
    Destinatario: ${tutorName}
    Estudiante: ${student.name}
    Ausencias en el periodo: ${absentCount}
    Destacados de rendimiento:
    ${grades.map(g => `- ${g.instrumentName}: ${g.score ?? 'En proceso'}/${g.totalPoints}`).join('\n')}
    
    Directrices:
    - Inicia saludando cordialmente a ${tutorName}.
    - Destaca primero los aspectos positivos y fortalezas del estudiante.
    - Mencione con tacto las áreas donde requiere apoyo en el hogar (asistencia, tareas o atención).
    - Concluye reafirmando el compromiso del centro educativo con el desarrollo integral del estudiante.
  `;

  try {
    const response = await generateContentWithFallback(prompt);
    await logAiAssistance('Vicente Parent Communication');
    return response.text || "No se pudo redactar el comunicado para tutores.";
  } catch (error: any) {
    console.error("Error en Vicente (Parent Communication):", error);
    await logAiError('Vicente Parent Communication', error, { studentId: student?.id, period });
    return "Lo siento, soy Vicente. No fue posible redactar la comunicación para tutores en este momento. Por favor, intenta de nuevo en unos minutos.";
  }
};

/**
 * Genera un Plan de Recuperación Pedagógica para estudiantes con materias/competencias pendientes.
 */
export const generateRecoveryPlan = async (
  student: Student,
  subject: string,
  unachievedCompetencies: string[]
): Promise<string> => {
  const prompt = `
    ${VICENTE_PERSONA}
    Diseña un **Plan de Recuperación Pedagógica** personalizado para el estudiante ${student.name} en la asignatura de ${subject}.
    
    Competencias/Indicadores pendientes de lograr:
    ${unachievedCompetencies.map(c => `- ${c}`).join('\n')}
    
    Estructura requerida:
    1. **Objetivo del Plan de Recuperación**
    2. **Estrategias de Refuerzo en Aula y Hogar**
    3. **Actividades Prácticas Sugeridas** (paso a paso para el estudiante)
    4. **Criterios de Evaluación para la Recuperación**
  `;

  try {
    const response = await generateContentWithFallback(prompt);
    await logAiAssistance('Vicente Recovery Plan');
    return response.text || "No se pudo generar el plan de recuperación pedagógica.";
  } catch (error: any) {
    console.error("Error en Vicente (Recovery Plan):", error);
    await logAiError('Vicente Recovery Plan', error, { studentId: student?.id, subject });
    return "Lo siento, soy Vicente. Ocurrió un inconveniente al generar el plan de recuperación pedagógica. Por favor, inténtalo más tarde.";
  }
};

/**
 * Conversación abierta con el Asistente Docente Vicente.
 */
export const chatWithVicente = async (
  userMessage: string,
  history: { role: 'user' | 'model'; text: string }[],
  contextInfo?: { teacherName?: string; classCount?: number; studentCount?: number }
): Promise<string> => {
  const historyText = history.slice(-6).map(h => `${h.role === 'user' ? 'Docente' : 'Vicente'}: ${h.text}`).join('\n\n');
  const contextStr = contextInfo ? `Contexto del Docente: ${contextInfo.teacherName || 'Docente'}, Clases: ${contextInfo.classCount || 0}, Estudiantes: ${contextInfo.studentCount || 0}.` : '';

  const prompt = `
    ${VICENTE_PERSONA}
    ${contextStr}
    
    Historial de la conversación reciente:
    ${historyText}
    
    Mensaje actual del Docente: "${userMessage}"
    
    Responde con calidez, profesionalismo pedagógico y formato markdown limpio.
  `;

  try {
    const response = await generateContentWithFallback(prompt);
    await logAiAssistance('Vicente Chat');
    return response.text || "Hola, soy Vicente. ¿Podrías repetirme la consulta?";
  } catch (error: any) {
    console.error("Error en Vicente Chat:", error);
    await logAiError('Vicente Chat', error);
    const errorStr = String(error?.message || error);
    if (errorStr.includes('403') || errorStr.includes('PERMISSION_DENIED') || errorStr.includes('Forbidden')) {
      return "⚠️ **Error 403 de Permiso en Google Cloud**: La clave API (`VITE_GEMINI_API_KEY`) fue rechazada por Google Cloud con error 403. Para solucionarlo:\n\n1. Ve a **Google Cloud Console** ➔ **APIs y servicios** ➔ **Biblioteca** y habilita la **Generative Language API**.\n2. En **Credenciales** ➔ Edita tu clave API (`Regis Prod IA API`) y verifica que las **Restricciones de API** no estén bloqueando la API Generativa o que los **HTTP Referrers** permitan `localhost`.";
    }
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Quota')) {
      return "⚠️ **Límite de solicitudes alcanzado**: Vicente ha procesado muchas consultas recientemente. Por favor, espera un momento antes de realizar otra consulta.";
    }
    return "Lo siento, soy Vicente. Ocurrió un inconveniente al procesar tu mensaje. Por favor, verifica tu conexión a internet o intenta enviármelo nuevamente.";
  }
};