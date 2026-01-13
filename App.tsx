import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { StudentManager } from './components/StudentManager';
import { AttendanceManager } from './components/AttendanceManager';
import { GradebookManager } from './components/GradebookManager';
import { Reports } from './components/Reports';
import { StudentProfile } from './components/StudentProfile';
import { SettingsManager } from './components/SettingsManager';
import { TeacherProfile } from './components/TeacherProfile';
import { CalendarView } from './components/CalendarView';
import { RecycleBin } from './components/RecycleBin';
import { LoginPage } from './components/LoginPage';
import { LessonPlanner } from './components/LessonPlanner';

// Modals
import { AddClassModal } from './components/AddClassModal';
import { EditClassModal } from './components/EditClassModal';
import { AddStudentModal } from './components/AddStudentModal';
import { EditStudentModal } from './components/EditStudentModal';
import { MoveStudentModal } from './components/MoveStudentModal';
import { MoveStudentBulkModal } from './components/MoveStudentBulkModal';
import { EditStudentBulkModal } from './components/EditStudentBulkModal';
import { StudentImportModal } from './components/StudentImportModal';
import { AddAnecdoteModal } from './components/AddAnecdoteModal';
import { AddInstrumentModal } from './components/AddInstrumentModal';
import { EditInstrumentModal } from './components/EditInstrumentModal';
import { InstrumentDetailModal } from './components/InstrumentDetailModal';
import { ExpressGradingModal } from './components/ExpressGradingModal';
import { AddCompetencyModal } from './components/AddCompetencyModal';
import { AddRecoveryGradeModal } from './components/AddRecoveryGradeModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ClassDetailModal } from './components/ClassDetailModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { LogoutIcon, TrashIcon } from './components/icons';
import { ToastContainer, ToastMessage } from './components/Toast';
import { v4 as uuidv4 } from 'uuid';
import { VicenteSyncAlert } from './components/VicenteSyncAlert';
import { UpdatePrompt } from './components/UpdatePrompt';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileHeader } from './components/MobileHeader';

import { api } from './services/api';
import { authService } from './services/authService';
import type {
  User, View, Class, Student, AttendanceRecord, AnecdotalRecord,
  EvaluationInstrument, Grade, RecoveryGrade, FundamentalCompetency, Competency,
  TeacherProfileData, JournalEntry, Resource, CustomEvent, FontSize, DailyNote,
  LessonPlan, EvaluationPeriod, CompetencyGroup, AIFeatures
} from './types';
import { auth } from './firebase';

function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App State
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize Preferences from LocalStorage for immediate application
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem('teacherkit-isDarkMode');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const saved = window.localStorage.getItem('teacherkit-fontSize');
      return (saved as FontSize) || 'base';
    } catch (e) {
      return 'base';
    }
  });

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [aiFeatures, setAiFeatures] = useState<AIFeatures>(() => {
    try {
      const saved = window.localStorage.getItem('teacherkit-aiFeatures');
      return saved ? JSON.parse(saved) : {
        summaryGeneration: false,
        criteriaGeneration: false,
        lessonPlanning: false,
        studentExtraction: false,
        audioAnalysis: false,
        vicenteAssistant: false,
      };
    } catch (e) {
      return {
        summaryGeneration: false,
        criteriaGeneration: false,
        lessonPlanning: false,
        studentExtraction: false,
        audioAnalysis: false,
        vicenteAssistant: false,
      };
    }
  });


  // Data State
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [deletedStudents, setDeletedStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>([]);
  const [anecdotes, setAnecdotes] = useState<AnecdotalRecord[]>([]);
  const [instruments, setInstruments] = useState<EvaluationInstrument[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [recoveryGrades, setRecoveryGrades] = useState<RecoveryGrade[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [fundamentalCompetencies, setFundamentalCompetencies] = useState<FundamentalCompetency[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileData | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);

  // Modal States
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<Class | null>(null);
  const [isClassDetailModalOpen, setIsClassDetailModalOpen] = useState(false);
  const [classToView, setClassToView] = useState<Class | null>(null);

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [classIdForNewStudent, setClassIdForNewStudent] = useState<string | null>(null);

  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isMoveStudentModalOpen, setIsMoveStudentModalOpen] = useState(false);
  const [studentToMove, setStudentToMove] = useState<Student | null>(null);

  const [isMoveStudentBulkModalOpen, setIsMoveStudentBulkModalOpen] = useState(false);
  const [studentsToMoveBulk, setStudentsToMoveBulk] = useState<Student[]>([]);

  const [isEditStudentBulkModalOpen, setIsEditStudentBulkModalOpen] = useState(false);
  const [studentsToEditBulk, setStudentsToEditBulk] = useState<Student[]>([]);

  const [isStudentImportModalOpen, setIsStudentImportModalOpen] = useState(false);

  const [isAddAnecdoteModalOpen, setIsAddAnecdoteModalOpen] = useState(false);

  const [isAddInstrumentModalOpen, setIsAddInstrumentModalOpen] = useState(false);
  const [isEditInstrumentModalOpen, setIsEditInstrumentModalOpen] = useState(false);
  const [instrumentToEdit, setInstrumentToEdit] = useState<EvaluationInstrument | null>(null);
  const [isInstrumentDetailModalOpen, setIsInstrumentDetailModalOpen] = useState(false);
  const [instrumentToView, setInstrumentToView] = useState<EvaluationInstrument | null>(null);

  const [isExpressGradingModalOpen, setIsExpressGradingModalOpen] = useState(false);
  const [gradingInstrument, setGradingInstrument] = useState<EvaluationInstrument | null>(null);
  const [expressGradingStudentId, setExpressGradingStudentId] = useState<string | null>(null);

  const [isAddCompetencyModalOpen, setIsAddCompetencyModalOpen] = useState(false);

  const [isAddRecoveryGradeModalOpen, setIsAddRecoveryGradeModalOpen] = useState(false);
  const [recoveryGradeContext, setRecoveryGradeContext] = useState<{ student: Student, period: EvaluationPeriod, competencyGroup: CompetencyGroup, currentScore: number | null } | null>(null);

  const [isGlobalSearchModalOpen, setIsGlobalSearchModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // View Context State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [initialFundamentalFilter, setInitialFundamentalFilter] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState<string | null>(null);

  const [studentsToMoveToBin, setStudentsToMoveToBin] = useState<Student[]>([]);
  const [studentToPermanentlyDelete, setStudentToPermanentlyDelete] = useState<Student | null>(null);
  const [studentsToPermanentlyDeleteBulk, setStudentsToPermanentlyDeleteBulk] = useState<Student[]>([]);

  const [deletedClasses, setDeletedClasses] = useState<Class[]>([]);
  const [classToMoveToBin, setClassToMoveToBin] = useState<Class | null>(null);
  const [classToPermanentlyDelete, setClassToPermanentlyDelete] = useState<Class | null>(null);
  const [classesToPermanentlyDeleteBulk, setClassesToPermanentlyDeleteBulk] = useState<Class[]>([]);

  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Connection & Notifications
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToasts(prev => [...prev, { id: uuidv4(), message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };


  // --- Data Subscription Logic ---

  useEffect(() => {
    const unsubscribeAuth = authService.onAuthStateChange((currentUser) => {
      console.log('Vicente Debug: Auth State Change', currentUser?.email);
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      // Clear data on logout
      setClasses([]);
      setStudents([]);
      setDeletedStudents([]);
      setDeletedClasses([]);
      setAttendance([]);
      setDailyNotes([]);
      setAnecdotes([]);
      setInstruments([]);
      setGrades([]);
      setRecoveryGrades([]);
      setCompetencies([]);
      setJournalEntries([]);
      setResources([]);
      setCustomEvents([]);
      setLessonPlans([]);
      setTeacherProfile(null);
      return;
    }

    // One-time initialization for static/preference data
    const initializeData = async () => {
      const sidebarState = await api.getIsSidebarCollapsed();
      const initialFundamental = await api.getFundamentalCompetencies(user.id);
      const initialAIFeatures = await api.getAIFeatures(user.id);
      setIsSidebarCollapsed(sidebarState);
      setFundamentalCompetencies(initialFundamental);
      setAiFeatures(initialAIFeatures);

      // Seed demo data if needed
      if (authService.isDemoMode()) {
        const currentClasses = await api.getClasses();
        if (currentClasses.length === 0) await api.seedDemoData();
      }
    };
    initializeData();

    // Setup Real-time Subscriptions
    const savedClassId = localStorage.getItem('teacherkit-lastSelectedClassId');

    const unsubscribers = [
      api.onClassesChange(fetchedClasses => {
        setClasses(fetchedClasses);
        if (savedClassId && fetchedClasses.some(c => c.id === savedClassId)) {
          setSelectedClassId(savedClassId);
        } else if (fetchedClasses.length > 0 && !selectedClassId) {
          setSelectedClassId(fetchedClasses[0].id);
        }
      }, user.id),
      api.onStudentsChange(setStudents, user.id),
      api.onDeletedStudentsChange(setDeletedStudents, user.id),
      api.onDeletedClassesChange(setDeletedClasses, user.id),
      api.onAttendanceChange(setAttendance, user.id),
      api.onDailyNotesChange(setDailyNotes, user.id),
      api.onAnecdotesChange(setAnecdotes, user.id),
      api.onInstrumentsChange(setInstruments, user.id),
      api.onGradesChange(setGrades, user.id),
      api.onRecoveryGradesChange(setRecoveryGrades, user.id),
      api.onCompetenciesChange(setCompetencies, user.id),
      api.onJournalChange(setJournalEntries, user.id),
      api.onResourcesChange(setResources, user.id),
      api.onEventsChange(setCustomEvents, user.id),
      api.onLessonPlansChange(setLessonPlans, user.id),
      api.onTeacherProfileChange(setTeacherProfile, user.id),
      api.onAIFeaturesChange(setAiFeatures, user.id)
    ];

    let isInitialStatus = true;
    const unsubscribeConnection = api.subscribeToConnectionStatus((status) => {
      setConnectionStatus(status);
      if (status === 'offline') {
        addToast('Estás desconectado. Los cambios se guardarán localmente.', 'warning');
      } else if (status === 'online' && !isInitialStatus) {
        addToast('Conexión restablecida.', 'success');
      }
      isInitialStatus = false;
    });
    api.monitorConnection();
    unsubscribers.push(unsubscribeConnection);

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [user]);

  // --- Effects ---

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-size-sm', 'font-size-base', 'font-size-lg');
    root.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  // Sync auth profile with teacher profile data
  useEffect(() => {
    const updateProfile = async () => {
      if (!teacherProfile || !user) return;

      const isDefault = teacherProfile.name === 'Usuario' && teacherProfile.email === 'usuario@example.com';
      const needsSync = teacherProfile.name !== user.name || (user.email && teacherProfile.email !== user.email);
      const isFallback = (teacherProfile as any)._isFallback;

      if (isDefault || needsSync || isFallback) {
        console.log('Vicente Debug: Syncing Teacher Profile to Firestore', { isDefault, needsSync, isFallback });
        const updatedProfile = {
          ...teacherProfile,
          name: user.name || teacherProfile.name,
          email: user.email || teacherProfile.email,
          profilePictureUrl: teacherProfile.profilePictureUrl || user.photoURL || ''
        };
        // Remove internal flag before saving
        const { _isFallback, ...profileToSave } = updatedProfile as any;

        await api.setTeacherProfile(profileToSave);
        setTeacherProfile(profileToSave);
      }
    };
    updateProfile();
  }, [user, teacherProfile]);


  // --- Handlers ---

  const handleSetSelectedClassId = async (classId: string) => {
    setSelectedClassId(classId);
    await api.setLastSelectedClassId(classId);
  };

  const handleNavigateTo = (viewName: View | 'VIEW_INSTRUMENT_DETAIL', context?: any) => {
    setInitialFundamentalFilter(null);

    if (viewName === 'STUDENT_PROFILE' && context?.studentId) {
      const student = students.find(s => s.id === context.studentId);
      if (student) {
        setSelectedStudent(student);
        setCurrentView('STUDENT_PROFILE');
      }
    } else if (viewName === 'VIEW_INSTRUMENT_DETAIL' && context?.instrumentId) {
      const instrument = instruments.find(i => i.id === context.instrumentId);
      if (instrument) {
        setInstrumentToView(instrument);
        setIsInstrumentDetailModalOpen(true);
      }
    } else if (viewName === 'STUDENTS' && context?.classId) {
      if (context.classId !== selectedClassId) {
        handleSetSelectedClassId(context.classId);
      }
      setCurrentView('STUDENTS');
    } else if (viewName === 'GRADEBOOK_COMPETENCIES' && context?.competencyId) {
      const competency = competencies.find(c => c.id === context.competencyId);
      if (competency) {
        if (competency.classId !== selectedClassId) {
          handleSetSelectedClassId(competency.classId);
        }
        setInitialFundamentalFilter(competency.fundamentalId);
      }
      setCurrentView('GRADEBOOK_COMPETENCIES');
    } else {
      setCurrentView(viewName as View);
    }
    setIsGlobalSearchModalOpen(false);
  };

  // Class Handlers
  const handleAddClass = async (name: string, grade: string, section: string, schoolYear: string, level: string) => {
    const classColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#78716c'];
    const color = classColors[classes.length % classColors.length];
    const updatedClasses = await api.addClass({ name, grade, section, schoolYear, level, schedule: 'Horario por definir', color });
    setClasses(updatedClasses);
    if (!selectedClassId) {
      handleSetSelectedClassId(updatedClasses[updatedClasses.length - 1].id);
    }
    addToast('Clase creada exitosamente.', 'success');
    setIsAddClassModalOpen(false);
  };

  const handleEditClass = async (classId: string, updatedData: Omit<Class, 'id'>) => {
    const updatedClasses = await api.updateClass(classId, updatedData);
    setClasses(updatedClasses);
    setClassToEdit(null);
    setIsEditClassModalOpen(false);
    addToast('Clase actualizada exitosamente.', 'success');
  };

  const handleMoveClassToBin = async () => {
    if (!classToMoveToBin) return;
    const { classes: updatedClasses, deletedClasses: updatedDeleted } = await api.moveClassToBin(classToMoveToBin.id);
    setClasses(updatedClasses);
    setDeletedClasses(updatedDeleted);
    setClassToMoveToBin(null);
    addToast('Clase movida a la papelera.', 'info');
  };

  const handleRestoreClass = async (classId: string) => {
    const { classes: updatedClasses, deletedClasses: updatedDeleted } = await api.restoreClass(classId);
    setClasses(updatedClasses);
    setDeletedClasses(updatedDeleted);
    addToast('Clase restaurada.', 'success');
  };

  const handlePermanentlyDeleteClass = async () => {
    if (!classToPermanentlyDelete) return;
    const { deletedClasses: updatedDeleted } = await api.permanentlyDeleteClass(classToPermanentlyDelete.id);
    setDeletedClasses(updatedDeleted);
    setClassToPermanentlyDelete(null);
    addToast('Clase eliminada permanentemente.', 'error');
  };

  const handlePermanentlyDeleteClassesBulk = async () => {
    if (classesToPermanentlyDeleteBulk.length === 0) return;
    const { deletedClasses: updatedDeleted } = await api.permanentlyDeleteClasses(classesToPermanentlyDeleteBulk.map(c => c.id));
    setDeletedClasses(updatedDeleted);
    setClassesToPermanentlyDeleteBulk([]);
    addToast(`${classesToPermanentlyDeleteBulk.length} clases eliminadas permanentemente.`, 'error');
  };

  // Student Handlers
  const handleAddStudent = async (studentData: Omit<Student, 'id' | 'classId'>) => {
    if (!classIdForNewStudent) return;
    const updatedStudents = await api.addStudent({
      ...studentData,
      classId: classIdForNewStudent,
    });
    setStudents(updatedStudents);
    setIsAddStudentModalOpen(false);
    setClassIdForNewStudent(null);
    addToast('Estudiante añadido exitosamente.', 'success');
  };

  const handleImportStudents = async (newStudentsData: Omit<Student, 'id' | 'classId' | 'avatar'>[], classId: string) => {
    const studentsToCreate = newStudentsData.map(s => ({
      ...s,
      classId: classId,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
      gender: s.gender || (Math.random() > 0.5 ? 'M' : 'F'),
    }));

    const updatedStudents = await api.addStudents(studentsToCreate);
    setStudents(updatedStudents);
    setIsStudentImportModalOpen(false);
    handleSetSelectedClassId(classId);
    setCurrentView('STUDENTS');
    addToast(`${newStudentsData.length} estudiantes importados.`, 'success');
  };

  const handleMoveStudent = async (studentId: string, newClassId: string) => {
    const currentStudents = students.map(s => s.id === studentId ? { ...s, classId: newClassId } : s);
    await api.setStudents(currentStudents);
    setStudents(currentStudents);
    setStudentToMove(null);
    setIsMoveStudentModalOpen(false);
    addToast('Estudiante movido de clase.', 'success');
  };

  const handleMoveStudentsBulk = async (studentIds: string[], newClassId: string) => {
    const currentStudents = students.map(s => studentIds.includes(s.id) ? { ...s, classId: newClassId } : s);
    await api.setStudents(currentStudents);
    setStudents(currentStudents);
    setStudentsToMoveBulk([]);
    setIsMoveStudentBulkModalOpen(false);
    addToast(`${studentIds.length} estudiantes movidos.`, 'success');
  };

  const handleEditStudent = async (studentId: string, updatedData: Partial<Student>) => {
    await api.updateStudent(studentId, updatedData);
    const updatedStudents = students.map(s => s.id === studentId ? { ...s, ...updatedData } : s);
    setStudents(updatedStudents);

    // Update selected student if in profile view
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(prev => prev ? { ...prev, ...updatedData } : null);
    }

    setStudentToEdit(null);
    setIsEditStudentModalOpen(false);
    addToast('Estudiante actualizado.', 'success');
  };

  const handleEditStudentsBulk = async (studentIds: string[], newClassId: string) => {
    const currentStudents = students.map(s => studentIds.includes(s.id) ? { ...s, classId: newClassId } : s);
    await api.setStudents(currentStudents);
    setStudents(currentStudents);
    setStudentsToEditBulk([]);
    setIsEditStudentBulkModalOpen(false);
    addToast(`${studentIds.length} estudiantes actualizados.`, 'success');
  };

  const handleMoveStudentsToBin = async () => {
    if (studentsToMoveToBin.length === 0) return;
    const { students: updatedStudents, deletedStudents: updatedDeletedStudents } = await api.moveStudentsToBin(studentsToMoveToBin);
    setStudents(updatedStudents);
    setDeletedStudents(updatedDeletedStudents);
    setStudentsToMoveToBin([]);
    addToast(`${studentsToMoveToBin.length} estudiante(s) enviado(s) a la papelera.`, 'info');
  };

  const handleRestoreStudent = async (studentId: string) => {
    const studentToRestore = deletedStudents.find(s => s.id === studentId);
    if (studentToRestore) {
      const { students: updatedStudents, deletedStudents: updatedDeletedStudents } = await api.restoreStudent(studentToRestore);
      setStudents(updatedStudents);
      setDeletedStudents(updatedDeletedStudents);
      addToast('Estudiante restaurado.', 'success');
    }
  };

  const handlePermanentlyDeleteStudent = async () => {
    if (!studentToPermanentlyDelete) return;
    const { deletedStudents: ud, attendance: ua, anecdotes: uan, grades: ug } = await api.permanentlyDeleteStudent(studentToPermanentlyDelete.id);
    setDeletedStudents(ud);
    setAttendance(ua);
    setAnecdotes(uan);
    setGrades(ug);
    setStudentToPermanentlyDelete(null);
    addToast('Estudiante eliminado permanentemente.', 'error');
  };

  const handlePermanentlyDeleteStudentsBulk = async () => {
    if (studentsToPermanentlyDeleteBulk.length === 0) return;
    const { deletedStudents: ud } = await api.permanentlyDeleteStudents(studentsToPermanentlyDeleteBulk.map(s => s.id));
    setDeletedStudents(ud);
    setStudentsToPermanentlyDeleteBulk([]);
    addToast(`${studentsToPermanentlyDeleteBulk.length} estudiantes eliminados permanentemente.`, 'error');
  };

  // Anecdote Handlers
  const handleAddAnecdote = async (newAnecdote: Omit<AnecdotalRecord, 'id' | 'studentId'> & { studentIds: string[] }) => {
    const { studentIds, ...anecdoteData } = newAnecdote;
    const newRecords = studentIds.map(studentId => ({
      ...anecdoteData,
      id: `A${Date.now()}${Math.random()}`,
      studentId,
    }));
    const updatedAnecdotes = await api.addAnecdotes(newRecords);
    setAnecdotes(updatedAnecdotes);
    setIsAddAnecdoteModalOpen(false);
    addToast('Anécdota registrada.', 'success');
  };

  // Attendance Handlers
  const handleSetAttendance = (value: React.SetStateAction<AttendanceRecord[]>) => {
    setAttendance(current => {
      const newAttendance = value instanceof Function ? value(current) : value;
      api.setAttendance(newAttendance);
      return newAttendance;
    });
  };

  const handleSetDailyNotes = (value: React.SetStateAction<DailyNote[]>) => {
    setDailyNotes(current => {
      const newNotes = value instanceof Function ? value(current) : value;
      api.setDailyNotes(newNotes);
      return newNotes;
    });
  };

  // Competency Handlers
  const handleAddCompetencies = async (competenciesToAdd: Omit<Competency, 'id'>[]) => {
    const updatedCompetencies = await api.addCompetencies(competenciesToAdd);
    setCompetencies(updatedCompetencies);
    addToast('Competencias añadidas.', 'success');
  };

  // Instrument Handlers
  const handleAddInstrument = async (instrument: Omit<EvaluationInstrument, 'id'>) => {
    const updatedInstruments = await api.addInstrument(instrument);
    setInstruments(updatedInstruments);
    addToast('Instrumento de evaluación añadido.', 'success');
  };

  const handleEditInstrument = async (instrumentId: string, updatedInstrumentData: Omit<EvaluationInstrument, 'id'>) => {
    const updatedInstruments = await api.updateInstrument(instrumentId, updatedInstrumentData);
    setInstruments(updatedInstruments);
    setInstrumentToEdit(null);
    setIsEditInstrumentModalOpen(false);
    addToast('Instrumento de evaluación actualizado.', 'success');
  };

  const handleSaveExpressGrades = async (instrumentId: string, updatedGrades: { studentId: string; score: number | null; criteriaScores?: Record<string, boolean | number | null> }[]) => {
    const newGrades = [...grades];
    updatedGrades.forEach(({ studentId, score, criteriaScores }) => {
      const existingGradeIndex = newGrades.findIndex(g => g.studentId === studentId && g.instrumentId === instrumentId);
      if (existingGradeIndex > -1) {
        newGrades[existingGradeIndex] = { ...newGrades[existingGradeIndex], score, criteriaScores };
      } else {
        newGrades.push({ studentId, instrumentId, score, criteriaScores });
      }
    });
    await api.setGrades(newGrades);
    setGrades(newGrades);
    setGradingInstrument(null);
    setExpressGradingStudentId(null);
    setIsExpressGradingModalOpen(false);
    addToast('Calificaciones guardadas.', 'success');
  };

  // Recovery Grade
  const handleSaveRecoveryGrade = async (gradeData: Omit<RecoveryGrade, 'id'>) => {
    const updatedRecoveryGrades = await api.saveRecoveryGrade(gradeData);
    setRecoveryGrades(updatedRecoveryGrades);
    setRecoveryGradeContext(null);
    setIsAddRecoveryGradeModalOpen(false);
    addToast('Calificación de recuperación guardada.', 'success');
  };

  // Teacher Profile
  const handleUpdateTeacherProfile = async (updatedProfile: TeacherProfileData) => {
    await api.setTeacherProfile(updatedProfile);
    setTeacherProfile(updatedProfile);
    addToast('Perfil actualizado.', 'success');
  };

  const handleAddJournalEntry = async (content: string) => {
    const updatedEntries = await api.addJournalEntry(content);
    setJournalEntries(updatedEntries);
    addToast('Entrada de diario añadida.', 'success');
  };

  const handleAddResource = async (title: string, url: string, description: string) => {
    const updatedResources = await api.addResource(title, url, description);
    setResources(updatedResources);
    addToast('Recurso añadido.', 'success');
  };

  // Calendar
  const handleAddCustomEvent = async (eventData: Omit<CustomEvent, 'id'>) => {
    const updatedEvents = await api.addCustomEvent(eventData);
    setCustomEvents(updatedEvents);
    addToast('Evento añadido al calendario.', 'success');
  };
  const handleUpdateCustomEvent = async (eventId: string, eventData: Omit<CustomEvent, 'id'>) => {
    const updatedEvents = await api.updateCustomEvent(eventId, eventData);
    setCustomEvents(updatedEvents);
    addToast('Evento actualizado.', 'success');
  };
  const handleDeleteCustomEvent = async (eventId: string) => {
    const updatedEvents = await api.deleteCustomEvent(eventId);
    setCustomEvents(updatedEvents);
    addToast('Evento eliminado.', 'info');
  };

  // Lesson Plans
  const handleAddLessonPlan = async (plan: Omit<LessonPlan, 'id'>) => {
    const updatedPlans = await api.addLessonPlan(plan);
    setLessonPlans(updatedPlans);
    addToast('Plan de lección añadido.', 'success');
  };
  const handleUpdateLessonPlan = async (planId: string, plan: Omit<LessonPlan, 'id'>) => {
    const updatedPlans = await api.updateLessonPlan(planId, plan);
    setLessonPlans(updatedPlans);
    addToast('Plan de lección actualizado.', 'success');
  };
  const handleDeleteLessonPlan = async (planId: string) => {
    const updatedPlans = await api.deleteLessonPlan(planId);
    setLessonPlans(updatedPlans);
    addToast('Plan de lección eliminado.', 'info');
  };

  // Settings
  const handleSetIsDarkMode = async (value: boolean) => {
    await api.setIsDarkMode(value);
    setIsDarkMode(value);
    addToast(`Modo oscuro ${value ? 'activado' : 'desactivado'}.`, 'info');
  };
  const handleSetFontSize = async (size: FontSize) => {
    await api.setFontSize(size);
    setFontSize(size);
    addToast('Tamaño de fuente actualizado.', 'info');
  };
  const handleSetAiFeatures = async (features: AIFeatures) => {
    await api.setAIFeatures(features);
    setAiFeatures(features);
    addToast('Configuración de IA actualizada.', 'success');
  };
  const handleToggleSidebarCollapse = async () => {
    const newValue = !isSidebarCollapsed;
    await api.setIsSidebarCollapsed(newValue);
    setIsSidebarCollapsed(newValue);
    addToast(`Barra lateral ${newValue ? 'colapsada' : 'expandida'}.`, 'info');
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setIsLogoutConfirmOpen(false);
    addToast('Sesión cerrada exitosamente.', 'success');

    // Reset App State to defaults
    setIsDarkMode(false);
    setFontSize('base');
    setAiFeatures({
      summaryGeneration: false,
      criteriaGeneration: false,
      lessonPlanning: false,
      studentExtraction: false,
      audioAnalysis: false,
      vicenteAssistant: false,
    });

    // Clear data state
    setClasses([]);
    setStudents([]);
    setDeletedStudents([]);
    setDeletedClasses([]);
    setAttendance([]);
    setDailyNotes([]);
    setAnecdotes([]);
    setInstruments([]);
    setGrades([]);
    setRecoveryGrades([]);
    setCompetencies([]);
    setJournalEntries([]);
    setResources([]);
    setCustomEvents([]);
    setLessonPlans([]);
    setTeacherProfile(null);
    setSelectedClassId(null);
    setCurrentView('DASHBOARD');
  };

  const activeStudentIdValue = studentToEdit?.id || studentToMove?.id;

  // --- Rendering ---

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={() => Promise.resolve(false)} onSignUp={() => Promise.resolve(false)} />;
  }

  const getHeaderTitle = () => {
    if (selectedStudent && currentView === 'STUDENT_PROFILE') return `Perfil de ${selectedStudent.name}`;
    if (currentView === 'ATTENDANCE') return 'Registro de Asistencia';
    if (currentView === 'REPORTS') return 'Generador de Reportes';
    const titles: Record<View, string> = {
      DASHBOARD: 'Panel de Control',
      CLASSES: 'Gestión de Cursos',
      STUDENTS: 'Gestión de Estudiantes',
      STUDENT_PROFILE: 'Perfil del Estudiante',
      ATTENDANCE: 'Registro de Asistencia',
      REPORTS: 'Generador de Reportes',
      GRADEBOOK_GRADES: 'Calificador',
      GRADEBOOK_INSTRUMENTS: 'Calificador',
      GRADEBOOK_COMPETENCIES: 'Calificador',
      SETTINGS: 'Ajustes',
      SETTINGS_AI: 'Inteligencia Artificial',
      SETTINGS_APPEARANCE: 'Configuraciones',
      SETTINGS_RECYCLE_BIN: 'Papelera de Reciclaje',
      TEACHER_PROFILE: 'Perfil Docente',
      CALENDAR: 'Calendario',
      LESSON_PLANNER: 'Planificador de Lecciones',
    };
    return titles[currentView] || 'Regis';
  };

  const renderView = () => {
    console.log('Vicente Debug: renderView State', {
      hasProfile: !!teacherProfile,
      classesCount: classes.length,
      currentView,
      selectedClassId
    });

    if (!teacherProfile) return null;

    if (classes.length === 0 && !['SETTINGS', 'SETTINGS_APPEARANCE', 'SETTINGS_RECYCLE_BIN', 'TEACHER_PROFILE', 'CLASSES', 'CALENDAR'].includes(currentView)) {
      return (
        <div className="p-8 text-center flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">¡Bienvenido!</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">Parece que aún no ha creado ninguna clase. ¡Empiece por añadir una para poder gestionar sus estudiantes, asistencia y calificaciones!</p>
          <button
            onClick={() => setIsAddClassModalOpen(true)}
            className="mt-6 flex items-center justify-center mx-auto bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Añadir Clase
          </button>
        </div>
      );
    }

    if (selectedClassId && !classes.some(c => c.id === selectedClassId) && classes.length > 0) {
      handleSetSelectedClassId(classes[0].id);
      return null; // Wait for re-render with valid ID
    }

    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard
            userName={user.name}
            classes={classes}
            students={students}
            instruments={instruments}
            attendance={attendance}
            grades={grades}
            onNavigate={setCurrentView}
            onAddAnecdoteClick={() => setIsAddAnecdoteModalOpen(true)}
            selectedClassId={selectedClassId}
            aiFeatures={aiFeatures}
          />
        );
      case 'CLASSES':
        return <div className="p-4 sm:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Mis Cursos</h2>
            <button onClick={() => setIsAddClassModalOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700">Añadir Curso</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
              <div
                key={cls.id}
                onClick={() => handleNavigateTo('STUDENTS', { classId: cls.id })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleNavigateTo('STUDENTS', { classId: cls.id });
                  }
                }}
                role="button"
                tabIndex={0}
                style={{ borderLeftColor: cls.color }}
                className="relative group w-full text-left bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border-l-4 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-extrabold text-xl text-slate-800 dark:text-slate-100">{cls.grade.replace(' Grado', '')} {cls.section}</p>
                    <p className="font-semibold text-slate-600 dark:text-slate-300">{cls.name}</p>
                    {cls.level && <p className="text-xs text-slate-400 mt-1">{cls.level}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-3 py-1 rounded-full">
                    {students.filter(s => s.classId === cls.id).length}
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">{cls.schoolYear}</p>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setClassToView(cls); }} className="p-2 rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 font-bold text-xs px-4">Ver</button>
                  <button onClick={(e) => { e.stopPropagation(); setClassToMoveToBin(cls); }} className="p-2 rounded-full bg-white text-rose-500 shadow-lg hover:bg-rose-50 border border-slate-100">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>;
      case 'STUDENTS':
        return <StudentManager students={students} classes={classes} onViewProfile={(s) => { setSelectedStudent(s); setCurrentView('STUDENT_PROFILE'); }} onAddClassClick={() => setIsAddClassModalOpen(true)} onAddStudentClick={(id) => { setClassIdForNewStudent(id); setIsAddStudentModalOpen(true); }} onImportStudentsClick={() => setIsStudentImportModalOpen(true)} onMoveStudentClick={(s) => { setStudentToMove(s); setIsMoveStudentModalOpen(true); }} onEditStudentClick={(s) => { setStudentToEdit(s); setIsEditStudentModalOpen(true); }} onMoveStudentBulkClick={(s) => { setStudentsToMoveBulk(s); setIsMoveStudentBulkModalOpen(true); }} onEditStudentBulkClick={(s) => { setStudentsToEditBulk(s); setIsEditStudentBulkModalOpen(true); }} onMoveToBinClick={(s) => { setStudentsToMoveToBin([s]); }} onMoveToBinBulkClick={(s) => { setStudentsToMoveToBin(s); }} activeStudentId={activeStudentIdValue} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} />;
      case 'STUDENT_PROFILE':
        if (selectedStudent) {
          return <StudentProfile student={selectedStudent} anecdotes={anecdotes} attendance={attendance} classes={classes} onBack={() => setCurrentView('STUDENTS')} onAddAnecdote={(anecdote) => handleAddAnecdote({ ...anecdote, studentIds: [anecdote.studentId] })} onViewGrades={(id) => { setStudentFilter(id); setCurrentView('GRADEBOOK_GRADES'); }} onUpdateStudent={(data) => handleEditStudent(selectedStudent.id, data)} aiFeatures={aiFeatures} />;
        }
        setCurrentView('STUDENTS'); return null;
      case 'ATTENDANCE':
        return <AttendanceManager students={students} classes={classes} attendance={attendance} onSetAttendance={handleSetAttendance} dailyNotes={dailyNotes} onSetDailyNotes={handleSetDailyNotes} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} onAddStudentClick={(id) => { setClassIdForNewStudent(id); setIsAddStudentModalOpen(true); }} />;
      case 'GRADEBOOK_GRADES':
      case 'GRADEBOOK_INSTRUMENTS':
      case 'GRADEBOOK_COMPETENCIES': {
        let tab: 'GRADES' | 'INSTRUMENTS' | 'COMPETENCIES' = 'GRADES';
        if (currentView === 'GRADEBOOK_INSTRUMENTS') tab = 'INSTRUMENTS';
        if (currentView === 'GRADEBOOK_COMPETENCIES') tab = 'COMPETENCIES';
        return <GradebookManager students={students} classes={classes} fundamentalCompetencies={fundamentalCompetencies} competencies={competencies} instruments={instruments} grades={grades} recoveryGrades={recoveryGrades} onAddCompetencyClick={() => setIsAddCompetencyModalOpen(true)} onAddInstrumentClick={() => setIsAddInstrumentModalOpen(true)} onEditInstrumentClick={(inst) => { setInstrumentToEdit(inst); setIsEditInstrumentModalOpen(true); }} onViewInstrumentDetails={(inst) => { setInstrumentToView(inst); setIsInstrumentDetailModalOpen(true); }} onAddRecoveryGradeClick={(s, p, g, score) => { setRecoveryGradeContext({ student: s, period: p, competencyGroup: g, currentScore: score }); setIsAddRecoveryGradeModalOpen(true); }} initialTab={tab} onExpressGradingClick={(inst, sId) => { setGradingInstrument(inst); setExpressGradingStudentId(sId || null); setIsExpressGradingModalOpen(true); }} studentFilter={studentFilter} onClearStudentFilter={() => setStudentFilter(null)} initialFundamentalFilter={initialFundamentalFilter} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} onAddStudentClick={(id) => { setClassIdForNewStudent(id); setIsAddStudentModalOpen(true); }} />;
      }
      case 'REPORTS':
        return <Reports students={students} classes={classes} attendance={attendance} anecdotes={anecdotes} instruments={instruments} grades={grades} recoveryGrades={recoveryGrades} teacherName={user.name} fundamentalCompetencies={fundamentalCompetencies} competencies={competencies} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} aiFeatures={aiFeatures} />;
      case 'TEACHER_PROFILE':
        return <TeacherProfile profile={teacherProfile} classes={classes} students={students} journalEntries={journalEntries} resources={resources} onAddJournalEntry={handleAddJournalEntry} onAddResource={handleAddResource} onClassClick={(cls) => setClassToView(cls)} onLogout={() => setIsLogoutConfirmOpen(true)} onUpdateProfile={handleUpdateTeacherProfile} />;
      case 'CALENDAR':
        return <CalendarView classes={classes} instruments={instruments} customEvents={customEvents} onAddEvent={handleAddCustomEvent} onUpdateEvent={handleUpdateCustomEvent} onDeleteEvent={handleDeleteCustomEvent} />;
      case 'LESSON_PLANNER':
        return <LessonPlanner classes={classes} lessonPlans={lessonPlans} onAddLessonPlan={handleAddLessonPlan} onUpdateLessonPlan={handleUpdateLessonPlan} onDeleteLessonPlan={handleDeleteLessonPlan} aiFeatures={aiFeatures} />;
      case 'SETTINGS':
      case 'SETTINGS_APPEARANCE':
      case 'SETTINGS_AI':
        return <SettingsManager
          isDarkMode={isDarkMode}
          setIsDarkMode={handleSetIsDarkMode}
          fontSize={fontSize}
          setFontSize={handleSetFontSize}
          aiFeatures={aiFeatures}
          setAiFeatures={handleSetAiFeatures}
          currentUserEmail={user.email}
          deletedStudents={deletedStudents}
          classes={classes}
          onRestore={handleRestoreStudent}
          onPermanentDelete={(s) => setStudentToPermanentlyDelete(s)}
          deletedClasses={deletedClasses}
          onRestoreClass={handleRestoreClass}
          onPermanentDeleteClass={(c) => setClassToPermanentlyDelete(c)}
        />;
      case 'SETTINGS_RECYCLE_BIN':
        return <RecycleBin
          deletedStudents={deletedStudents}
          classes={classes}
          onRestore={handleRestoreStudent}
          onPermanentDelete={(s) => setStudentToPermanentlyDelete(s)}
          onPermanentDeleteBulk={(students) => setStudentsToPermanentlyDeleteBulk(students)}
          deletedClasses={deletedClasses}
          onRestoreClass={handleRestoreClass}
          onPermanentDeleteClass={(c) => setClassToPermanentlyDelete(c)}
          onPermanentDeleteClassesBulk={(classes) => setClassesToPermanentlyDeleteBulk(classes)}
        />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-screen bg-slate-100 dark:bg-slate-900 font-sans`}>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isSidebarCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebarCollapse} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="md:hidden">
          <MobileHeader
            userName={user.name}
            userAvatar={teacherProfile?.profilePictureUrl}
            onSearchClick={() => setIsGlobalSearchModalOpen(true)}
            onNavigate={handleNavigateTo}
            onLogout={() => setIsLogoutConfirmOpen(true)}
            currentView={currentView}
            title={getHeaderTitle()}
            connectionStatus={connectionStatus}
          />
        </div>
        <div className="hidden md:block">
          <Header
            title={getHeaderTitle()}
            userName={user.name}
            userAvatar={teacherProfile?.profilePictureUrl}
            onMenuClick={() => setIsSidebarOpen(true)}
            onSearchClick={() => setIsGlobalSearchModalOpen(true)}
            onNavigate={handleNavigateTo}
            onLogout={() => setIsLogoutConfirmOpen(true)}
            currentView={currentView}
            connectionStatus={connectionStatus}
          />
        </div>

        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        <div className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
          {renderView()}
          <UpdatePrompt />
        </div>
      </main>

      <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView} />

      {/* Modals */}
      <AddClassModal isOpen={isAddClassModalOpen} onClose={() => setIsAddClassModalOpen(false)} onAddClass={handleAddClass} classes={classes} />
      <EditClassModal isOpen={isEditClassModalOpen} onClose={() => { setIsEditClassModalOpen(false); setClassToEdit(null); }} onSave={handleEditClass} classToEdit={classToEdit} />

      <AddStudentModal isOpen={isAddStudentModalOpen} onClose={() => { setIsAddStudentModalOpen(false); setClassIdForNewStudent(null); }} onAddStudent={handleAddStudent} />
      <EditStudentModal isOpen={isEditStudentModalOpen} onClose={() => { setIsEditStudentModalOpen(false); setStudentToEdit(null); }} student={studentToEdit} onSave={handleEditStudent} />
      <MoveStudentModal isOpen={isMoveStudentModalOpen} onClose={() => { setIsMoveStudentModalOpen(false); setStudentToMove(null); }} student={studentToMove} classes={classes} onMoveStudent={handleMoveStudent} />

      <MoveStudentBulkModal isOpen={isMoveStudentBulkModalOpen} onClose={() => { setIsMoveStudentBulkModalOpen(false); setStudentsToMoveBulk([]); }} students={studentsToMoveBulk} classes={classes} onMoveStudents={handleMoveStudentsBulk} />
      <EditStudentBulkModal isOpen={isEditStudentBulkModalOpen} onClose={() => { setIsEditStudentBulkModalOpen(false); setStudentsToEditBulk([]); }} students={studentsToEditBulk} classes={classes} onSave={handleEditStudentsBulk} />

      <StudentImportModal isOpen={isStudentImportModalOpen} onClose={() => setIsStudentImportModalOpen(false)} onImport={handleImportStudents} classes={classes} aiFeatures={aiFeatures} selectedClassId={selectedClassId} />
      <AddAnecdoteModal isOpen={isAddAnecdoteModalOpen} onClose={() => setIsAddAnecdoteModalOpen(false)} students={students} onAddAnecdote={(a) => handleAddAnecdote(a)} selectedClassId={selectedClassId} />

      <AddInstrumentModal isOpen={isAddInstrumentModalOpen} onClose={() => setIsAddInstrumentModalOpen(false)} onAddInstrument={handleAddInstrument} classes={classes} competencies={competencies} aiFeatures={aiFeatures} selectedClassId={selectedClassId} />
      <EditInstrumentModal isOpen={isEditInstrumentModalOpen} onClose={() => { setIsEditInstrumentModalOpen(false); setInstrumentToEdit(null); }} onEditInstrument={handleEditInstrument} instrument={instrumentToEdit} classes={classes} competencies={competencies} aiFeatures={aiFeatures} />
      <InstrumentDetailModal isOpen={isInstrumentDetailModalOpen} onClose={() => { setIsInstrumentDetailModalOpen(false); setInstrumentToView(null); }} instrument={instrumentToView} competencies={competencies} onExpressGradingClick={(inst) => { setIsInstrumentDetailModalOpen(false); setGradingInstrument(inst); setIsExpressGradingModalOpen(true); }} onEditInstrumentClick={(inst) => { setIsInstrumentDetailModalOpen(false); setInstrumentToEdit(inst); setIsEditInstrumentModalOpen(true); }} />
      <ExpressGradingModal isOpen={isExpressGradingModalOpen} onClose={() => { setIsExpressGradingModalOpen(false); setGradingInstrument(null); setExpressGradingStudentId(null); }} instrument={gradingInstrument} students={students} grades={grades} onSaveGrades={handleSaveExpressGrades} initialFocusStudentId={expressGradingStudentId} />

      <AddCompetencyModal isOpen={isAddCompetencyModalOpen} onClose={() => setIsAddCompetencyModalOpen(false)} onAddCompetencies={handleAddCompetencies} classes={classes} competencies={competencies} selectedClassId={selectedClassId} fundamentalCompetencies={fundamentalCompetencies} />
      <AddRecoveryGradeModal isOpen={isAddRecoveryGradeModalOpen} onClose={() => { setIsAddRecoveryGradeModalOpen(false); setRecoveryGradeContext(null); }} context={recoveryGradeContext} onSave={handleSaveRecoveryGrade} />

      <GlobalSearchModal isOpen={isGlobalSearchModalOpen} onClose={() => setIsGlobalSearchModalOpen(false)} students={students} instruments={instruments} classes={classes} competencies={competencies} fundamentalCompetencies={fundamentalCompetencies} onNavigate={handleNavigateTo} />
      <ClassDetailModal isOpen={!!classToView} onClose={() => setClassToView(null)} cls={classToView} students={students} teacherName={user.name} onViewStudents={(id) => handleNavigateTo('STUDENTS', { classId: id })} onEdit={(cls) => { setClassToView(null); setClassToEdit(cls); setIsEditClassModalOpen(true); }} attendance={attendance} grades={grades} instruments={instruments} />

      <ConfirmDeleteModal isOpen={studentsToMoveToBin.length > 0} onClose={() => setStudentsToMoveToBin([])} onConfirm={handleMoveStudentsToBin} title="Mover a Papelera" message={`¿Está seguro de que desea mover ${studentsToMoveToBin.length} estudiante(s) a la papelera?`} confirmButtonText="Mover" />
      <ConfirmDeleteModal isOpen={!!studentToPermanentlyDelete} onClose={() => setStudentToPermanentlyDelete(null)} onConfirm={handlePermanentlyDeleteStudent} title="Eliminar Permanentemente" message={`¿Está seguro de que desea eliminar a ${studentToPermanentlyDelete?.name} permanentemente?`} />

      <ConfirmDeleteModal isOpen={!!classToMoveToBin} onClose={() => setClassToMoveToBin(null)} onConfirm={handleMoveClassToBin} title="Mover a Papelera" message={`¿Está seguro de que desea mover la clase "${classToMoveToBin?.name}" a la papelera?`} confirmButtonText="Mover" />
      <ConfirmDeleteModal isOpen={!!classToPermanentlyDelete} onClose={() => setClassToPermanentlyDelete(null)} onConfirm={handlePermanentlyDeleteClass} title="Eliminar Permanentemente" message={`¿Está seguro de que desea eliminar permanentemente la clase "${classToPermanentlyDelete?.name}"? Esta acción no se puede deshacer.`} />

      <ConfirmDeleteModal isOpen={studentsToPermanentlyDeleteBulk.length > 0} onClose={() => setStudentsToPermanentlyDeleteBulk([])} onConfirm={handlePermanentlyDeleteStudentsBulk} title="Eliminar Permanentemente" message={`¿Está seguro de que desea eliminar permanentemente ${studentsToPermanentlyDeleteBulk.length} estudiante(s)? Esta acción no se puede deshacer.`} />
      <ConfirmDeleteModal isOpen={classesToPermanentlyDeleteBulk.length > 0} onClose={() => setClassesToPermanentlyDeleteBulk([])} onConfirm={handlePermanentlyDeleteClassesBulk} title="Eliminar Permanentemente" message={`¿Está seguro de que desea eliminar permanentemente ${classesToPermanentlyDeleteBulk.length} curso(s)? Esta acción no se puede deshacer.`} />

      <ConfirmDeleteModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesión"
        message="¿Está seguro de que desea cerrar su sesión?"
        confirmButtonText="Cerrar Sesión"
        confirmButtonIcon={<LogoutIcon className="w-4 h-4 mr-2" />}
        confirmButtonClassName="bg-red-500 text-white hover:bg-red-600"
        icon={null}
      />
    </div>
  );
}


import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

function AppWithReCaptcha() {
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!recaptchaKey) {
    console.warn("VITE_RECAPTCHA_SITE_KEY is missing. ReCaptcha will not work.");
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaKey ?? ''}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      <App />
    </GoogleReCaptchaProvider>
  );
}

export default AppWithReCaptcha;