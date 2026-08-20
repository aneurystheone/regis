import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WindowsTitleBar } from './components/WindowsTitleBar';
const QRShareModal = React.lazy(() => import('./components/QRShareModal').then(module => ({ default: module.QRShareModal })));

// Modals (Lazy Loaded)
const AddClassModal = React.lazy(() => import('./components/AddClassModal').then(module => ({ default: module.AddClassModal })));
const EditClassModal = React.lazy(() => import('./components/EditClassModal').then(module => ({ default: module.EditClassModal })));
const AddStudentModal = React.lazy(() => import('./components/AddStudentModal').then(module => ({ default: module.AddStudentModal })));
const EditStudentModal = React.lazy(() => import('./components/EditStudentModal').then(module => ({ default: module.EditStudentModal })));
const MoveStudentModal = React.lazy(() => import('./components/MoveStudentModal').then(module => ({ default: module.MoveStudentModal })));
const MoveStudentBulkModal = React.lazy(() => import('./components/MoveStudentBulkModal').then(module => ({ default: module.MoveStudentBulkModal })));
const EditStudentBulkModal = React.lazy(() => import('./components/EditStudentBulkModal').then(module => ({ default: module.EditStudentBulkModal })));
const StudentImportModal = React.lazy(() => import('./components/StudentImportModal').then(module => ({ default: module.StudentImportModal })));
const AddAnecdoteModal = React.lazy(() => import('./components/AddAnecdoteModal').then(module => ({ default: module.AddAnecdoteModal })));
const AddInstrumentModal = React.lazy(() => import('./components/AddInstrumentModal').then(module => ({ default: module.AddInstrumentModal })));
const EditInstrumentModal = React.lazy(() => import('./components/EditInstrumentModal').then(module => ({ default: module.EditInstrumentModal })));
const InstrumentDetailModal = React.lazy(() => import('./components/InstrumentDetailModal').then(module => ({ default: module.InstrumentDetailModal })));
const ExpressGradingModal = React.lazy(() => import('./components/ExpressGradingModal').then(module => ({ default: module.ExpressGradingModal })));
const AddCompetencyModal = React.lazy(() => import('./components/AddCompetencyModal').then(module => ({ default: module.AddCompetencyModal })));
const CopyCompetencyModal = React.lazy(() => import('./components/CopyCompetencyModal').then(module => ({ default: module.CopyCompetencyModal })));
// AddRecoveryGradeModal moved to GradebookManager
const GlobalSearchModal = React.lazy(() => import('./components/GlobalSearchModal').then(module => ({ default: module.GlobalSearchModal })));
const ClassDetailModal = React.lazy(() => import('./components/ClassDetailModal').then(module => ({ default: module.ClassDetailModal })));
const JournalModal = React.lazy(() => import('./components/JournalModal').then(module => ({ default: module.JournalModal })));
const ConfirmDeleteModal = React.lazy(() => import('./components/ConfirmDeleteModal').then(module => ({ default: module.ConfirmDeleteModal })));
import { LogoutIcon, TrashIcon } from './components/icons';
import { MessageSquarePlus } from 'lucide-react';
import { ToastContainer, ToastMessage } from './components/Toast';
import { v4 as uuidv4 } from 'uuid';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileHeader } from './components/MobileHeader';

const VicenteSyncAlert = React.lazy(() => import('./components/VicenteSyncAlert').then(module => ({ default: module.VicenteSyncAlert })));
const UpdatePrompt = React.lazy(() => import('./components/UpdatePrompt').then(module => ({ default: module.UpdatePrompt })));
const OnboardingWizard = React.lazy(() => import('./components/onboarding/OnboardingWizard').then(module => ({ default: module.OnboardingWizard })));
const SetupWizard = React.lazy(() => import('./components/onboarding/SetupWizard').then(module => ({ default: module.SetupWizard })));

import { api } from './services/api';
import { enableEmergencyBackup, disableEmergencyBackup } from './services/dataBackup';
import { authService } from './services/authService';
import { MONETIZATION_ENABLED } from './config/phases';
import { useRemoteConfig } from './hooks/useRemoteConfig';
import type {
  User, View, Class, Student, AttendanceRecord, AnecdotalRecord,
  EvaluationInstrument, Grade, RecoveryGrade, FundamentalCompetency, Competency,
  TeacherProfileData, JournalEntry, Resource, CustomEvent, FontSize, DailyNote,
  LessonPlan, EvaluationPeriod, CompetencyGroup, AIFeatures, SchoolGroup,
  OnboardingMissions
} from './types';

import { SubscriptionProvider } from './contexts/SubscriptionContext';

import { useUsageSession } from './services/usageService';
const FeedbackModal = React.lazy(() => import('./components/feedback/FeedbackModal').then(module => ({ default: module.FeedbackModal })));
import { useUnsavedChangesWarning } from './hooks/useGradeSyncStatus';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';

// Lazy Load Main Views
import { ErrorBoundary } from './components/ErrorBoundary';

const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const CourseDashboard = React.lazy(() => import('./components/CourseDashboard').then(module => ({ default: module.CourseDashboard })));
const StudentManager = React.lazy(() => import('./components/StudentManager').then(module => ({ default: module.StudentManager })));
const AttendanceManager = React.lazy(() => import('./components/AttendanceManager').then(module => ({ default: module.AttendanceManager })));
const GradebookManager = React.lazy(() => import('./components/GradebookManager').then(module => ({ default: module.GradebookManager })));
const Reports = React.lazy(() => import('./components/Reports').then(module => ({ default: module.Reports })));
const StudentProfile = React.lazy(() => import('./components/StudentProfile').then(module => ({ default: module.StudentProfile })));
const SettingsManager = React.lazy(() => import('./components/SettingsManager').then(module => ({ default: module.SettingsManager })));
const TeacherProfile = React.lazy(() => import('./components/TeacherProfile').then(module => ({ default: module.TeacherProfile })));
const CalendarView = React.lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));
const RecycleBin = React.lazy(() => import('./components/RecycleBin').then(module => ({ default: module.RecycleBin })));
const LessonPlanner = React.lazy(() => import('./components/LessonPlanner').then(module => ({ default: module.LessonPlanner })));
const VicenteChat = React.lazy(() => import('./components/VicenteChat').then(module => ({ default: module.VicenteChat })));
const ClassManager = React.lazy(() => import('./components/ClassManager').then(module => ({ default: module.ClassManager })));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const SubscriptionManager = React.lazy(() => import('./components/SubscriptionManager').then(module => ({ default: module.SubscriptionManager })));


const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
);



interface AuthenticatedAppProps {
  user: User;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ user }) => {
  // Remote config — reads monetizationEnabled from Firestore (app_config/global_config).
  // Falls back to MONETIZATION_ENABLED local flag while loading or offline.
  const { monetizationEnabled } = useRemoteConfig();

  const [isConnectionChecked, setIsConnectionChecked] = useState(false);
  const [classesLoaded, setClassesLoaded] = useState(false);

  // App State
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Map hardware back button for Android Native / Capacitor
  useAndroidBackButton(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return true;
    }
    
    // If at root, exit app
    if (currentView === 'DASHBOARD') {
      return false; 
    }

    // Contextual Back Navigation for hardware gestures
    if (currentView === 'COURSE_DASHBOARD') {
      setCurrentView('CLASSES');
      return true;
    }
    
    if (['STUDENTS', 'ATTENDANCE', 'GRADEBOOK_GRADES', 'GRADEBOOK_INSTRUMENTS', 'GRADEBOOK_COMPETENCIES', 'REPORTS'].includes(currentView)) {
      setCurrentView('COURSE_DASHBOARD');
      return true;
    }

    if (currentView === 'ADMIN_DASHBOARD') {
      setCurrentView('DASHBOARD');
      return true;
    }

    if (currentView.startsWith('SETTINGS_')) {
      setCurrentView('SETTINGS');
      return true;
    }

    // Default fallback
    setCurrentView('DASHBOARD');
    return true;
  });

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
    const defaultFeatures: AIFeatures = {
      summaryGeneration: true,
      criteriaGeneration: true,
      lessonPlanning: true,
      studentExtraction: true,
      audioAnalysis: true,
      vicenteAssistant: true,
    };
    try {
      const saved = window.localStorage.getItem('teacherkit-aiFeatures');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Default features take priority — ensures new flags are always enabled
        // even if old localStorage snapshots didn't include them
        return { ...parsed, ...defaultFeatures };
      }
      return defaultFeatures;
    } catch (e) {
      return defaultFeatures;
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
  const [userGroups, setUserGroups] = useState<SchoolGroup[]>([]); // Private User Groups

  // Modal States
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<Class | null>(null);
  const [isClassDetailModalOpen, setIsClassDetailModalOpen] = useState(false);
  const [classToView, setClassToView] = useState<Class | null>(null);

  // Navigation Params
  const [viewParams, setViewParams] = useState<any>(null);
  const pendingStudentIdRestore = useRef<string | null>(null);



  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [classIdForNewStudent, setClassIdForNewStudent] = useState<string | null>(null);

  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);
  const [journalClassIdPreselect, setJournalClassIdPreselect] = useState<string | null>(null);

  const [isMoveStudentModalOpen, setIsMoveStudentModalOpen] = useState(false);
  const [studentToMove, setStudentToMove] = useState<Student | null>(null);

  const [isMoveStudentBulkModalOpen, setIsMoveStudentBulkModalOpen] = useState(false);
  const [studentsToMoveBulk, setStudentsToMoveBulk] = useState<Student[]>([]);

  const [isEditStudentBulkModalOpen, setIsEditStudentBulkModalOpen] = useState(false);
  const [studentsToEditBulk, setStudentsToEditBulk] = useState<Student[]>([]);

  const [isStudentImportModalOpen, setIsStudentImportModalOpen] = useState(false);

  const [isAddAnecdoteModalOpen, setIsAddAnecdoteModalOpen] = useState(false);

  const [isAddInstrumentModalOpen, setIsAddInstrumentModalOpen] = useState(false);
  const [instrumentPrefill, setInstrumentPrefill] = useState<{ period?: EvaluationPeriod, competencyIds?: string[] }>({});

  const handleOpenAddInstrument = (prefill?: { period?: EvaluationPeriod, competencyIds?: string[] }) => {
    setInstrumentPrefill(prefill || {});
    setIsAddInstrumentModalOpen(true);
  };
  const [isEditInstrumentModalOpen, setIsEditInstrumentModalOpen] = useState(false);
  const [instrumentToEdit, setInstrumentToEdit] = useState<EvaluationInstrument | null>(null);
  const [isInstrumentDetailModalOpen, setIsInstrumentDetailModalOpen] = useState(false);
  const [instrumentToView, setInstrumentToView] = useState<EvaluationInstrument | null>(null);

  const [isExpressGradingModalOpen, setIsExpressGradingModalOpen] = useState(false);
  const [gradingInstrument, setGradingInstrument] = useState<EvaluationInstrument | null>(null);
  const [expressGradingStudentId, setExpressGradingStudentId] = useState<string | null>(null);

  const [isAddCompetencyModalOpen, setIsAddCompetencyModalOpen] = useState(false);
  const [isCopyCompetencyModalOpen, setIsCopyCompetencyModalOpen] = useState(false);
  const [competencyToCopy, setCompetencyToCopy] = useState<Competency | null>(null);

  const [isGlobalSearchModalOpen, setIsGlobalSearchModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // Check for onboarding (using localStorage as primary fast-path)
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('regis_onboarding_completed') === 'true';
    if (!onboardingCompleted) {
      // Small delay to allow initial render
      const timer = setTimeout(() => setIsSetupWizardOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Secondary check: once Firestore data loads, use profile as source of truth.
  // This handles the case where localStorage was cleared (e.g. new device, APK reinstall)
  // but the user has already completed setup.
  useEffect(() => {
    if (!teacherProfile) return;
    // If schoolName & regional exist in Firestore, the user completed at least the profile step
    // of the setup wizard (they must have pressed "Siguiente" which calls onUpdateProfile).
    const profileIsComplete = !!(teacherProfile.schoolName && teacherProfile.regional);
    if (profileIsComplete) {
      localStorage.setItem('regis_onboarding_completed', 'true');
      localStorage.removeItem('regis_setup_pending');
      setIsSetupWizardOpen(false);
    }
  }, [teacherProfile]);


  const handleCloseQuickGuide = () => {
    setIsQuickGuideOpen(false);
    // If they close it without completing, we mark setup as pending
    if (localStorage.getItem('regis_onboarding_completed') !== 'true') {
      localStorage.setItem('regis_setup_pending', 'true');
      setIsSetupWizardOpen(true);
    }
  };

  const handleCompleteOnboarding = () => {
    setIsQuickGuideOpen(false);
    localStorage.setItem('regis_onboarding_completed', 'true');
    localStorage.removeItem('regis_setup_pending');
    // Refresh connection check or trigger sync if needed
    api.checkConnection();
  };

  const handleOpenQuickGuide = () => {
    setIsQuickGuideOpen(true);
  };


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
  const { logSession } = useUsageSession();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Warn on unsaved changes
  useUnsavedChangesWarning();

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };


  // --- Data Subscription Logic ---

  // Handle Offline Class for ReCaptcha Suppression
  useEffect(() => {

    // Check for pending setup
    const isPending = localStorage.getItem('regis_setup_pending') === 'true';
    if (isPending) setIsSetupWizardOpen(true);
  }, [connectionStatus]);

  // Persistence of active view
  useEffect(() => {
    if (!user) return;
    
    const utilityViews = [
      'SETTINGS', 'SETTINGS_APPEARANCE', 'SETTINGS_AI', 'SETTINGS_RECYCLE_BIN', 'SETTINGS_SUBSCRIPTION',
      'TEACHER_PROFILE', 'CALENDAR'
    ];
    const isUtility = utilityViews.includes(currentView);

    if (currentView !== ('BACK' as any)) {
      const stateObj = {
        view: currentView,
        classId: selectedClassId,
        studentId: selectedStudent?.id || null,
        params: viewParams
      };
      localStorage.setItem(`regis_last_view_${user.id}`, JSON.stringify(stateObj));

      if (!isUtility) {
        localStorage.setItem(`regis_last_main_view_${user.id}`, JSON.stringify(stateObj));
      }
    }
  }, [currentView, selectedClassId, selectedStudent, viewParams, user]);

  // Resolve pending student restoration once students load
  useEffect(() => {
    if (students.length > 0 && pendingStudentIdRestore.current) {
      const student = students.find(s => s.id === pendingStudentIdRestore.current);
      if (student) {
        setSelectedStudent(student);
      }
      pendingStudentIdRestore.current = null;
    }
  }, [students]);



  // Initial connection check
  useEffect(() => {
    api.checkConnection().then(() => setIsConnectionChecked(true));
  }, []);

  // Sync Events Listener
  useEffect(() => {
    let lastStatus = api.syncEvents.status;
    const unsubscribe = api.syncEvents.subscribe((status) => {
      if (status === 'error' && lastStatus !== 'error') {
        addToast('Error de sincronización con la nube. Los datos se guardarán localmente.', 'warning');
      }
      lastStatus = status;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // One-time initialization for static/preference data
    const initializeData = async () => {
      const sidebarState = await api.getIsSidebarCollapsed();
      const initialFundamental = await api.getFundamentalCompetencies(user.id);
      const initialAIFeatures = await api.getAIFeatures(user.id);
      setIsSidebarCollapsed(sidebarState);
      setFundamentalCompetencies(initialFundamental);
      setAiFeatures(initialAIFeatures);

      // Perform sync integrity check on startup
      api.checkSyncStatus();

      // Seed demo data if needed
      if (authService.isDemoMode()) {
        const currentClasses = await api.getClasses();
        if (currentClasses.length === 0) await api.seedDemoData();
      }

      // Restore last navigation state if exists
      const savedStateStr = localStorage.getItem(`regis_last_view_${user.id}`);
      if (savedStateStr) {
        try {
          const savedState = JSON.parse(savedStateStr);
          if (savedState.view) {
            if (savedState.classId) {
              setSelectedClassId(savedState.classId);
            }
            if (savedState.studentId) {
              pendingStudentIdRestore.current = savedState.studentId;
            }
            if (savedState.params) {
              setViewParams(savedState.params);
            }
            setCurrentView(savedState.view);
          }
        } catch (e) {
          console.error("Error restoring navigation state", e);
        }
      }
    };
    initializeData();

    // Setup Real-time Subscriptions
    const savedClassId = localStorage.getItem('teacherkit-lastSelectedClassId');

    const unsubscribers = [
      api.onClassesChange(fetchedClasses => {
        setClasses(fetchedClasses);
        setClassesLoaded(true);
        if (savedClassId && fetchedClasses.some(c => c.id === savedClassId)) {
          setSelectedClassId(savedClassId);
        } else if (fetchedClasses.length > 0 && !selectedClassId) {
          setSelectedClassId(fetchedClasses[0].id);
        }
      }, user.id),
      api.onStudentsChange(setStudents, user.id),
      api.onDeletedStudentsChange(setDeletedStudents, user.id),
      api.onDeletedClassesChange(setDeletedClasses, user.id),
      api.onAnecdotesChange(setAnecdotes, user.id),
      api.onInstrumentsChange(setInstruments, user.id),
      // Legacy global grades support (only if NOT using subcollections)
      // Legacy global grades support removed
      api.onRecoveryGradesChange(setRecoveryGrades, user.id),
      api.onCompetenciesChange(setCompetencies, user.id),
      api.onJournalChange(setJournalEntries, user.id),
      api.onResourcesChange(setResources, user.id),
      api.onEventsChange(setCustomEvents, user.id),
      api.onTeacherProfileChange(setTeacherProfile, user.id),
      api.onAIFeaturesChange(setAiFeatures, user.id),
      api.onUserGroupsChange(setUserGroups, user.id) // Subscribe to private user groups
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

    // 🛡️ EMERGENCY BACKUP: Auto-snapshot every 5 minutes
    console.log('🛡️ Emergency backup system enabled for user:', user.id.substring(0, 8));
    enableEmergencyBackup(user.id);

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });

      // Disable backup on logout
      disableEmergencyBackup();
    };
  }, [user]);

  // --- Lazy Load Grades (Phase 3 Optimization) ---
  useEffect(() => {
    if (!user) return;

    // Only subscribe to grades for the SELECTED class (plus generic ones if any)
    // This allows us to scale to infinite classes without memory/battery drain
    if (!selectedClassId) {
      setGrades([]); // Optional: clear grades or keep last cache
      return;
    }

    const start = Date.now();
    console.log(`🔋 Lazy subscribing to grades for class: ${selectedClassId}`);

    const classInstruments = instruments.filter(i => i.classId === selectedClassId);
    let unsubMap = new Map<string, () => void>();

    // Initial load for this class
    classInstruments.forEach(inst => {
      // Subscribe to each instrument in the active class
      unsubMap.set(inst.id, api.onInstrumentGradesChange(inst.id, user.id, (newGrades) => {
        setGrades(prev => {
          // Replace grades for this instrument, keep others
          const other = prev.filter(g => g.instrumentId !== inst.id);
          return [...other, ...newGrades];
        });
      }));
    });

    return () => {
      console.log(`🔌 Unsubscribing grades for class ${selectedClassId} (${Date.now() - start}ms active)`);
      unsubMap.forEach(unsub => unsub());
      unsubMap.clear();
    };
  }, [user, selectedClassId, instruments]);

  // --- Lazy Load Heavy Collections (Phase 3 Optimization) ---
  useEffect(() => {
    if (!user) return;

    if (!selectedClassId) {
      setAttendance([]);
      setDailyNotes([]);
      setLessonPlans([]);
      return;
    }

    const start = Date.now();
    console.log(`🔋 Lazy subscribing to heavy collections for class: ${selectedClassId}`);

    const heavyUnsubscribers = [
      api.onAttendanceChange(setAttendance, user.id, selectedClassId),
      api.onDailyNotesChange(setDailyNotes, user.id, selectedClassId),
      api.onLessonPlansChange(setLessonPlans, user.id, selectedClassId)
    ];

    return () => {
      console.log(`🔌 Unsubscribing heavy collections for class ${selectedClassId} (${Date.now() - start}ms active)`);
      heavyUnsubscribers.forEach(unsub => unsub());
    };
  }, [user, selectedClassId]);

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
      const needsSync = (user.name && teacherProfile.name !== user.name) || (user.email && teacherProfile.email !== user.email);
      const isFallback = (teacherProfile as any)._isFallback;

      if (isDefault || needsSync || isFallback) {
        const updatedProfile = {
          ...teacherProfile,
          name: user.name || teacherProfile.name,
          email: user.email || teacherProfile.email,
          profilePictureUrl: teacherProfile.profilePictureUrl || ''
        };
        // Remove internal flag before saving
        const { _isFallback, ...profileToSave } = updatedProfile as any;

        await api.setTeacherProfile(profileToSave);
        setTeacherProfile(profileToSave);
      }
    };
    updateProfile();
  }, [user, teacherProfile]);


  // --- Helpers ---
  const completeMission = async (missionId: keyof OnboardingMissions) => {
    if (!teacherProfile) return;
    const currentMissions = teacherProfile.onboardingMissions || {
      profileSetup: !!teacherProfile.schoolName,
      classesCreated: classes.length > 0,
      studentsImported: students.length > 0,
      firstAttendance: attendance.length > 0,
      firstInstrument: instruments.length > 0,
      firstReport: false,
    };

    if (currentMissions[missionId]) return;

    const updatedMissions = { ...currentMissions, [missionId]: true };
    const updatedProfile = { ...teacherProfile, onboardingMissions: updatedMissions };
    setTeacherProfile(updatedProfile);
    await api.setTeacherProfile(updatedProfile);
    console.log(`[ONBOARDING] Misson ${String(missionId)} completed!`);
  };

  // --- Handlers ---

  const handleSetSelectedClassId = async (classId: string) => {
    setSelectedClassId(classId);
    await api.setLastSelectedClassId(classId);
  };

  const handleNavigateTo = (viewName: View | 'VIEW_INSTRUMENT_DETAIL' | 'BACK', context?: any) => {
    setInitialFundamentalFilter(null);
    setViewParams(context);

    if (viewName === 'BACK') {
      const lastMainStr = user ? localStorage.getItem(`regis_last_main_view_${user.id}`) : null;
      if (lastMainStr) {
        try {
          const lastMainObj = JSON.parse(lastMainStr);
          if (lastMainObj.view) {
            if (lastMainObj.classId) {
              handleSetSelectedClassId(lastMainObj.classId);
            }
            if (lastMainObj.studentId) {
              const student = students.find(s => s.id === lastMainObj.studentId);
              setSelectedStudent(student || null);
            }
            setViewParams(lastMainObj.params || null);
            setCurrentView(lastMainObj.view);
            return;
          }
        } catch (e) {
          console.error("Error parsing last main view", e);
        }
      }
      setCurrentView('DASHBOARD');
      return;
    }

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
  const handleAddClassClick = async () => {
    // Uses remote-controlled flag — activatable from Firestore without deploy
    if (!monetizationEnabled) {
      setIsAddClassModalOpen(true);
      return;
    }

    // Check class limit before opening modal
    const limitCheck = await api.checkClassLimit();

    if (!limitCheck.canCreate) {
      addToast(
        `Has alcanzado el límite de ${limitCheck.limit} clases del plan gratuito. Mejora a Premium para clases ilimitadas.`,
        'error'
      );
      return;
    }

    setIsAddClassModalOpen(true);
  };

  const handleAddClass = async (name: string, grade: string, section: string, schoolYear: string, level: string, groupId?: string, upgradeClassId?: string) => {
    const classColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#78716c'];
    const color = classColors[classes.length % classColors.length];

    let finalGroupId = groupId;

    // Handle Upgrade: If upgrading an existing class to a group
    if (upgradeClassId && !finalGroupId) {
      try {
        const newGroup = await api.convertClassToGroup(upgradeClassId);
        if (newGroup) {
          finalGroupId = newGroup.id;
          addToast('Clase vinculada convertida a grupo exitosamente.', 'success');
        }
      } catch (e) {
        console.error("Error creating group from class:", e);
        addToast('Error al vincular con la clase existente.', 'error');
      }
    }

    const updatedClasses = await api.addClass({ name, grade, section, schoolYear, level, groupId: finalGroupId, schedule: 'Horario por definir', color });
    setClasses(updatedClasses);
    if (!selectedClassId) {
      handleSetSelectedClassId(updatedClasses[updatedClasses.length - 1].id);
    }

    addToast(finalGroupId ? 'Clase creada y vinculada al grupo.' : 'Clase creada exitosamente.', 'success');
    completeMission('classesCreated');

    // Track class creation
    logSession('classes');
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
  };

  const handleBulkMoveClassToBin = async (classesToMove: Class[]) => {
    let currentClasses = classes;
    let currentDeleted = deletedClasses;
    // Sequential execution to avoid race conditions with checking/updating server state if API relies on it, 
    // or just to be safe with state updates. Ideally API should support bulk.
    // For now we assume API returns full list.
    for (const cls of classesToMove) {
      const result = await api.moveClassToBin(cls.id);
      currentClasses = result.classes;
      currentDeleted = result.deletedClasses;
    }
    setClasses(currentClasses);
    setDeletedClasses(currentDeleted);
    addToast(`${classesToMove.length} clases movidas a la papelera.`, 'info');
  };

  // Student Handlers
  const handleAddStudent = async (studentData: Omit<Student, 'id' | 'classId'>) => {
    if (!classIdForNewStudent) return;

    // Check if class belongs to a group
    const targetClass = classes.find(c => c.id === classIdForNewStudent);
    const groupId = targetClass?.groupId;

    const updatedStudents = await api.addStudent({
      ...studentData,
      classId: classIdForNewStudent,
      groupId, // Auto-assign group
    });
    setStudents(updatedStudents);
    setIsAddStudentModalOpen(false);
    setClassIdForNewStudent(null);
    completeMission('studentsImported');
    api.isValidNetwork() ? addToast('Estudiante añadido exitosamente.', 'success') : addToast('Guardado en el dispositivo', 'warning');
  };

  const handleImportStudents = async (newStudentsData: Omit<Student, 'id' | 'classId' | 'avatar'>[], classId: string) => {
    // Check if class belongs to a group
    const targetClass = classes.find(c => c.id === classId);
    const groupId = targetClass?.groupId;

    const studentsToCreate = newStudentsData.map(s => ({
      ...s,
      classId: classId,
      groupId, // Auto-assign to group
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
      gender: s.gender || (Math.random() > 0.5 ? 'M' : 'F'),
    }));

    const updatedStudents = await api.addStudents(studentsToCreate);
    setStudents(updatedStudents);
    setIsStudentImportModalOpen(false);
    handleSetSelectedClassId(classId);
    setCurrentView('STUDENTS');
    completeMission('studentsImported');
    addToast(`${newStudentsData.length} estudiantes importados.`, 'success');
  };

  const handleMoveStudent = async (studentId: string, newClassId: string) => {
    await api.updateStudent(studentId, { classId: newClassId });
    const updatedStudents = await api.getStudents();
    setStudents(updatedStudents);
    setStudentToMove(null);
    setIsMoveStudentModalOpen(false);
    addToast('Estudiante movido de clase.', 'success');
  };

  const handleMoveStudentsBulk = async (studentIds: string[], newClassId: string) => {
    for (const studentId of studentIds) {
      await api.updateStudent(studentId, { classId: newClassId });
    }
    const updatedStudents = await api.getStudents();
    setStudents(updatedStudents);
    setStudentsToMoveBulk([]);
    setIsMoveStudentBulkModalOpen(false);
    addToast(`${studentIds.length} estudiantes movidos.`, 'success');
  };

  const handleUpdateStudentsOrder = async (classId: string, orderedStudentIds: string[]) => {
    const updatedStudents = await api.updateStudentsOrder(classId, orderedStudentIds);
    setStudents(updatedStudents);
  };

  const handleEditStudent = async (studentId: string, updatedData: Partial<Student>) => {
    await api.updateStudent(studentId, updatedData);
    const updatedStudents = await api.getStudents();
    setStudents(updatedStudents);

    // Update selected student if in profile view
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(prev => prev ? { ...prev, ...updatedData } : null);
    }

    setStudentToEdit(null);
    setIsEditStudentModalOpen(false);
    api.isValidNetwork() ? addToast('Estudiante actualizado.', 'success') : addToast('Guardado en el dispositivo', 'warning');
  };

  const handleEditStudentsBulk = async (studentIds: string[], newClassId: string) => {
    for (const studentId of studentIds) {
      await api.updateStudent(studentId, { classId: newClassId });
    }
    const updatedStudents = await api.getStudents();
    setStudents(updatedStudents);
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
    console.log("Vicente Debug: App handleAddAnecdote called", newAnecdote);
    const { studentIds, ...anecdoteData } = newAnecdote;
    const newRecords = studentIds.map(studentId => ({
      ...anecdoteData,
      id: `A${Date.now()}${Math.random()}`,
      studentId,
    }));
    console.log("Vicente Debug: newRecords created", newRecords);
    const updatedAnecdotes = await api.addAnecdotes(newRecords);
    console.log("Vicente Debug: api.addAnecdotes returned", updatedAnecdotes.length, "total anecdotes");
    setAnecdotes(updatedAnecdotes);
    setIsAddAnecdoteModalOpen(false);

    const isOfflineData = newRecords.some(r =>
      (r.photoUrl && r.photoUrl.startsWith('offline:')) ||
      (r.audioUrl && r.audioUrl.startsWith('offline:'))
    );

    if (isOfflineData) {
      addToast('Incidencia guardada en el dispositivo.', 'info');
    } else {
      addToast(`${newRecords.length > 1 ? 'Incidencias registradas' : 'Incidencia registrada'}.`, 'success');
    }
    // Track anecdote creation
    logSession('anecdotes');
  };

  // Attendance Handlers
  const handleSetAttendance = (value: React.SetStateAction<AttendanceRecord[]>) => {
    setAttendance(current => {
      const newAttendance = value instanceof Function ? value(current) : value;
      // Defensive check: process only if it's an array to avoid state corruption
      if (!Array.isArray(newAttendance)) {
        console.error("Vicente Debug: [App] Attempted to set non-array attendance", newAttendance);
        return current;
      }

      // Check for deleted records (e.g. from the 'Limpiar' action)
      if (newAttendance.length < current.length) {
        const newIds = new Set(newAttendance.map(a => a.id));
        const deletedRecords = current.filter(a => !newIds.has(a.id) && !!a.id);
        if (deletedRecords.length > 0) {
          api.deleteAttendanceRecords(deletedRecords.map(r => r.id!));
        }
      }

      // Diffing for changes/additions
      const currentMap = new Map(current.map(a => [a.id, a]));
      const changedRecords = newAttendance.filter(newRec => {
        if (!newRec.id) return false;
        const oldRec = currentMap.get(newRec.id);
        if (!oldRec) return true; // New record
        return oldRec.status !== newRec.status || oldRec.date !== newRec.date || oldRec.classId !== newRec.classId;
      });

      api.updateAttendancePartial(newAttendance, changedRecords);

      if (newAttendance.length > current.length) {
        completeMission('firstAttendance');
      }
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

  const handleEditCompetency = async (competency: Competency) => {
    // Placeholder for visual feedback, real editing might require a modal
    addToast('Para editar, contacte al soporte o re-cree la competencia.', 'info');
  };

  const handleDeleteCompetency = async (competency: Competency) => {
    // Check if any grades are associated
    const hasGrades = instruments.some(inst => inst.competencyIds.includes(competency.id));
    // Ideally we check actual grade values, but checking instruments association is a good first safety step.
    // If we want to be strict: "This competency is used in X instruments."

    const confirmMessage = hasGrades
      ? `⚠️ Esta competencia está vinculada a instrumentos de evaluación. Si la elimina, quedará desvinculada.\n\n¿Seguro que desea eliminar "${competency.name}"?`
      : `¿Estás seguro de eliminar la competencia "${competency.name}"?`;

    if (window.confirm(confirmMessage)) {
      const updated = await api.deleteCompetency(competency.id);
      setCompetencies(updated);
      addToast('Competencia eliminada.', 'info');
    }
  };

  const handleCopyCompetency = async (competency: Competency, targetClassIds: string[]) => {
    await api.copyCompetency(competency, targetClassIds);
    // We don't need to update local state immediately if we are looking at the source class, 
    // but if we switch to target class it should be there. 
    // However, api.addCompetencies returns the updated list for the *current context* if we are lucky, 
    // but actually it returns all competencies in LocalStorage.
    // Let's refresh competencies from API/Local to be sure.
    const latest = await api.getCompetencies();
    setCompetencies(latest);
    addToast(`Competencia copiada a ${targetClassIds.length} clase(s).`, 'success');
  };

  // Instrument Handlers
  const handleAddInstrument = async (instrument: Omit<EvaluationInstrument, 'id'>, classIds?: string[]) => {
    let updatedInstruments;
    if (classIds && classIds.length > 1) {
      updatedInstruments = await api.addLinkedInstruments(instrument, classIds);
      addToast(`Instrumento añadido a ${classIds.length} clases con sincronización.`, 'success');
    } else {
      updatedInstruments = await api.addInstrument(instrument);
      addToast('Instrumento de evaluación añadido.', 'success');
    }
    setInstruments(updatedInstruments);
    // Track instrument creation
    completeMission('firstInstrument');
    logSession('instruments');
  };

  const handleEditInstrument = async (instrumentId: string, updatedInstrumentData: Omit<EvaluationInstrument, 'id'>, syncAll: boolean = false) => {
    const updatedInstruments = await api.updateInstrument(instrumentId, updatedInstrumentData, syncAll);
    setInstruments(updatedInstruments);
    setInstrumentToEdit(null);
    setIsEditInstrumentModalOpen(false);
    addToast(syncAll ? 'Instrumentos vinculados actualizados.' : 'Instrumento de evaluación actualizado.', 'success');
  };

  const handleReplicateInstrument = async (instrumentId: string, targetClassIds: string[]) => {
    const updatedInstruments = await api.replicateInstrument(instrumentId, targetClassIds);
    setInstruments(updatedInstruments);
    addToast(`Instrumento replicado a ${targetClassIds.length} clases.`, 'success');
  };

  const handleDeleteInstrument = async (instrumentId: string) => {
    const updatedInstruments = await api.deleteInstrument(instrumentId);
    setInstruments(updatedInstruments);
    // Also clear grades for deleted instrument
    setGrades(prev => prev.filter(g => g.instrumentId !== instrumentId));
    addToast('Instrumento de evaluación eliminado.', 'success');
    logSession('instruments');
  };

  const handleGradeUpdated = (grade: Grade) => {
    setGrades(prev => {
      const existingGradeIndex = prev.findIndex(g => g.studentId === grade.studentId && g.instrumentId === grade.instrumentId);
      if (existingGradeIndex > -1) {
        const newGrades = [...prev];
        newGrades[existingGradeIndex] = { ...newGrades[existingGradeIndex], ...grade };
        return newGrades;
      } else {
        return [...prev, grade];
      }
    });
  };

  // Recovery Grade
  const handleSaveRecoveryGrade = async (gradeData: Omit<RecoveryGrade, 'id'>) => {
    const updatedRecoveryGrades = await api.saveRecoveryGrade(gradeData);
    setRecoveryGrades(updatedRecoveryGrades);
    addToast('Calificación de recuperación guardada.', 'success');
  };

  // Teacher Profile
  const handleUpdateTeacherProfile = async (updatedProfile: TeacherProfileData) => {
    await api.setTeacherProfile(updatedProfile);
    setTeacherProfile(updatedProfile);
    addToast('Perfil actualizado.', 'success');
  };

  const handleOpenJournalModal = useCallback((entry?: JournalEntry | null, classId?: string | null) => {
    setEditingJournalEntry(entry || null);
    setJournalClassIdPreselect(classId || null);
    setIsJournalModalOpen(true);
  }, []);

  const handleSaveJournalEntry = async (entryData: Omit<JournalEntry, 'id'> & { id?: string }) => {
    try {
      if (entryData.id) {
        const updated = await api.updateJournalEntry(entryData.id, entryData.content, entryData.classId);
        setJournalEntries(updated);
        addToast('Reflexión actualizada.', 'success');
      } else {
        const updated = await api.addJournalEntry(entryData.content, entryData.classId);
        setJournalEntries(updated);
        addToast('Reflexión guardada.', 'success');
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      addToast('Error al guardar la reflexión.', 'error');
    }
  };

  const handleDeleteJournalEntry = async (entryId: string) => {
    try {
      const updated = await api.deleteJournalEntry(entryId);
      setJournalEntries(updated);
      addToast('Reflexión eliminada.', 'info');
    } catch (error) {
      console.error('Error deleting journal:', error);
      addToast('Error al eliminar la reflexión.', 'error');
    }
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
    // Toast removed as per user request
  };

  const handleLogout = async () => {
    setIsLogoutConfirmOpen(false);
    await authService.logout();

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

    addToast('Sesión cerrada exitosamente.', 'success');
  };

  const handleDeleteAccount = async () => {
    try {
      await authService.deleteAccount();
      addToast('Tu cuenta ha sido eliminada correctamente.', 'success');
      handleLogout();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        addToast('Por seguridad, debes cerrar sesión e iniciar de nuevo para eliminar tu cuenta.', 'error');
      } else {
        addToast('Error al eliminar la cuenta. Intenta más tarde.', 'error');
      }
    }
  };



  const activeStudentIdValue = studentToEdit?.id || studentToMove?.id;

  // --- Rendering ---

  const getHeaderTitle = () => {
    if (selectedStudent && currentView === 'STUDENT_PROFILE') return `Perfil de ${selectedStudent.name}`;
    if (currentView === 'ATTENDANCE') return 'Registro de Asistencia';
    if (currentView === 'REPORTS') return 'Generador de Reportes';
    const titles: Record<View, string> = {
      DASHBOARD: 'Panel de Control',
      COURSE_DASHBOARD: 'Dashboard del Curso',
      CLASSES: 'Gestión de Cursos',
      STUDENTS: 'Gestión de Estudiantes',
      STUDENT_PROFILE: 'Perfil del Estudiante',
      ATTENDANCE: 'Registro de Asistencia',
      REPORTS: 'Generador de Reportes',
      GRADEBOOK_GRADES: 'Libro de Calificaciones',
      GRADEBOOK_INSTRUMENTS: 'Libro de Calificaciones',
      GRADEBOOK_COMPETENCIES: 'Libro de Calificaciones',
      SETTINGS: 'Ajustes',
      SETTINGS_AI: 'Inteligencia Artificial',
      SETTINGS_APPEARANCE: 'Configuraciones',
      SETTINGS_RECYCLE_BIN: 'Papelera de Reciclaje',
      SETTINGS_SUBSCRIPTION: 'Suscripción',
      SUBSCRIPTION: 'Suscripción y Plan',
      TEACHER_PROFILE: 'Perfil Docente',
      CALENDAR: 'Calendario',
      LESSON_PLANNER: 'Planificador de Lecciones',
      VICENTE_CHAT: 'IA Vicente',
      ADMIN_DASHBOARD: 'Panel de Administración',
    };
    return titles[currentView] || 'Regis';
  };

  const renderView = () => {
    if (!teacherProfile) return null;

    if (!classesLoaded) {
      return <SuspenseFallback />;
    }

    if (classes.length === 0 && !['SETTINGS', 'SETTINGS_APPEARANCE', 'SETTINGS_AI', 'SETTINGS_RECYCLE_BIN', 'SETTINGS_SUBSCRIPTION', 'TEACHER_PROFILE', 'CLASSES', 'CALENDAR', 'ADMIN_DASHBOARD'].includes(currentView)) {
      return (
        <div className="p-8 text-center flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">¡Bienvenido!</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md">Parece que aún no ha creado ninguna clase. ¡Empiece por añadir una para poder gestionar sus estudiantes, asistencia y calificaciones!</p>
          <button
            onClick={() => setIsAddClassModalOpen(true)}
            className="mt-6 bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
          >
            Crear mi primera clase
          </button>
        </div>
      );
    }

    if (selectedClassId && !classes.some(c => c.id === selectedClassId) && classes.length > 0) {
      handleSetSelectedClassId(classes[0].id);
      return null; // Wait for re-render with valid ID
    }

    return (
      <ErrorBoundary>
        <React.Suspense fallback={<SuspenseFallback />}>
          {renderContent()}
        </React.Suspense>
      </ErrorBoundary>
    );
  };

  const renderContent = () => {
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
            onNavigate={handleNavigateTo}
            onAddAnecdoteClick={() => setIsAddAnecdoteModalOpen(true)}
            selectedClassId={selectedClassId}
            onSelectClass={handleSetSelectedClassId}
            aiFeatures={aiFeatures}
            customEvents={customEvents}
            onNavigateToCalendar={() => handleNavigateTo('CALENDAR')}
            onEventClick={(e) => handleNavigateTo('CALENDAR', { eventId: e.id })}
            onInstrumentClick={(i) => handleNavigateTo('VIEW_INSTRUMENT_DETAIL', { instrumentId: i.id })}
            onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
            onboardingMissions={teacherProfile?.onboardingMissions}
          />
        );
      case 'CLASSES':
        return <ClassManager
          classes={classes}
          students={students}
          onNavigateToClass={(classId) => { handleSetSelectedClassId(classId); handleNavigateTo('COURSE_DASHBOARD'); }}
          onAddClass={handleAddClassClick}
          onViewClassDetails={(cls) => { setClassToView(cls); setIsClassDetailModalOpen(true); }}
          onDeleteClass={(cls) => { setClassToMoveToBin(cls); }}
          onBulkDeleteClasses={(classesToDelete) => { if (classesToDelete[0]) setClassToMoveToBin(classesToDelete[0]); }}
          onNavigateToSettings={() => setCurrentView('SETTINGS_SUBSCRIPTION')}
        />;
      case 'COURSE_DASHBOARD':
        {
          const currentClass = classes.find(c => c.id === selectedClassId);
          if (!currentClass) return null;
          return <CourseDashboard 
            cls={currentClass} 
            students={students} 
            attendance={attendance} 
            dailyNotes={dailyNotes} 
            instruments={instruments} 
            grades={grades} 
            onNavigate={handleNavigateTo} 
            onAddAnecdoteClick={() => setIsAddAnecdoteModalOpen(true)}
            onOpenJournalModal={(entry) => handleOpenJournalModal(entry, selectedClassId)}
            journalEntries={journalEntries.filter(e => e.classId === selectedClassId)}
          />;
        }
      case 'STUDENTS':
        return <StudentManager students={students} classes={classes} onViewProfile={(s) => { setSelectedStudent(s); setCurrentView('STUDENT_PROFILE'); }} onUpdateStudentsOrder={handleUpdateStudentsOrder} onAddClassClick={() => setIsAddClassModalOpen(true)} onAddStudentClick={(id) => { setClassIdForNewStudent(id); setIsAddStudentModalOpen(true); }} onImportStudentsClick={() => setIsStudentImportModalOpen(true)} onMoveStudentClick={(s) => { setStudentToMove(s); setIsMoveStudentModalOpen(true); }} onEditStudentClick={(s) => { setStudentToEdit(s); setIsEditStudentModalOpen(true); }} onMoveStudentBulkClick={(s) => { setStudentsToMoveBulk(s); setIsMoveStudentBulkModalOpen(true); }} onEditStudentBulkClick={(s) => { setStudentsToEditBulk(s); setIsEditStudentBulkModalOpen(true); }} onMoveToBinClick={(s) => { setStudentsToMoveToBin([s]); }} onMoveToBinBulkClick={(s) => { setStudentsToMoveToBin(s); }} activeStudentId={activeStudentIdValue} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} addToast={addToast} onNavigate={handleNavigateTo} />;
      case 'STUDENT_PROFILE':
        if (selectedStudent) {
          return <StudentProfile student={selectedStudent} students={students} anecdotes={anecdotes} attendance={attendance} classes={classes} onBack={() => setCurrentView('STUDENTS')} onAddAnecdote={(anecdote) => handleAddAnecdote({ ...anecdote, studentIds: [anecdote.studentId] })} onViewGrades={(id) => { setStudentFilter(id); setCurrentView('GRADEBOOK_GRADES'); }} onUpdateStudent={(data) => handleEditStudent(selectedStudent.id, data)} onEditClick={() => { setStudentToEdit(selectedStudent); setIsEditStudentModalOpen(true); }} aiFeatures={aiFeatures} />;
        }
        if (pendingStudentIdRestore.current) {
          return <SuspenseFallback />;
        }
        setCurrentView('STUDENTS'); return null;
      case 'ATTENDANCE':
        return <AttendanceManager students={students} classes={classes} attendance={attendance} onSetAttendance={handleSetAttendance} dailyNotes={dailyNotes} onSetDailyNotes={handleSetDailyNotes} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} onAddStudentClick={(id) => { setClassIdForNewStudent(id); setIsAddStudentModalOpen(true); }} onImportStudentsClick={() => setIsStudentImportModalOpen(true)} onNavigate={handleNavigateTo} initialMode={viewParams?.mode} />;
      case 'GRADEBOOK_GRADES':
      case 'GRADEBOOK_INSTRUMENTS':
      case 'GRADEBOOK_COMPETENCIES': {
        let tab: 'GRADES' | 'INSTRUMENTS' | 'COMPETENCIES' = 'GRADES';
        if (currentView === 'GRADEBOOK_INSTRUMENTS') tab = 'INSTRUMENTS';
        if (currentView === 'GRADEBOOK_COMPETENCIES') tab = 'COMPETENCIES';
        return <GradebookManager students={students} classes={classes} fundamentalCompetencies={fundamentalCompetencies} competencies={competencies} instruments={instruments} grades={grades} recoveryGrades={recoveryGrades} onAddCompetencyClick={() => setIsAddCompetencyModalOpen(true)} onAddInstrumentClick={handleOpenAddInstrument} onEditInstrumentClick={(inst) => { setInstrumentToEdit(inst); setIsEditInstrumentModalOpen(true); }} onViewInstrumentDetails={(inst) => { setInstrumentToView(inst); setIsInstrumentDetailModalOpen(true); }} onDeleteInstrument={handleDeleteInstrument} onSaveRecoveryGrade={handleSaveRecoveryGrade} initialTab={tab} onExpressGradingClick={(inst, sId) => { setGradingInstrument(inst); setExpressGradingStudentId(sId || null); setIsExpressGradingModalOpen(true); }} studentFilter={studentFilter} onClearStudentFilter={() => setStudentFilter(null)} initialFundamentalFilter={initialFundamentalFilter} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} onAddStudentClick={(id) => { setClassIdForNewStudent(id); setIsAddStudentModalOpen(true); }} onCopyCompetency={(comp) => { setCompetencyToCopy(comp); setIsCopyCompetencyModalOpen(true); }} onEditCompetency={handleEditCompetency} onDeleteCompetency={handleDeleteCompetency} onImportStudentsClick={() => setIsStudentImportModalOpen(true)}          onReplicateInstrument={handleReplicateInstrument}
          onNavigate={handleNavigateTo}
        />;
      }
      case 'REPORTS':
        return <Reports students={students} classes={classes} attendance={attendance} anecdotes={anecdotes} instruments={instruments} grades={grades} recoveryGrades={recoveryGrades} teacherName={user.name} fundamentalCompetencies={fundamentalCompetencies} competencies={competencies} selectedClassId={selectedClassId} onSelectClass={handleSetSelectedClassId} aiFeatures={aiFeatures} addToast={addToast} onAddStudentClick={(id) => { setClassIdForNewStudent(id); setIsAddStudentModalOpen(true); }} onImportStudentsClick={() => setIsStudentImportModalOpen(true)} onReportGenerated={() => completeMission('firstReport')} />;
      case 'TEACHER_PROFILE':
        return <TeacherProfile profile={teacherProfile} classes={classes} students={students} journalEntries={journalEntries} resources={resources} onOpenJournalModal={handleOpenJournalModal} onDeleteJournalEntry={handleDeleteJournalEntry} onAddResource={handleAddResource} onClassClick={(cls) => setClassToView(cls)} onLogout={() => setIsLogoutConfirmOpen(true)} onUpdateProfile={handleUpdateTeacherProfile} initialTab={viewParams?.initialTab} autoFocusJournal={viewParams?.autoFocusJournal} />;
      case 'CALENDAR':
        return <CalendarView classes={classes} instruments={instruments} customEvents={customEvents} onAddEvent={handleAddCustomEvent} onUpdateEvent={handleUpdateCustomEvent} onDeleteEvent={handleDeleteCustomEvent} onInstrumentClick={(id) => handleNavigateTo('VIEW_INSTRUMENT_DETAIL', { instrumentId: id })} />;
      case 'LESSON_PLANNER':
        return <LessonPlanner classes={classes} lessonPlans={lessonPlans} onAddLessonPlan={handleAddLessonPlan} onUpdateLessonPlan={handleUpdateLessonPlan} onDeleteLessonPlan={handleDeleteLessonPlan} aiFeatures={aiFeatures} onNavigate={handleNavigateTo} />;
      case 'VICENTE_CHAT':
        return <VicenteChat classes={classes} students={students} teacherName={user.name} onNavigate={handleNavigateTo} />;
      case 'SUBSCRIPTION':
      case 'SETTINGS_SUBSCRIPTION':
        return <SubscriptionManager />;
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
          onPermanentDeleteBulk={(students) => setStudentsToPermanentlyDeleteBulk(students)}
          onPermanentDeleteClassesBulk={(classes) => setClassesToPermanentlyDeleteBulk(classes)}
          onDeleteAccount={handleDeleteAccount}
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
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard aiFeatures={aiFeatures} setAiFeatures={setAiFeatures} userId={user?.id || ''} />;
      default:
        return null;
    }
  };

  return (
    <SubscriptionProvider userId={user?.id || ''} aiFeatures={aiFeatures}>
      <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 font-sans overflow-hidden">
        <WindowsTitleBar
          ctaText="Actualizar a Premium"
          onCtaClick={() => setCurrentView('SETTINGS_SUBSCRIPTION')}
          onHelpClick={() => addToast('Centro de ayuda REGIS.', 'info')}
          onNotificationClick={() => addToast('No tienes notificaciones pendientes.', 'info')}
          className={currentView === 'DASHBOARD' ? 'hidden md:flex' : ''}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          onOpenGuide={handleOpenQuickGuide}
          selectedClassId={selectedClassId}
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
          <div className="md:hidden flex-shrink-0">
            <MobileHeader
              userName={user?.name || teacherProfile?.name || 'Usuario'}
              userAvatar={teacherProfile?.profilePictureUrl}
              onSearchClick={() => setIsGlobalSearchModalOpen(true)}
              onNavigate={handleNavigateTo}
              onLogout={() => setIsLogoutConfirmOpen(true)}
              onShareClick={() => setIsShareModalOpen(true)}
              currentView={currentView}
              title={getHeaderTitle()}
              connectionStatus={connectionStatus}
            />
          </div>
          <div className="hidden md:block flex-shrink-0">
            <Header
              title={getHeaderTitle()}
              userName={teacherProfile?.name || user?.name || 'Usuario'}
              userAvatar={teacherProfile?.profilePictureUrl}
              onMenuClick={() => setIsSidebarOpen(true)}
              onSearchClick={() => setIsGlobalSearchModalOpen(true)}
              onNavigate={handleNavigateTo}
              onLogout={() => setIsLogoutConfirmOpen(true)}
              currentView={currentView}
              connectionStatus={connectionStatus}
              classes={classes}
              selectedClassId={selectedClassId}
              onSelectClass={handleSetSelectedClassId}
            />
          </div>

          <div className="flex-1 overflow-y-auto relative pb-20 md:pb-0 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
            <React.Suspense fallback={<SuspenseFallback />}>
              {renderView()}
            </React.Suspense>
            <UpdatePrompt />
          </div>

          <div className="md:hidden pointer-events-none fixed bottom-0 left-0 right-0 z-20">
            {/* Mobile Bottom Nav container logic if needed, usually it's fixed inside the component or here. 
                   Looking at MobileBottomNav usage in Step 68 it was outside main. 
                   I'll place it here but ensure z-index.
               */}
            <div className="pointer-events-auto">
              <MobileBottomNav currentView={currentView} onNavigate={handleNavigateTo} selectedClassId={selectedClassId} />
            </div>
          </div>
        </main>
      </div>


        {/* Old OnboardingWizard disabled as per new strategy */}
        {/* <OnboardingWizard
          isOpen={isQuickGuideOpen}
          onClose={handleCloseQuickGuide}
          onComplete={handleCompleteOnboarding}
          userId={user?.id || 'demo-user'}
          classes={classes}
        /> */}

        {/* Setup Wizard (Phase 1 Entry Point) */}
        {isSetupWizardOpen && (
          <SetupWizard
            onClose={() => setIsSetupWizardOpen(false)}
            onComplete={() => {
              setIsSetupWizardOpen(false);
              localStorage.setItem('regis_onboarding_completed', 'true');
              localStorage.removeItem('regis_setup_pending');
              completeMission('profileSetup');
            }}
            profile={teacherProfile}
            onUpdateProfile={handleUpdateTeacherProfile}
            classes={classes}
          />
        )}



        {/* Modals */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Modals */}
        <React.Suspense fallback={null}>
          <AddClassModal
            isOpen={isAddClassModalOpen}
          onClose={() => setIsAddClassModalOpen(false)}
          onAddClass={handleAddClass}
          classes={classes}
          userGroups={userGroups}
        />
        <EditClassModal
          isOpen={isEditClassModalOpen}
          onClose={() => { setIsEditClassModalOpen(false); setClassToEdit(null); }}
          onSave={handleEditClass}
          classToEdit={classToEdit}
          classes={classes}
          userGroups={userGroups}
        />

        <AddStudentModal isOpen={isAddStudentModalOpen} onClose={() => { setIsAddStudentModalOpen(false); setClassIdForNewStudent(null); }} onAddStudent={handleAddStudent} />
        <EditStudentModal isOpen={isEditStudentModalOpen} onClose={() => { setIsEditStudentModalOpen(false); setStudentToEdit(null); }} student={studentToEdit} onSave={handleEditStudent} />
        <MoveStudentModal isOpen={isMoveStudentModalOpen} onClose={() => { setIsMoveStudentModalOpen(false); setStudentToMove(null); }} student={studentToMove} classes={classes} onMoveStudent={handleMoveStudent} />

        <MoveStudentBulkModal isOpen={isMoveStudentBulkModalOpen} onClose={() => { setIsMoveStudentBulkModalOpen(false); setStudentsToMoveBulk([]); }} students={studentsToMoveBulk} classes={classes} onMoveStudents={handleMoveStudentsBulk} />
        <EditStudentBulkModal isOpen={isEditStudentBulkModalOpen} onClose={() => { setIsEditStudentBulkModalOpen(false); setStudentsToEditBulk([]); }} students={studentsToEditBulk} classes={classes} onSave={handleEditStudentsBulk} />

        <StudentImportModal isOpen={isStudentImportModalOpen} onClose={() => setIsStudentImportModalOpen(false)} onImport={handleImportStudents} classes={classes} aiFeatures={aiFeatures} selectedClassId={selectedClassId} />
        
        <JournalModal 
          isOpen={isJournalModalOpen} 
          onClose={() => setIsJournalModalOpen(false)} 
          onSave={handleSaveJournalEntry} 
          entry={editingJournalEntry} 
          classes={classes} 
          selectedClassId={journalClassIdPreselect} 
        />

        <AddAnecdoteModal isOpen={isAddAnecdoteModalOpen} onClose={() => setIsAddAnecdoteModalOpen(false)} students={students} deletedStudents={deletedStudents} onAddAnecdote={(a) => handleAddAnecdote(a)} selectedClassId={selectedClassId} classes={classes} />

        <AddInstrumentModal
          isOpen={isAddInstrumentModalOpen}
          onClose={() => { setIsAddInstrumentModalOpen(false); setInstrumentPrefill({}); }}
          onAddInstrument={handleAddInstrument}
          classes={classes}
          competencies={competencies}
          fundamentalCompetencies={fundamentalCompetencies}
          aiFeatures={aiFeatures}
          selectedClassId={selectedClassId}
          initialPeriod={instrumentPrefill.period}
          initialCompetencyIds={instrumentPrefill.competencyIds}
        />
        <EditInstrumentModal isOpen={isEditInstrumentModalOpen} onClose={() => { setIsEditInstrumentModalOpen(false); setInstrumentToEdit(null); }} onEditInstrument={handleEditInstrument} instrument={instrumentToEdit} classes={classes} competencies={competencies} fundamentalCompetencies={fundamentalCompetencies} aiFeatures={aiFeatures} />
        <InstrumentDetailModal isOpen={isInstrumentDetailModalOpen} onClose={() => { setIsInstrumentDetailModalOpen(false); setInstrumentToView(null); }} instrument={instrumentToView} competencies={competencies} fundamentalCompetencies={fundamentalCompetencies} onExpressGradingClick={(inst) => { setIsInstrumentDetailModalOpen(false); setGradingInstrument(inst); setIsExpressGradingModalOpen(true); }} onEditInstrumentClick={(inst) => { setIsInstrumentDetailModalOpen(false); setInstrumentToEdit(inst); setIsEditInstrumentModalOpen(true); }} onDeleteInstrument={handleDeleteInstrument} />
        <ExpressGradingModal isOpen={isExpressGradingModalOpen} onClose={() => { setIsExpressGradingModalOpen(false); setGradingInstrument(null); setExpressGradingStudentId(null); }} instrument={gradingInstrument} students={students} grades={grades} onGradeUpdated={handleGradeUpdated} initialFocusStudentId={expressGradingStudentId} classes={classes} />

        <AddCompetencyModal isOpen={isAddCompetencyModalOpen} onClose={() => setIsAddCompetencyModalOpen(false)} onAddCompetencies={handleAddCompetencies} classes={classes} competencies={competencies} selectedClassId={selectedClassId} fundamentalCompetencies={fundamentalCompetencies} />
        <CopyCompetencyModal isOpen={isCopyCompetencyModalOpen} onClose={() => { setIsCopyCompetencyModalOpen(false); setCompetencyToCopy(null); }} competency={competencyToCopy} classes={classes} onCopy={handleCopyCompetency} />

        <GlobalSearchModal isOpen={isGlobalSearchModalOpen} onClose={() => setIsGlobalSearchModalOpen(false)} students={students} deletedStudents={deletedStudents} instruments={instruments} classes={classes} competencies={competencies} fundamentalCompetencies={fundamentalCompetencies} onNavigate={handleNavigateTo} />
        <ClassDetailModal isOpen={!!classToView} onClose={() => setClassToView(null)} cls={classToView} students={students} teacherName={user.name} attendance={attendance} grades={grades} instruments={instruments} onEdit={(cls) => { setClassToView(null); setClassToEdit(cls); setIsEditClassModalOpen(true); }} onDelete={(cls) => { setClassToView(null); setClassToMoveToBin(cls); }} />

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
        </React.Suspense>

        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          user={{ id: user.id, name: user.name || 'Usuario', email: user.email || '' }}
          currentView={currentView}
        />

        <QRShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          url="https://regis-app.com"
        />

        {isSetupWizardOpen && (
          <React.Suspense fallback={null}>
            <SetupWizard
              onClose={() => setIsSetupWizardOpen(false)}
              onComplete={() => {
                setIsSetupWizardOpen(false);
                localStorage.removeItem('regis_setup_pending');
                api.getTeacherProfile().then(setTeacherProfile);
              }}
              profile={teacherProfile}
              onUpdateProfile={handleUpdateTeacherProfile}
              classes={classes}
            />
          </React.Suspense>
        )}

        {/* Feedback Trigger Button */}
        <button
          onClick={() => setIsFeedbackModalOpen(true)}
          className="fixed bottom-20 right-4 z-40 bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-110 active:scale-95 md:bottom-6 md:right-6"
          title="Buzón de sugerencias"
        >
          <MessageSquarePlus className="w-6 h-6" />
        </button>
      </div>
    </SubscriptionProvider >
  );
}

export default AuthenticatedApp;
