

export type View = 'DASHBOARD' | 'COURSE_DASHBOARD' | 'STUDENTS' | 'ATTENDANCE' | 'REPORTS' | 'STUDENT_PROFILE' | 'GRADEBOOK_GRADES' | 'GRADEBOOK_INSTRUMENTS' | 'GRADEBOOK_COMPETENCIES' | 'SETTINGS' | 'SETTINGS_APPEARANCE' | 'SETTINGS_AI' | 'SETTINGS_RECYCLE_BIN' | 'SETTINGS_SUBSCRIPTION' | 'SUBSCRIPTION' | 'TEACHER_PROFILE' | 'CALENDAR' | 'CLASSES' | 'LESSON_PLANNER' | 'ADMIN_DASHBOARD' | 'VICENTE_CHAT';

export type FontSize = 'sm' | 'base' | 'lg';

export const CURRENT_SCHEMA_VERSION = 1;
export const APP_VERSION = 'v1.8.6 Build 0808.0300'; // mes.dia.hora.min

export interface BaseEntity {
  schemaVersion?: number;
  userId?: string;
  updatedAt?: string; // ISO String for last-write-wins resolution
}

export interface SchoolGroup extends BaseEntity {
  id: string;
  name: string; // e.g. "Grupo A - Primaria"
  grade: string;
  section: string;
  schoolYear: string;
  level?: string;
}

export interface Class extends BaseEntity {
  id: string;
  name: string; // Subject name, e.g., "Matemática"
  grade: string;
  section: string; // e.g., "A", "B", "C"
  groupId?: string; // Link to a shared group of students
  schoolYear: string; // e.g., "2024-2025"
  schedule: string; // e.g., "Lunes y Miércoles 9:00 - 10:30 AM"
  color: string; // e.g., '#ef4444' for styling
  level?: string; // e.g., "Nivel Primario"
  teacher?: string; // e.g., "Juan Pérez"
}

export interface Student extends BaseEntity {
  id: string;
  enrollmentId?: string; // Matricula (Student ID visible to user)
  classId: string; // Takes precedence if groupId is missing, or used as fallback
  groupId?: string; // If present, student belongs to this group
  name: string; // Kept for backward compatibility (firstName + ' ' + lastName)
  firstName?: string;
  lastName?: string;
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

export interface WorkTeam extends BaseEntity {
  id: string;
  classId: string;
  groupId?: string;
  name: string;
  color?: string;
  studentIds: string[];
}

export enum AttendanceStatus {
  PRESENT = 'Presente',
  ABSENT = 'Ausente',
  LATE = 'Tarde',
  EXCUSED = 'Excusa',
}

export interface AttendanceRecord extends BaseEntity {
  id?: string;
  studentId: string;
  classId?: string; // Context of the attendance (subject-specific)
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface DailyNote extends BaseEntity {
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
export type PrimarioCompetencyGroup = 'GP1' | 'GP2' | 'GP3'; // Primario uses 3 groups


export interface FundamentalCompetency extends BaseEntity {
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

export interface Competency extends BaseEntity {
  id: string;
  classId: string;
  fundamentalId: string;
  code: string; // e.g., CE-LEI4
  name: string;
  description: string;
  evaluationGroup?: 'PC1' | 'PC2' | 'PC3' | 'PC4' | 'GP1' | 'GP2' | 'GP3';
  indicators: { id: string; text: string; }[];
}

export interface Criterion {
  id: string;
  text: string;
  maxPoints?: number; // Max points for this individual criterion
}

export type InstrumentType = 'Prueba Corta' | 'Examen' | 'Tarea' | 'Participación' | 'Proyecto' | 'Lista de Cotejo';

export interface EvaluationInstrument extends BaseEntity {
  id: string;
  classId: string;
  name: string;
  type: InstrumentType;
  date: string; // YYYY-MM-DD
  totalPoints: number;
  competencyIds: string[];
  period: EvaluationPeriod;
  syncGroupId?: string;
  contenidos?: string;
  actividades?: string;
  criteria?: Criterion[];
}

export interface Grade extends BaseEntity {
  id: string; // Historically studentId_instrumentId, will transition to studentId
  studentId: string;
  instrumentId: string;
  score: number | null; // null for not yet graded
  criteriaScores?: Record<string, boolean | number | null>; // { criterionId: score }
  updatedAt?: string | any; // ISO string or Firestore Timestamp
}

export interface GradeDocument {
  userId: string;
  score: number | null;
  criteriaScores?: Record<string, boolean | number | null>;
  updatedAt: any; // serverTimestamp()
}

export interface RecoveryGrade extends BaseEntity {
  id: string;
  studentId: string;
  classId: string;
  period: EvaluationPeriod;
  competencyGroup: CompetencyGroup;
  score: number;
}


// Teacher Profile Types
export interface OnboardingMissions {
  profileSetup: boolean;
  classesCreated: boolean;
  studentsImported: boolean;
  firstAttendance: boolean;
  firstInstrument: boolean;
  firstReport: boolean;
}

export interface TeacherProfileData extends BaseEntity {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experienceYears: number;
  profilePictureUrl: string;
  acquisitionChannel?: string;
  regional?: string;
  district?: string;
  schoolName?: string;
  schoolId?: string;
  schoolCode?: string;
  _isFallback?: boolean;
  onboardingMissions?: OnboardingMissions;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  content: string;
  classId?: string; // Optional association with a class/course
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

// Subscription Types (Premium Account System)
export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled';
export type SubscriptionSource = 'manual' | 'stripe' | 'appstore' | 'playstore';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null; // ISO string or null for lifetime
  createdAt: string;
  updatedAt: string;
  source: SubscriptionSource;
  grandfathered?: boolean; // True if user had >6 classes before limit enforcement
  referralCode?: string; // Unique referral code for this Docente (e.g. REGIS-DOC-8K9P)
  referredBy?: string; // UID of referrer Docente if claimed
  referralClaimed?: boolean; // True if this Docente has claimed a referral code
  referralsCount?: number; // Number of successful referrals completed
  // Usage tracking for free tier limits
  usage?: {
    studentExtractions?: {
      count: number;
      lastReset: string; // ISO string of last monthly reset
    };
  };
}

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referredUid: string;
  code: string;
  rewardDays: number;
  status: 'rewarded' | 'rejected' | 'pending';
  createdAt: string;
}


export interface PricingPlan {
  id: 'free' | 'premium_monthly';
  name: string;
  tier: SubscriptionTier;
  price: number; // USD
  interval: 'month' | null;
  stripePriceId?: string; // Stripe Price ID
  features: string[];
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
export interface CurriculumContent {
  id: string;
  text: string;
  type: 'conceptual' | 'procedimental' | 'actitudinal'; // Ahora obligatorio para IA
  topic: string; // Agrupador temático
}

export interface CompetencySummary {
  id: string;
  code: string;
  name: string;
  fundamentalId: string;
  evaluationGroup: 'PC1' | 'PC2' | 'PC3' | 'PC4' | 'GP1' | 'GP2' | 'GP3'; // Campo para Registro de Grado
}

export interface FirestoreCurriculum {
  id: string; // e.g., "primario_5to_lengua"
  level: string;
  grade: string;
  subject: string;
  contents: CurriculumContent[]; // Aggregated Grade-level contents
  competenciesSummary: CompetencySummary[];
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

// --- Academic Summary (Registro de Grado) ---
export interface GradeSummary {
  // Promedios por Grupo de Competencia (PC1-PC4 para Secundaria, GP1-GP3 para Primaria)
  competencyGroups: {
    PC1?: number;
    PC2?: number;
    PC3?: number;
    PC4?: number;
    GP1?: number;
    GP2?: number;
    GP3?: number;
  };
  // Detalle para trazabilidad (opcional pero recomendado)
  specificCompetencies?: { [competencyId: string]: number };
  periodAverage: number; // (PC1+PC2+PC3+PC4) / 4
  rp?: number | null; // Recuperación Pedagógica
}

export interface StudentAcademicSummary {
  id?: string; // Usually studentId
  studentId: string;
  periods: {
    P1?: GradeSummary;
    P2?: GradeSummary;
    P3?: GradeSummary;
    P4?: GradeSummary;
  };
  finalScore: number; // Promedio anual
  updatedAt: string;
}

// Utility Type for Validation
export type CurriculumValidator = (data: any) => data is FirestoreCurriculum;

export interface OnboardingData {
  experience: string;
  referral: string;
  regional: string;
  district: string;
  schoolName: string;
  level: 'primario' | 'secundario';
  subjects: string[];
  goal: string;
  scheduleImage: string | null;
  extractedCourses: Array<{ name: string; grade: string; section?: string; schedule?: string }>;
}

export interface ElectronAPI {
  isElectron: boolean;
  getPlatform: () => string;
  minimize?: () => void;
  maximize?: () => void;
  close?: () => void;
  isMaximized?: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

