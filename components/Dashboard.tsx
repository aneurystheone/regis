import React, { useMemo } from 'react';
import type { Class, Student, EvaluationInstrument, AttendanceRecord, Grade } from '../types';
import { ClipboardCheckIcon, BookOpenIcon, PlusIcon, DocumentTextIcon, UserGroupIcon, PresentationChartBarIcon, TrophyIcon, SparklesIcon, ChartBarIcon, XIcon } from './icons';
import { AttendanceStatus } from '../types';

interface DashboardProps {
  userName: string;
  classes: Class[];
  students: Student[];
  instruments: EvaluationInstrument[];
  attendance: AttendanceRecord[];
  grades: Grade[];
  onNavigate: (view: 'STUDENTS' | 'ATTENDANCE' | 'GRADEBOOK_INSTRUMENTS' | 'CLASSES' | 'LESSON_PLANNER') => void;
  onAddAnecdoteClick: () => void;
  selectedClassId: string | null;
}

const AttendanceGauge: React.FC<{ percentage: number }> = ({ percentage }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg className="w-28 h-28 transform -rotate-90 drop-shadow-sm">
        <circle cx="56" cy="56" r={radius} className="stroke-slate-100 dark:stroke-slate-700 fill-none" strokeWidth="10" />
        <circle cx="56" cy="56" r={radius} className="stroke-brand-accent fill-none transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={isNaN(offset) ? circumference : offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <span className="text-2xl font-black text-brand-primary dark:text-white leading-none">{percentage}%</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Asistencia</span>
      </div>
    </div>
  );
};

const CompetencyBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      <span>{label}</span>
      <span className="text-brand-primary dark:text-brand-secondary">{value}%</span>
    </div>
    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-1000 ease-out shadow-inner`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; onClick: () => void; color: string; }> = ({ icon, label, value, onClick, color }) => (
  <button onClick={onClick} className="group relative w-full p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 text-left overflow-hidden active:scale-95">
    <div className={`absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 bg-gradient-to-br ${color} opacity-[0.03] group-hover:opacity-[0.08] rounded-full blur-2xl transition-opacity`} />
    <div className="relative z-10 flex items-center justify-between">
      <div>
        <p className="text-4xl font-black text-brand-primary dark:text-slate-100 mb-1 tracking-tight">{value}</p>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">{label}</p>
      </div>
      <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-700 text-brand-primary dark:text-brand-secondary group-hover:scale-110 group-hover:bg-brand-secondary group-hover:text-white transition-all duration-300`}>
        {icon}
      </div>
    </div>
  </button>
);

export const Dashboard: React.FC<DashboardProps> = ({ userName, classes, students, instruments, attendance, grades, onNavigate, onAddAnecdoteClick, selectedClassId }) => {
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);
  const classInstruments = useMemo(() => instruments.filter(i => i.classId === selectedClassId), [instruments, selectedClassId]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return classInstruments.filter(inst => {
      const [y, m, d] = inst.date.split('-').map(Number);
      return new Date(y, m - 1, d) >= today;
    }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  }, [classInstruments]);

  const attendanceStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const classStudentIds = new Set(classStudents.map(s => s.id));
    const todaysRecords = attendance.filter(record => record.date === today && classStudentIds.has(record.studentId));
    if (todaysRecords.length === 0) return { percentage: 0, hasData: false };
    const presentCount = todaysRecords.filter(r => r.status === 'Presente' || r.status === 'Tarde').length;
    return { percentage: Math.round((presentCount / todaysRecords.length) * 100), hasData: true };
  }, [attendance, classStudents]);

  const performanceData = useMemo(() => {
    return [
      { name: 'Comunicativa', color: 'bg-brand-secondary', value: 88 },
      { name: 'Pensamiento Lógico', color: 'bg-indigo-400', value: 76 },
      { name: 'Ética y Ciudadana', color: 'bg-brand-accent', value: 92 },
      { name: 'Científica', color: 'bg-orange-400', value: 81 },
    ];
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-fade-in bg-brand-bg dark:bg-slate-900 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-brand-primary dark:text-slate-100 tracking-tight">¡Hola, {userName}!</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {selectedClass ? `${selectedClass.name} • ${selectedClass.grade} ${selectedClass.section}` : 'Selecciona una clase'}
            </p>
          </div>
        </div>
        <button onClick={() => onNavigate('ATTENDANCE')} className="flex items-center bg-brand-primary text-white font-black py-3 px-6 rounded-2xl hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 active:scale-95 group">
          <ClipboardCheckIcon className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
          PASAR ASISTENCIA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<BookOpenIcon className="w-7 h-7"/>} label="Cursos" value={classes.length} onClick={() => onNavigate('CLASSES')} color="from-brand-secondary to-blue-400" />
        <StatCard icon={<UserGroupIcon className="w-7 h-7"/>} label="Estudiantes" value={classStudents.length} onClick={() => onNavigate('STUDENTS')} color="from-brand-accent to-emerald-400" />
        <StatCard icon={<TrophyIcon className="w-7 h-7"/>} label="Evaluaciones" value={classInstruments.length} onClick={() => onNavigate('GRADEBOOK_INSTRUMENTS')} color="from-orange-400 to-amber-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8">Hoy</h3>
            {attendanceStats.hasData ? <AttendanceGauge percentage={attendanceStats.percentage} /> : (
                <div className="py-6 opacity-20 flex flex-col items-center grayscale">
                    <ClipboardCheckIcon className="w-16 h-16 mb-4 text-slate-400" />
                    <p className="text-sm font-bold uppercase tracking-widest">Sin registros</p>
                </div>
            )}
        </div>
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black text-brand-primary dark:text-slate-100 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-brand-secondary" /> Promedios
                </h3>
                <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-[10px] font-black uppercase tracking-widest rounded-full">Vicente Analytics</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {performanceData.map((p, i) => <CompetencyBar key={i} label={p.name} value={p.value} color={p.color} />)}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-brand-primary dark:text-slate-100 mb-6 flex items-center gap-2">
                <PresentationChartBarIcon className="w-5 h-5 text-brand-secondary" /> Próximas Evaluaciones
            </h3>
            <div className="space-y-4">
                {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-center p-4 bg-brand-bg dark:bg-slate-700/50 rounded-2xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all border border-transparent hover:border-slate-100 group">
                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex flex-col items-center justify-center shadow-sm mr-4 border border-slate-50 dark:border-slate-700 group-hover:scale-105 transition-transform">
                            <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{new Date(event.date + 'T12:00:00').toLocaleString('es', { month: 'short' })}</span>
                            <span className="text-xl font-black text-brand-primary dark:text-brand-secondary leading-none">{new Date(event.date + 'T12:00:00').getDate()}</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{event.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{event.type} • {event.totalPoints} pts</p>
                        </div>
                    </div>
                )) : <p className="text-center py-12 text-slate-300 italic">Todo al día</p>}
            </div>
        </div>

        <div className="lg:col-span-5 bg-brand-primary p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-brand-accent/20 transition-all duration-1000" />
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30 shadow-inner">
                    <img src="https://ui-avatars.com/api/?name=Vicente&background=3CCF91&color=1F3A5F" className="w-10 h-10 rounded-full" alt="Vicente" />
                </div>
                <div>
                    <h3 className="text-xl font-black leading-none">Vicente</h3>
                    <p className="text-[10px] font-bold text-brand-accent uppercase tracking-widest mt-1">Tu Asistente Experto</p>
                </div>
            </div>
            <div className="space-y-4">
                <button onClick={() => onNavigate('LESSON_PLANNER')} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5">
                    <div className="flex items-center gap-3">
                        <PresentationChartBarIcon className="w-5 h-5 text-brand-accent" />
                        <span className="font-bold text-sm">Consultar Planificación</span>
                    </div>
                </button>
                <button onClick={onAddAnecdoteClick} className="w-full flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5">
                    <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-5 h-5 text-brand-secondary" />
                        <span className="font-bold text-sm">Dictar Observación</span>
                    </div>
                </button>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs font-medium text-white/70 italic leading-relaxed">"Hola, soy Vicente. ¿En qué puedo ayudarte hoy para que te enfoques en enseñar?"</p>
            </div>
        </div>
      </div>
    </div>
  );
};