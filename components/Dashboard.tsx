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
  StarIcon,
  SparklesIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  TrendingUpIcon
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
  colorClass: string;
  iconBgClass: string;
  onClick?: () => void
}> = ({ icon, label, value, colorClass, iconBgClass, onClick }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-w-[140px] flex-shrink-0 cursor-pointer hover:shadow-md transition-all active:scale-95"
  >
    <div className={`w-10 h-10 rounded-xl ${iconBgClass} ${colorClass} flex items-center justify-center mb-3`}>
      {icon}
    </div>
    <div>
      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{value}</h4>
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  </div>
);

const QuickAction: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: 'blue' | 'purple' | 'emerald' | 'rose' | 'amber';
}> = ({ label, icon, onClick, color }) => {
  const colors = {
    blue: 'bg-blue-500 shadow-blue-200 dark:shadow-blue-900/20',
    purple: 'bg-purple-500 shadow-purple-200 dark:shadow-purple-900/20',
    emerald: 'bg-emerald-500 shadow-emerald-200 dark:shadow-emerald-900/20',
    rose: 'bg-rose-500 shadow-rose-200 dark:shadow-rose-900/20',
    amber: 'bg-amber-500 shadow-amber-200 dark:shadow-amber-900/20',
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group transition-all active:scale-90"
    >
      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${colors[color]} flex items-center justify-center text-white shadow-lg group-hover:-translate-y-1 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-7 h-7 sm:w-8 sm:h-8' })}
      </div>
      <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">{label}</span>
    </button>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ userName, classes, students, instruments, attendance, grades, onNavigate, onAddAnecdoteClick, selectedClassId, aiFeatures }) => {
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

  const attendanceAvg = useMemo(() => {
    const classStudentIds = new Set(classStudents.map(s => s.id));
    const classAttendance = attendance.filter(a => classStudentIds.has(a.studentId));
    if (classAttendance.length === 0) return 0;
    const present = classAttendance.filter(a => a.status === 'Presente').length;
    return Math.round((present / classAttendance.length) * 100);
  }, [attendance, classStudents]);

  const averageGrade = useMemo(() => {
    const classStudentIds = new Set(classStudents.map(s => s.id));
    const classGrades = grades.filter(g => classStudentIds.has(g.studentId));
    if (classGrades.length === 0) return 0;
    const scores = classGrades.filter(g => g.score !== null).map(g => g.score as number);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [grades, classStudents]);

  const firstName = userName.split(' ')[0];

  return (
    <div className="min-h-full bg-[#F8FAFC] dark:bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-8 pb-24 md:pb-8 font-sans animate-fade-in custom-scrollbar overflow-y-auto">

      {/* HEADER: GREETING & STATUS */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            ¡Hola, {firstName}! 👋
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Panel de productividad hoy</p>
        </div>
      </div>

      {/* HORIZONTAL STATS - SCHOOL WIDE PULSE */}
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <StatCard
          icon={<UserGroupIcon className="w-5 h-5" />}
          label="Total Alumnos"
          value={students.length}
          colorClass="text-emerald-500"
          iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          icon={<TableCellsIcon className="w-5 h-5" />}
          label="Total Cursos"
          value={classes.length}
          colorClass="text-blue-500"
          iconBgClass="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<StarIcon className="w-5 h-5" />}
          label="Evaluaciones"
          value={instruments.length}
          colorClass="text-purple-500"
          iconBgClass="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          icon={<TrendingUpIcon className="w-5 h-5" />}
          label="Rendimiento"
          value={`${Math.round(averageGrade)}%`}
          colorClass="text-amber-500"
          iconBgClass="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: MAIN CONTEXT (LARGE) */}
        <div className="lg:col-span-8 space-y-6">

          {/* CLASS OVERVIEW CARD */}
          <div className="relative overflow-hidden bg-brand-primary rounded-[32px] p-6 text-white shadow-2xl shadow-indigo-500/20 group">
            {/* Abstract Background Design */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-110 duration-700"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>

            <div className="relative z-10 flex flex-col h-full space-y-6">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  Clase Activa
                </div>
                <button onClick={() => onNavigate('CLASSES')} className="text-white/80 hover:text-white transition-colors">
                  <PencilSquareIcon className="w-6 h-6" />
                </button>
              </div>

              <div>
                <h2 className="text-4xl font-black tracking-tight leading-tight">
                  {selectedClass ? `${selectedClass.grade} ${selectedClass.section}` : 'Sin Clase'}
                </h2>
                <p className="text-lg font-bold text-indigo-100 mt-1">{selectedClass ? selectedClass.name : 'Por favor seleccione una clase'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Asistencia</p>
                  <p className="text-xl font-black mt-1">{attendanceAvg}%</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Alumnos</p>
                  <p className="text-xl font-black mt-1">{classStudents.length}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Promedio</p>
                  <p className="text-xl font-black mt-1">{averageGrade > 0 ? averageGrade : '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTION GRID - CONTROL CENTER STYLE */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-[32px] p-6 sm:p-8 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-6 px-2">Acciones Rápidas</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6 sm:gap-8">
              <QuickAction label="Asistencia" icon={<ClipboardCheckIcon />} color="blue" onClick={() => onNavigate('ATTENDANCE')} />
              <QuickAction label="Calificar" icon={<StarIcon />} color="purple" onClick={() => onNavigate('GRADEBOOK_INSTRUMENTS')} />
              <QuickAction label="Incidencia" icon={<ExclamationIcon />} color="rose" onClick={onAddAnecdoteClick} />
              <QuickAction label="Alumnos" icon={<UserGroupIcon />} color="emerald" onClick={() => onNavigate('STUDENTS')} />
              <QuickAction label="IA" icon={<SparklesIcon />} color="amber" onClick={() => onNavigate('LESSON_PLANNER')} />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SIDEBAR WIDGETS */}
        <div className="lg:col-span-4 space-y-6">

          {/* VICENTE MINI WIDGET */}
          {aiFeatures.vicenteAssistant && (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group border border-emerald-400/20">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-white">Vicente AI</h4>
                  <p className="text-[10px] text-emerald-100 font-bold">Asistente Inteligente</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-5 text-sm font-medium leading-relaxed italic">
                "He notado que el rendimiento ha mejorado en esta sección. ¿Quieres ver el análisis de Vicente?"
              </div>

              <button
                onClick={() => onNavigate('REPORTS')}
                className="w-full bg-white text-emerald-600 font-black text-xs py-3 rounded-xl hover:bg-emerald-50 transition-colors shadow-lg active:scale-95"
              >
                Ver sugerencias
              </button>
            </div>
          )}

          {/* ACTIVITY FEED */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4">Actividad</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Asistencia tomada</p>
                  <p className="text-[10px] text-slate-500">Hoy, 8:15 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Calificaciones actualizadas</p>
                  <p className="text-[10px] text-slate-500">Ayer, 3:45 PM</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};