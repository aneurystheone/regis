

export type View = 'DASHBOARD' | 'STUDENTS' | 'ATTENDANCE' | 'REPORTS' | 'STUDENT_PROFILE' | 'GRADEBOOK_GRADES' | 'GRADEBOOK_INSTRUMENTS' | 'GRADEBOOK_COMPETENCIES' | 'SETTINGS' | 'SETTINGS_APPEARANCE' | 'SETTINGS_AI' | 'SETTINGS_RECYCLE_BIN' | 'TEACHER_PROFILE' | 'CALENDAR' | 'CLASSES' | 'LESSON_PLANNER';

export type FontSize = 'sm' | 'base' | 'lg';

export const CURRENT_SCHEMA_VERSION = 1;
export const APP_VERSION = 'v1.5.0 (Build 2026.01.07)';

export interface BaseEntity {
  schemaVersion?: number;
  userId?: string;
}

export interface Class extends BaseEntity {
  id: string;
  name: string; // Subject name, e.g., "Matemática"
  grade: string;
  section: string; // e.g., "A", "B", "C"
  schoolYear: string; // e.g., "2024-2025"
  schedule: string; // e.g., "Lunes y Miércoles 9:00 - 10:30 AM"
  color: string; // e.g., '#ef4444' for styling
  level?: string; // e.g., "Nivel Primario"
}

export interface Student extends BaseEntity {
  id: string;
  classId: string;
  name: string;
  orderNumber?: number;
  avatar: string;
  gender: 'M' | 'F';
  birthDate?: string; // YYYY-MM-DD
  email?: string;
  phone?: string;
  isRepeater?: boolean;
  healthInfo?: {
    bloodType?: string;
    allergies?: string;
    medications?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  familyInfo?: {
    motherName?: string;
    motherPhone?: string;
    fatherName?: string;
    fatherPhone?: string;
    guardianName?: string;
    guardianPhone?: string;
    address?: string;
  };
  connectivityInfo?: {
    hasInternet?: boolean;
    deviceAccess?: string[];
    platformFamiliarity?: string;
  };
}

export enum AttendanceStatus {
  PRESENT = 'Presente',
  ABSENT = 'Ausente',
  LATE = 'Tarde',
  EXCUSED = 'Excusa',
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface DailyNote {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export interface AnecdotalRecord extends BaseEntity {
  id: string;
  studentId: string;
  date: string; // ISO string
  note: string;
  category: 'Académico' | 'Comportamiento' | 'Social' | 'Otro';
  photoUrl?: string;
  audioUrl?: string;
}

// Gradebook Types
export type EvaluationPeriod = 'P1' | 'P2' | 'P3' | 'P4';
export type CompetencyGroup = 'G1' | 'G2' | 'G3' | 'G4';


export interface FundamentalCompetency {
  id: string;
  name: string;
  description: string;
  group: CompetencyGroup;
}

export enum AchievementLevel {
  BEGINNING = 'Inicio',
  DEVELOPING = 'En Desarrollo',
  PROFICIENT = 'Logrado',
  EXEMPLARY = 'Excelente',
}

export interface Competency {
  id: string;
  classId: string;
  fundamentalId: string;
  code: string; // e.g., CE-LEI4
  name: string;
  description: string;
  indicators: { id: string; text: string; }[];
}

export interface Criterion {
  id: string;
  text: string;
}

export type InstrumentType = 'Prueba Corta' | 'Examen' | 'Tarea' | 'Proyecto' | 'Observación' | 'Lista de Cotejo' | 'Escala Estimativa' | 'Rúbrica';

export interface EvaluationInstrument extends BaseEntity {
  id: string;
  classId: string;
  name: string;
  type: InstrumentType;
  date: string; // YYYY-MM-DD
  totalPoints: number;
  competencyIds: string[];
  period: EvaluationPeriod;
  contenidos?: string;
  actividades?: string;
  criteria?: Criterion[];
}

export interface Grade extends BaseEntity {
  id: string; // Composite key: studentId_instrumentId
  studentId: string;
  instrumentId: string;
  score: number | null; // null for not yet graded
  criteriaScores?: Record<string, boolean | number | null>; // { criterionId: score }
  userId?: string;
}

export interface RecoveryGrade {
  id: string;
  studentId: string;
  classId: string;
  period: EvaluationPeriod;
  competencyGroup: CompetencyGroup;
  score: number;
}


// Teacher Profile Types
export interface TeacherProfileData extends BaseEntity {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experienceYears: number;
  profilePictureUrl: string;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  content: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
}

// User Authentication
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In a real app, this should be a salted hash
}

// Calendar Types
export interface CustomEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  time?: string; // e.g., "10:00"
  color: string; // e.g., '#ef4444'
}

// AI Features
export interface AIFeatures {
  summaryGeneration: boolean; // "Vicente Resume"
  criteriaGeneration: boolean; // "Vicente Criterios"
  lessonPlanning: boolean; // "Planificar con Vicente"
  studentExtraction: boolean; // "Vicente Extractor"
  audioAnalysis: boolean; // "Vicente Audio"
  vicenteAssistant: boolean; // "Vicente Dashboard"
}

// Lesson Planner Types
export interface LessonActivity {
  time: string;
  description: string;
}

export interface LessonPlan {
  id: string;
  classId: string;
  topic: string;
  date: string;
  objectives: string[];
  materials: string[];
  activities: LessonActivity[];
}

// --- Firestore Optimized Curriculum Structures ---

// Collection: /curriculums
export interface FirestoreCurriculum {
  id: string; // e.g., "primario_5to_lengua"
  level: string;
  grade: string;
  subject: string;
  contents: { id: string; text: string }[]; // Aggregated Grade-level contents
  competenciesSummary: {
    id: string;
    code: string;
    name: string;
    fundamentalId: string;
  }[];
}

// Collection: /competencies
export interface FirestoreCompetency {
  id: string;
  curriculumId: string;
  code: string;
  name: string;
  description: string;
  fundamentalId: string;
  // In a real schema, you might split contents here, but based on source JSON, 
  // contents are often at Grade level. We'll keep indicators here.
  indicators: { id: string; text: string }[];
}

// Collection: /indicators
export interface FirestoreIndicator {
  id: string;
  text: string;
  curriculumId: string;
  competencyId: string;
  grade: string;
  subject: string;
}

// Legacy Curriculum Data Types (Used for parsing initial JSON)
export interface CurriculumCompetency {
  fundamentalId: string;
  code: string;
  name: string;
  description: string;
  indicators: { id: string; text: string }[];
}

export interface CurriculumGrade {
  grade: string;
  contents: { id: string; text: string }[];
  competencies: CurriculumCompetency[];
}

export interface CurriculumSubject {
  name: string;
  grades: CurriculumGrade[];
}

export interface CurriculumLevel {
  name: string;
  subjects: CurriculumSubject[];
}

export interface CurriculumData {
  levels: CurriculumLevel[];
}