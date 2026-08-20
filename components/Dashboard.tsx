import React, { useMemo, useState, useEffect } from 'react';
import type { Class, Student, EvaluationInstrument, AttendanceRecord, Grade, AIFeatures, CustomEvent } from '../types';
import {
  ClipboardCheckIcon,
  ExclamationIcon,
  StarIcon,
  PencilSquareIcon,
  ClockIcon,
  BoltIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChevronRightIcon,
} from './icons';
import { CheckCircle2, Circle, BookOpen, ArrowRight, UserPlus, ClipboardList, X, Sparkles } from 'lucide-react';
import { MissionChecklist } from './onboarding/MissionChecklist';
import { OnboardingMissions } from '../types';
import { isCurrentTimeInSlot } from '../utils';

// --- SetupChecklist: post-onboarding configuration guide ---
// --- SetupChecklist has been moved to MissionChecklist.tsx ---

interface DashboardProps {
  userName: string;
  classes: Class[];
  students: Student[];
  instruments: EvaluationInstrument[];
  attendance: AttendanceRecord[];
  grades: Grade[];
  onNavigate: (view: any, params?: any) => void;
  onAddAnecdoteClick: () => void;
  selectedClassId: string | null;
  onSelectClass: (classId: string) => void;
  aiFeatures: AIFeatures;
  customEvents: any[];
  onNavigateToCalendar?: () => void;
  onEventClick?: (event: any) => void;
  onInstrumentClick?: (instrument: EvaluationInstrument) => void;
  onOpenSetupWizard?: () => void;
  onboardingMissions?: OnboardingMissions;
}


// --- Schedule parser (shared logic from AgendaCard) ---
const DAY_MAP: Record<string, number> = {
  'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3,
  'jueves': 4, 'viernes': 5, 'sábado': 6,
};

function parseTodaySchedule(classes: Class[]): Array<{ cls: Class; time: string }> {
  const today = new Date().getDay();
  const results: Array<{ cls: Class; time: string }> = [];
  const seen = new Set<string>();

  for (const cls of classes) {
    if (!cls.schedule || cls.schedule.toLowerCase().includes('por definir')) continue;
    const slots = cls.schedule.split(',').map(s => s.trim());
    for (const slot of slots) {
      const timeMatch = slot.match(/(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)/);
      const time = timeMatch ? timeMatch[1].trim() : '';
      const lowerSlot = slot.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
        const normalizedDay = dayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (lowerSlot.includes(normalizedDay) && dayNum === today) {
          const key = `${cls.id}|${time}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ cls, time });
          }
        }
      }
    }
  }

  return results.sort((a, b) => {
    const toSort = (t: string) => {
      const m = t.match(/(\d{1,2}):(\d{2})/);
      if (!m) return '99:99';
      let h = parseInt(m[1]);
      if (h >= 1 && h <= 7) h += 12;
      return String(h).padStart(2, '0') + ':' + m[2];
    };
    return toSort(a.time).localeCompare(toSort(b.time));
  });
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// --- Quick Action Button ---
const QuickAction: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}> = ({ label, icon, onClick, color }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 group transition-all active:scale-90"
  >
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg group-hover:-translate-y-1 transition-transform`}>
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-7 h-7' })}
    </div>
    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">{label}</span>
  </button>
);

export const Dashboard: React.FC<DashboardProps> = ({
  userName, classes, students, instruments, attendance, grades,
  onNavigate, onAddAnecdoteClick, selectedClassId, onSelectClass,
  aiFeatures, customEvents, onNavigateToCalendar, onEventClick, onInstrumentClick, onOpenSetupWizard,
  onboardingMissions
}) => {


  const firstName = userName.split(' ')[0];
  const todayClasses = useMemo(() => parseTodaySchedule(classes), [classes]);
  const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayName = weekdayNames[new Date().getDay()];

  const [timeState, setTimeState] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeState(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr}${ampm}`;
  };

  const formatDateSpanish = (date: Date) => {
    const weekdayNamesLocal = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNamesLocal = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${weekdayNamesLocal[date.getDay()]} ${date.getDate()} de ${monthNamesLocal[date.getMonth()]}`;
  };

  // --- Setup checklist (post-onboarding guide) ---
  const [showSetup, setShowSetup] = useState(() => {
    try {
      // Show if missions aren't all complete and user hasn't explicitly dismissed it for this session
      return !localStorage.getItem('regis_missions_dismissed_today');
    } catch { return true; }
  });

  const handleMissionClick = (missionId: keyof OnboardingMissions) => {
    if (missionId === 'profileSetup') {
      if (onOpenSetupWizard) onOpenSetupWizard();
      return;
    }
    const missionRoutes: Record<string, any> = {
      classesCreated: 'CLASSES',
      studentsImported: 'STUDENTS',
      firstAttendance: ['ATTENDANCE', { mode: 'fast' }],
      firstInstrument: 'GRADEBOOK_INSTRUMENTS',
      firstReport: 'REPORTS',
    };

    const route = missionRoutes[missionId];
    if (route) {
      if (Array.isArray(route)) {
        onNavigate(route[0], route[1]);
      } else {
        onNavigate(route);
      }
    }
  };

  const hasScheduleConfigured = classes.some(c => c.schedule && !c.schedule.toLowerCase().includes('por definir'));
  const defaultMissions: OnboardingMissions = {
    profileSetup: hasScheduleConfigured,
    classesCreated: classes.length > 0,
    studentsImported: students.length > 0,
    firstAttendance: attendance.length > 0,
    firstInstrument: instruments.length > 0,
    firstReport: false,
  };

  const activeMissions = onboardingMissions || defaultMissions;

  // --- Determine attendance status for today's classes ---
  const todayStr = new Date().toISOString().split('T')[0];
  const classAttendanceToday = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const tc of todayClasses) {
      const hasAttendance = attendance.some(a => a.classId === tc.cls.id && a.date === todayStr);
      map.set(tc.cls.id, hasAttendance);
    }
    return map;
  }, [todayClasses, attendance, todayStr]);

  // --- Dynamic CTA Logic ---
  const ctaAction = useMemo(() => {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (isWeekend) {
      return {
        text: 'Fin de semana',
        subtitle: 'Descansa y recarga energías',
        action: () => onNavigate('CALENDAR'),
        color: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/30',
      };
    }

    // Find the next or current class
    for (const tc of todayClasses) {
      const m = tc.time.match(/(\d{1,2}):(\d{2})/);
      if (!m) continue;
      let h = parseInt(m[1]);
      if (h >= 1 && h <= 7) h += 12;
      const classMinutes = h * 60 + parseInt(m[2]);

      // Class is within next 30 min or started within last 60 min
      const diff = classMinutes - currentMinutes;
      if (diff > 30) continue;
      if (diff < -60) continue;

      const hasAttendance = classAttendanceToday.get(tc.cls.id);
      const label = `${tc.cls.grade} ${tc.cls.section} – ${tc.cls.name}`;

      if (!hasAttendance) {
        return {
          text: `Pasar lista`,
          subtitle: label,
          action: () => {
            onSelectClass(tc.cls.id);
            onNavigate('ATTENDANCE', { mode: 'fast' });
          },
          color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-blue-900/30',
        };
      } else {
        return {
          text: `Calificar`,
          subtitle: label,
          action: () => {
            onSelectClass(tc.cls.id);
            onNavigate('GRADEBOOK_GRADES');
          },
          color: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200 dark:shadow-purple-900/30',
        };
      }
    }

    // No current/upcoming class
    if (todayClasses.length > 0) {
      const allDone = todayClasses.every(tc => classAttendanceToday.get(tc.cls.id));
      if (allDone) {
        return {
          text: 'Todo al día',
          subtitle: 'Asistencia completada para hoy',
          action: () => onNavigate('CALENDAR'),
          color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-emerald-900/30',
        };
      }
    }

    return {
      text: 'Planificar semana',
      subtitle: `${classes.length} cursos activos`,
      action: () => onNavigate('CALENDAR'),
      color: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/30',
    };
  }, [todayClasses, classAttendanceToday, classes.length, onNavigate, onSelectClass]);

  // --- Upcoming events (next 3 days, not today) ---
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allEvents = [
      ...customEvents.map((e: CustomEvent) => ({ type: 'event' as const, data: e, dateObj: new Date(e.date + 'T00:00:00') })),
      ...instruments.map(i => ({ type: 'instrument' as const, data: i, dateObj: new Date(i.date + 'T00:00:00') })),
    ];

    return allEvents
      .filter(item => item.dateObj >= tomorrow)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 3);
  }, [customEvents, instruments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Mañana';
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] dark:bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-6 pb-32 md:pb-8 font-sans animate-fade-in custom-scrollbar overflow-y-auto">

      {/* ═══════════════════════════════════════════════ */}
      {/* ZONA 1: Estado del Día                         */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-[28px] border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all duration-300">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {getTimeGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
            {todayClasses.length > 0
              ? `${todayClasses.length} clase${todayClasses.length > 1 ? 's' : ''} hoy`
              : 'Sin clases programadas hoy'}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end justify-center">
          <div className="text-4xl sm:text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight tabular-nums select-none">
            {formatTime(timeState)}
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-widest">
            {formatDateSpanish(timeState)}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ZONA 2: CTA Dinámico                           */}
      {/* ═══════════════════════════════════════════════ */}
      <button
        onClick={ctaAction.action}
        className={`w-full ${ctaAction.color} text-white rounded-2xl p-5 shadow-xl flex items-center justify-between transition-all transform hover:scale-[1.01] active:scale-[0.98]`}
      >
        <div className="text-left">
          <p className="text-lg font-black">{ctaAction.text}</p>
          <p className="text-sm opacity-80 font-medium">{ctaAction.subtitle}</p>
        </div>
        <ArrowRight className="w-6 h-6 opacity-80" />
      </button>

      {/* ═══════════════════════════════════════════════ */}
      {/* SETUP CHECKLIST (post-onboarding)              */}
      {/* ═══════════════════════════════════════════════ */}
      {showSetup && (
        <MissionChecklist
          missions={activeMissions}
          onMissionClick={handleMissionClick}
          onDismiss={() => {
            setShowSetup(false);
            localStorage.setItem('regis_missions_dismissed_today', 'true');
          }}
        />
      )}

      {/* --- SETUP WIZARD PENDING PROMPT --- */}
      {localStorage.getItem('regis_setup_pending') === 'true' && (
        <div className="bg-indigo-600 rounded-[28px] p-5 shadow-lg flex items-center justify-between text-white group cursor-pointer hover:bg-indigo-700 transition-all" onClick={onOpenSetupWizard}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black leading-tight">Completa tu Registro</h3>
              <p className="text-sm opacity-80 font-medium">Regional, Distrito y Horarios pendientes</p>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full group-hover:translate-x-1 transition-transform">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════ */}
      {/* ZONA 3: Timeline de Hoy                        */}
      {/* ═══════════════════════════════════════════════ */}
      {todayClasses.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4">
            Clases Hoy · {todayName}
          </h2>
          <div className="space-y-1">
            {todayClasses.map(({ cls, time }, idx) => {
              const isNow = isCurrentTimeInSlot(time);
              const hasAttendance = classAttendanceToday.get(cls.id);
              const isSelected = selectedClassId === cls.id;
              const todayInstrument = instruments.find(i => i.classId === cls.id && i.date === todayStr);

              return (
                <div
                  key={`tl-${cls.id}-${idx}`}
                  onClick={() => { onSelectClass(cls.id); onNavigate('COURSE_DASHBOARD'); }}
                  className={`flex items-center gap-3 px-3 py-3.5 rounded-xl cursor-pointer transition-all duration-300 border
                    ${isNow
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/20 shadow-sm scale-[1.01]'
                      : isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-transparent'}`}
                  style={{ borderColor: isNow ? (cls.color || '#6366f1') : isSelected ? undefined : 'transparent' }}
                >
                  <div className="w-16 shrink-0 text-right">
                    <span className={`text-xs font-bold tabular-nums transition-colors duration-300 ${isNow ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'}`}>
                      {time || '—'}
                    </span>
                  </div>
                  <div
                    className="w-1.5 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: cls.color || '#6366f1' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {cls.grade} {cls.section} – {cls.name}
                      </p>
                      {isNow && (
                        <span 
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase" 
                          style={{ 
                            color: cls.color || '#6366f1', 
                            backgroundColor: cls.color ? `${cls.color}15` : '#6366f115',
                            border: `1px solid ${cls.color}30` || '1px solid #6366f130'
                          }}
                        >
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: cls.color || '#6366f1' }}></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: cls.color || '#6366f1' }}></span>
                          </span>
                          Ahora
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {hasAttendance && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Lista tomada
                        </span>
                      )}
                      {todayInstrument && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onInstrumentClick) onInstrumentClick(todayInstrument);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          <DocumentTextIcon className="w-3 h-3" /> {todayInstrument.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      ) : classes.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4">
            Mis Clases
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {classes.map(cls => {
              const isSelected = selectedClassId === cls.id;
              return (
                <div
                  key={`cls-${cls.id}`}
                  onClick={() => { onSelectClass(cls.id); onNavigate('COURSE_DASHBOARD'); }}
                  className={`rounded-xl p-3 cursor-pointer transition-all border
                    ${isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cls.color || '#6366f1' }}
                    />
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{cls.grade} {cls.section}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{cls.name}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">{cls.schoolYear}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════ */}
      {/* ZONA 4: Acciones Secundarias + Próximos        */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-5">

        {/* Upcoming Events */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-[28px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Próximamente</h2>
            <button
              onClick={() => onNavigate('CALENDAR')}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-500 transition-colors"
              aria-label="Ver calendario"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? upcomingEvents.map((item, idx) => {
              const isInstrument = item.type === 'instrument';
              const title = isInstrument ? (item.data as EvaluationInstrument).name : (item.data as CustomEvent).title;
              const dateStr = isInstrument ? (item.data as EvaluationInstrument).date : (item.data as CustomEvent).date;
              const color = isInstrument
                ? (classes.find(c => c.id === (item.data as EvaluationInstrument).classId)?.color || '#6b7280')
                : (item.data as CustomEvent).color;

              return (
                <div
                  key={`up-${idx}`}
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 -mx-2 rounded-xl transition-colors"
                  onClick={() => {
                    if (isInstrument && onInstrumentClick) onInstrumentClick(item.data as EvaluationInstrument);
                    else if (!isInstrument && onEventClick) onEventClick(item.data as CustomEvent);
                  }}
                >
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{title}</p>
                    <span className="text-[11px] text-slate-500 font-medium">{formatDate(dateStr)}</span>
                  </div>
                  {isInstrument && (
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg font-bold shrink-0">
                      Evaluación
                    </span>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-4">
                <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-400">Sin eventos próximos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};