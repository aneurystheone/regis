import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock usageService to prevent real analytics logging
vi.mock('./usageService', () => ({
  logAiAssistance: vi.fn(() => Promise.resolve()),
  logAiError: vi.fn(() => Promise.resolve()),
}));

// Mock firebase/functions callable
const mockCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => mockCallable),
}));

vi.mock('../firebase-core', () => ({
  app: {},
}));

import { logAiAssistance, logAiError } from './usageService';
import {
  generateStudentSummary,
  generateEvaluationCriteria,
  transcribeAndAnalyzeAnecdote,
  generateLessonPlan,
  extractStudentsFromImage,
  extractStudentsFromDoc,
  extractScheduleFromImage,
  generateEarlyWarningReport,
  generateParentCommunication,
  generateRecoveryPlan,
  chatWithVicente
} from './geminiService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('geminiService via Firebase Function', () => {
  it('succeeds on generateStudentSummary', async () => {
    mockCallable.mockResolvedValue({
      data: { text: 'Resumen exitoso por Vicente.' }
    });

    const student = { name: 'Juan Pérez' } as any;
    const anecdotes = [] as any;

    const result = await generateStudentSummary(student, anecdotes);

    expect(result).toBe('Resumen exitoso por Vicente.');
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Summary');
  });

  it('logs telemetry and returns friendly error message on error', async () => {
    const errorObj = new Error('Function error');
    mockCallable.mockRejectedValue(errorObj);

    const student = { name: 'Juan Pérez' } as any;
    const anecdotes = [] as any;

    const result = await generateStudentSummary(student, anecdotes);

    expect(result).toContain('Lo siento, soy Vicente. En este momento ocurrió un pequeño inconveniente');
    expect(logAiError).toHaveBeenCalledWith('Vicente Summary', errorObj, { studentId: undefined });
  });
});

describe('geminiService individual helper functions', () => {
  const mockStudent = {
    id: 's123',
    name: 'Juan Pérez',
    familyInfo: { motherName: 'María Pérez' },
  } as any;

  const mockCompetencies = [
    { name: 'Comp1', description: 'Desc1' },
    { name: 'Comp2', description: 'Desc2' },
  ] as any[];

  it('generateEvaluationCriteria parses criteria array on success', async () => {
    mockCallable.mockResolvedValue({
      data: { text: '["Crit1", "Crit2", "Crit3"]' }
    });

    const result = await generateEvaluationCriteria(mockCompetencies, 'Tema', 'Proyecto');

    expect(result).toEqual(['Crit1', 'Crit2', 'Crit3']);
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Criteria');
  });

  it('generateEvaluationCriteria logs telemetry and returns empty array on error', async () => {
    const error = new Error('API Error');
    mockCallable.mockRejectedValue(error);

    const result = await generateEvaluationCriteria(mockCompetencies, 'Tema', 'Proyecto');

    expect(result).toEqual([]);
    expect(logAiError).toHaveBeenCalledWith('Vicente Criteria', error, { instrumentType: 'Proyecto', content: 'Tema' });
  });

  it('transcribeAndAnalyzeAnecdote handles high confidence transcription', async () => {
    mockCallable.mockResolvedValue({
      data: { text: '{"confidence": "high", "transcribedNote": "Buena participación", "rawAudio": "", "category": "Social"}' }
    });

    const result = await transcribeAndAnalyzeAnecdote('base64String', 'audio/webm', 'Juan Pérez');

    expect(result).toEqual({
      confidence: 'high',
      transcribedNote: 'Buena participación',
      category: 'Social',
    });
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Audio');
  });

  it('transcribeAndAnalyzeAnecdote handles low confidence transcription', async () => {
    mockCallable.mockResolvedValue({
      data: { text: '{"confidence": "low", "transcribedNote": "", "rawAudio": "[ininteligible]", "category": "Otro"}' }
    });

    const result = await transcribeAndAnalyzeAnecdote('base64String', 'audio/webm', 'Juan Pérez');

    expect(result).toEqual({
      confidence: 'low',
      rawAudio: '[ininteligible]',
      category: 'Otro',
    });
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Audio');
  });

  it('transcribeAndAnalyzeAnecdote logs telemetry and returns null on error', async () => {
    const error = new Error('Audio processing failed');
    mockCallable.mockRejectedValue(error);

    const result = await transcribeAndAnalyzeAnecdote('base64String', 'audio/webm', 'Juan Pérez');

    expect(result).toBeNull();
    expect(logAiError).toHaveBeenCalledWith('Vicente Audio', error, { studentName: 'Juan Pérez', mimeType: 'audio/webm' });
  });

  it('generateLessonPlan parses plan structure on success', async () => {
    const planJson = {
      objectives: ['Obj1'],
      materials: ['Mat1'],
      activities: [{ time: '10 min', description: 'Act1' }],
    };
    mockCallable.mockResolvedValue({
      data: { text: JSON.stringify(planJson) }
    });

    const result = await generateLessonPlan('1ro', 'Matemáticas', 'Álgebra');

    expect(result).toEqual(planJson);
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Lesson Plan');
  });

  it('extractStudentsFromImage returns list of students on success', async () => {
    const studentsJson = [{ firstName: 'Ana', lastName: 'García' }];
    mockCallable.mockResolvedValue({
      data: { text: JSON.stringify(studentsJson) }
    });

    const result = await extractStudentsFromImage('base64Image', 'image/png');

    expect(result).toEqual(studentsJson);
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente OCR Photo');
  });

  it('extractStudentsFromDoc returns list of students on success', async () => {
    const docJson = { students: [{ firstName: 'Ana', lastName: 'García', id: '1' }] };
    mockCallable.mockResolvedValue({
      data: { text: JSON.stringify(docJson) }
    });

    const result = await extractStudentsFromDoc('base64Doc', 'application/pdf');

    expect(result).toEqual(docJson);
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente OCR Doc');
  });

  it('extractScheduleFromImage returns courses list on success', async () => {
    const scheduleJson = { courses: [{ name: 'Matemática', grade: '1ro', section: 'A' }] };
    mockCallable.mockResolvedValue({
      data: { text: JSON.stringify(scheduleJson) }
    });

    const result = await extractScheduleFromImage('base64Image');

    expect(result).toEqual(scheduleJson);
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente OCR Schedule');
  });

  it('generateEarlyWarningReport returns report string on success', async () => {
    mockCallable.mockResolvedValue({
      data: { text: 'Informe de alerta temprana...' }
    });

    const result = await generateEarlyWarningReport(mockStudent, [], [], []);

    expect(result).toBe('Informe de alerta temprana...');
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Early Warning');
  });

  it('generateParentCommunication returns letter string on success', async () => {
    mockCallable.mockResolvedValue({
      data: { text: 'Estimada tutor/a...' }
    });

    const result = await generateParentCommunication(mockStudent, 'P1', [], [], []);

    expect(result).toBe('Estimada tutor/a...');
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Parent Communication');
  });

  it('generateRecoveryPlan returns recovery plan string on success', async () => {
    mockCallable.mockResolvedValue({
      data: { text: 'Plan de recuperación para Juan.' }
    });

    const result = await generateRecoveryPlan(mockStudent, 'Matemáticas', ['Comp1']);

    expect(result).toBe('Plan de recuperación para Juan.');
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Recovery Plan');
  });

  it('chatWithVicente returns model response on success', async () => {
    mockCallable.mockResolvedValue({
      data: { text: 'Hola colega, ¿en qué puedo ayudarte?' }
    });

    const result = await chatWithVicente('Hola', []);

    expect(result).toBe('Hola colega, ¿en qué puedo ayudarte?');
    expect(logAiAssistance).toHaveBeenCalledWith('Vicente Chat');
  });
});
