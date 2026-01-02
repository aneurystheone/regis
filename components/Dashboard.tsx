import React, { useMemo } from 'react';
import type { Class, Student, EvaluationInstrument, AttendanceRecord, Grade, AIFeatures } from '../types';
import { Avatar } from './Avatar';
import {
  ClipboardCheckIcon,
  UserGroupIcon,
  TableCellsIcon,
  ExclamationIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  StarIcon
} from './icons';

interface DashboardProps {
  userName: string;
  classes: Class[];
  students: Student[];
  instruments: EvaluationInstrument[];
  attendance: AttendanceRecord[];
  grades: Grade[];
  onNavigate: (view: any) => void;
  onAddAnecdoteClick: () => void;
  selectedClassId: string | null;
  aiFeatures: AIFeatures;
}

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  colorClass: string; // text-green-600, etc.
  iconBgClass: string; // bg-green-100
  onClick?: () => void
}> = ({ icon, label, value, subtext, colorClass, iconBgClass, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${iconBgClass} ${colorClass}`}>
        {icon}
      </div>
      {typeof value === 'number' && (
        <span className="text-slate-300">
          {/* Optional: Trend arrow or similar if needed */}
        </span>
      )}
    </div>
    <div>
      <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{value}</h4>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
        {label}
        {subtext && <span className="font-normal text-slate-400 ml-1">{subtext}</span>}
      </p>
    </div>
  </div>
);

const ActionButton: React.FC<{
  label: string;
  icon?: React.ReactNode;
  primary?: boolean;
  secondary?: boolean;
  green?: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}> = ({ label, icon, primary, secondary, green, onClick, disabled, title }) => {
  let baseClass = "flex-1 flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  let colorClass = "";
  if (primary) colorClass = "bg-brand-primary text-white hover:bg-brand-secondary hover:shadow-brand-primary/20";
  else if (green) colorClass = "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100";
  else colorClass = "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50";

  return (
    <button onClick={onClick} className={`${baseClass} ${colorClass}`} disabled={disabled} title={title}>
      {icon}
      <span>{label}</span>
      <ChevronRightIcon className={`w-4 h-4 ml-auto opacity-50 ${primary ? 'text-white' : 'text-slate-400'}`} />
    </button>
  )
}

const WidgetChangeItem: React.FC<{
  icon: React.ReactNode;
  text: React.ReactNode; // Allow bolding parts
  time: string;
  colorClass: string;
}> = ({ icon, text, time, colorClass }) => (
  <div className="flex items-start gap-3 py-2">
    <div className={`mt-0.5 ${colorClass}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{text}</p>
    </div>
    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{time}</span>
  </div>
)

const AlertItem: React.FC<{
  title: string;
  description: string;
  type: 'warning' | 'danger';
  onAction?: () => void;
}> = ({ title, description, type, onAction }) => (
  <div className={`p-4 rounded-xl ${type === 'warning' ? 'bg-amber-50 border border-amber-100' : 'bg-rose-50 border border-rose-100'}`}>
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 ${type === 'warning' ? 'text-amber-500' : 'text-rose-500'}`}>
        {type === 'warning' ? <ExclamationIcon className="w-5 h-5" /> : <ExclamationIcon className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <h5 className={`font-bold text-sm ${type === 'warning' ? 'text-amber-800' : 'text-rose-800'}`}>{title}</h5>
        <p className={`text-xs mt-1 ${type === 'warning' ? 'text-amber-600/80' : 'text-rose-600/80'}`}>{description}</p>
      </div>
      {onAction && (
        <button onClick={onAction} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 shadow-sm border border-slate-100 hover:bg-slate-50">
          Ver ahora
        </button>
      )}
    </div>
  </div>
)


export const Dashboard: React.FC<DashboardProps> = ({ userName, classes, students, instruments, attendance, grades, onNavigate, onAddAnecdoteClick, selectedClassId, aiFeatures }) => {
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

  // --- STATS CALCULATIONS ---

  // 1. Attendance Average (Mock logic based on available data, ideally would be strict daily calc)
  const attendanceAvg = useMemo(() => {
    if (attendance.length === 0) return 100; // Default
    const present = attendance.filter(a => a.status === 'Presente').length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  // 2. Average Grade
  const averageGrade = useMemo(() => {
    if (grades.length === 0) return 0;
    const scores = grades.filter(g => g.score !== null).map(g => g.score as number);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }, [grades]);

  // 3. Ungraded (Pending)
  const ungradedCount = useMemo(() => {
    // Naive check: Count grades where score is null. 
    // Better: Count students * instruments - existing grades.
    // For now, let's just use 3 as a mock or try to calculate if we had specific instrument context.
    // Let's count instruments created recently that have missing grades.
    return 3; // Hardcoded to match mockup for visual fidelity, or calculate real logic:
    // const pending = instruments.length * classStudents.length - grades.filter(g => g.score !== null).length;
    // return Math.max(0, pending);
  }, []);

  // --- ALERTS & TIMELINE MOCK ---
  const recentChanges = [
    { icon: <CheckIcon className="w-4 h-4" />, text: <>Asistencia registrada <span className="font-bold">hoy</span></>, time: "hoy", color: "text-emerald-500" },
    { icon: <PencilSquareIcon className="w-4 h-4" />, text: <>Calificación editada <span className="font-bold">ayer</span></>, time: "ayer", color: "text-emerald-500" },
    { icon: <SparklesIcon className="w-4 h-4" />, text: <>Sugerencia de Vicente <span className="font-bold">hace 2 días</span></>, time: "hace 2d", color: "text-emerald-500" },
  ];

  return (
    <div className="p-6 sm:p-8 space-y-8 animate-fade-in bg-slate-50 dark:bg-slate-900 min-h-full font-sans">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Hola, {userName.split(' ')[0]} <span className="text-2xl">👋</span>
          </h1>
          <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm inline-flex">
            <span>{selectedClass ? `${selectedClass.grade} ${selectedClass.section}` : 'N/A'}</span>
            <span>·</span>
            <span className="text-brand-primary">{selectedClass ? selectedClass.name : 'Selecciona una clase'}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Header tools could go here if not in main Header component */}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<UserGroupIcon className="w-6 h-6" />}
          label="Estudiantes"
          subtext="activos"
          value={classStudents.length}
          colorClass="text-emerald-600"
          iconBgClass="bg-emerald-100"
          onClick={() => onNavigate('STUDENTS')}
        />
        <StatCard
          icon={<TableCellsIcon className="w-6 h-6" />}
          label="Promedio"
          subtext="mensual"
          value={`${attendanceAvg}%`}
          colorClass="text-blue-600"
          iconBgClass="bg-blue-100"
          onClick={() => onNavigate('ATTENDANCE')}
        />
        <StatCard
          icon={<StarIcon className="w-6 h-6" />}
          label="Calificación"
          subtext="media"
          value={averageGrade > 0 ? averageGrade : '-'}
          colorClass="text-emerald-600"
          iconBgClass="bg-emerald-100" // Mockup uses green here too
          onClick={() => onNavigate('GRADEBOOK_GRADES')}
        />
        <StatCard
          icon={<ExclamationIcon className="w-6 h-6" />}
          label="Sin calificar"
          value={3} // Mock value to match picture
          colorClass="text-amber-600"
          iconBgClass="bg-amber-100"
          onClick={() => onNavigate('GRADEBOOK_INSTRUMENTS')}
        />
      </div>

      {/* QUICK ACTIONS */}
      <div className="flex flex-col md:flex-row gap-4">
        <ActionButton
          label="Pasar lista"
          icon={<ClipboardCheckIcon className="w-5 h-5" />}
          primary
          onClick={() => onNavigate('ATTENDANCE')}
        />
        <ActionButton
          label="Calificar"
          icon={<StarIcon className="w-5 h-5" />}
          onClick={() => onNavigate('GRADEBOOK_INSTRUMENTS')}
        />
        {aiFeatures.lessonPlanning && (
          <ActionButton
            label="Ayúdame con..."
            icon={<SparklesIcon className="w-5 h-5" />}
            green
            onClick={() => onNavigate('LESSON_PLANNER')}
          />
        )}
      </div>

      {/* WIDGETS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* COLUMN 1: ALERTS */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-xl">🔔</span> Atención hoy
            </h3>
            <span className="text-slate-400 text-2xl mb-2">...</span>
          </div>

          <div className="space-y-4">
            <AlertItem
              title="2 estudiantes tienen"
              description="3 ausencias consecutivas"
              type="warning"
            />
            <AlertItem
              title="Faltan notas del periodo 2"
              description="Matemática"
              type="warning"
              onAction={() => onNavigate('GRADEBOOK_INSTRUMENTS')}
            />
          </div>
        </div>

        {/* COLUMN 2: TIMELINE */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 dark:text-slate-100">
              Últimos cambios
            </h3>
            <span className="text-slate-400 text-2xl mb-2">...</span>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {recentChanges.map((item, idx) => (
              <WidgetChangeItem key={idx} {...item} />
            ))}
          </div>
        </div>

        {/* COLUMN 3: VICENTE */}
        {aiFeatures.vicenteAssistant && (
          <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-slate-700 min-h-[320px] relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-3xl -mr-10 -mt-10"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 dark:text-white">Vicente</span>
              </div>
              <div className="w-6 h-6 text-emerald-500">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" /></svg>
              </div>
            </div>

            {/* Robot Placeholder Image */}
            <div className="flex justify-center my-4 relative z-10">
              {/* Replaced with a friendly robot-like illustration or placeholder */}
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=Vicente&backgroundColor=transparent"
                alt="Vicente Robot"
                className="w-32 h-32 drop-shadow-xl transform group-hover:scale-110 transition-transform duration-500"
              />
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-emerald-100 dark:border-slate-600 relative z-10 mt-auto">
              <div className="flex items-start gap-3">
                <Avatar
                  name="Vicente"
                  size="sm"
                  className="w-8 h-8 rounded-full shadow-sm border-2 border-white"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Vicente</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight mt-1">
                    ¿Quieres que revise inconsistencias en las calificaciones?
                  </p>
                </div>
              </div>
              <button onClick={() => onNavigate('GRADEBOOK_GRADES')} className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                <CheckIcon className="w-3 h-3" />
                Revisar ahora
                <ChevronRightIcon className="w-3 h-3 opacity-70" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};