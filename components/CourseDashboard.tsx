import React, { useMemo } from 'react';
import { motion } from 'framer-motion'; // Using framer-motion that is already installed (motion/react in other files)
import { 
  UsersRound, 
  BookOpen, 
  TrendingUp, 
  PlusCircle, 
  CalendarMinus,
  CheckCircle2,
  AlertCircle,
  PencilLine,
  CalendarCheck2,
  AlertTriangle
} from 'lucide-react';
import type { 
  Class, 
  Student, 
  AttendanceRecord, 
  DailyNote, 
  EvaluationInstrument, 
  Grade,
  JournalEntry
} from '../types';

interface CourseDashboardProps {
  cls: Class;
  students: Student[];
  attendance: AttendanceRecord[];
  dailyNotes: DailyNote[];
  journalEntries: JournalEntry[];
  instruments: EvaluationInstrument[];
  grades: Grade[];
  onNavigate: (view: any, params?: any) => void;
  onOpenJournalModal: (entry?: JournalEntry | null, classId?: string | null) => void;
  onAddAnecdoteClick: () => void;
}

export const CourseDashboard: React.FC<CourseDashboardProps> = ({
  cls,
  students,
  attendance,
  dailyNotes,
  journalEntries,
  instruments,
  grades,
  onNavigate,
  onOpenJournalModal,
  onAddAnecdoteClick
}) => {
  // --- Student Statistics ---
  const classStudents = useMemo(() => {
    return students.filter(s => s.classId === cls.id || (cls.groupId && s.groupId === cls.groupId));
  }, [students, cls]);
  
  const totalStudents = classStudents.length;

  // --- Attendance Analytics ---
  const attendanceRate = useMemo(() => {
    const classAttendance = attendance.filter(a => a.classId === cls.id);
    if (classAttendance.length === 0) return 0;
    const presents = classAttendance.filter(a => a.status === 'Presente').length;
    return Math.round((presents / classAttendance.length) * 100);
  }, [attendance, cls.id]);

  // --- Reflective Diary (Journal Entries) ---
  const recentJournalEntries = useMemo(() => {
    return journalEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [journalEntries]);

  // --- Competency / Performance Analytics ---
  // A simplified average based on available grades for this class's instruments
  const classPerformance = useMemo(() => {
    const classInstruments = instruments.filter(i => i.classId === cls.id);
    const relevantGrades = grades.filter(g => classInstruments.some(i => i.id === g.instrumentId) && g.score !== null);
    
    if (relevantGrades.length === 0) return { average: 0, count: 0 };
    
    const sum = relevantGrades.reduce((acc, g) => acc + (g.score || 0), 0);
    // Rough normalization considering typical scale 0-100
    // To be perfectly accurate we'd divide by total possible points, assuming scores are out of total points
    let totalPointsPosssible = 0;
    let totalScore = 0;
    
    relevantGrades.forEach(g => {
       const inst = classInstruments.find(i => i.id === g.instrumentId);
       if (inst) {
           totalPointsPosssible += inst.totalPoints;
           totalScore += g.score || 0;
       }
    });

    const average = totalPointsPosssible > 0 ? Math.round((totalScore / totalPointsPosssible) * 100) : 0;
    return { average, count: classInstruments.length };
  }, [instruments, grades, cls.id]);

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-fade-in pb-24 md:pb-8 max-w-7xl mx-auto custom-scrollbar overflow-y-auto">
      
      {/* Overview Card */}
      <div 
        className="relative overflow-hidden rounded-[2rem] p-8 shadow-2xl text-white"
        style={{ 
          background: `linear-gradient(135deg, ${cls.color || '#6366f1'} 0%, ${cls.color ? cls.color + 'dd' : '#4338ca'} 100%)` 
        }}
      >
        <div className="absolute top-0 right-0 -mt-16 -mr-16 bg-white opacity-10 rounded-full w-64 h-64 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-1">{cls.grade} {cls.section}</h1>
            <h2 className="text-2xl opacity-90 font-medium">{cls.name}</h2>
            <p className="text-sm mt-4 inline-block bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md">
              Año Escolar: {cls.schoolYear}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => onNavigate('STUDENTS')} 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all text-white font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2"
            >
              <UsersRound className="w-5 h-5" /> Estudiantes
            </button>
            <button 
              onClick={() => onNavigate('GRADEBOOK_GRADES')}
              className="bg-white text-indigo-900 hover:scale-105 transition-transform font-bold py-2.5 px-6 rounded-2xl flex items-center gap-2 shadow-lg"
            >
              <TrendingUp className="w-5 h-5" /> Calificar
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => onNavigate('ATTENDANCE', { mode: 'fast' })}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-200">Asistencia</span>
        </button>

        <button 
          onClick={() => onNavigate('GRADEBOOK_GRADES')}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-200">Calificar</span>
        </button>

        <button 
          onClick={onAddAnecdoteClick}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-200">Incidencia</span>
        </button>

        <button 
          onClick={() => onOpenJournalModal(null, cls.id)}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
            <PencilLine className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-200">Diario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Statistics Pillar */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="p-2.5 md:p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl w-fit">
                <UsersRound className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100">Estudiantes</h3>
            </div>
            <div className="flex flex-wrap items-baseline gap-1 md:gap-2">
              <span className="text-3xl md:text-5xl font-black text-slate-800 dark:text-slate-100">{totalStudents}</span>
              <span className="text-xs md:text-sm text-slate-500 font-medium">registrados</span>
            </div>
            {totalStudents === 0 && (
               <p className="text-xs text-rose-500 mt-2 flex items-center gap-1 font-medium">
                 <AlertCircle className="w-4 h-4" /> Sin estudiantes
               </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="p-2.5 md:p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl w-fit">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100">Asistencia</h3>
            </div>
            <div className="flex flex-wrap items-baseline gap-1 md:gap-2">
              <span className="text-3xl md:text-5xl font-black text-slate-800 dark:text-slate-100">{attendanceRate}%</span>
              <span className="text-xs md:text-sm text-slate-500 font-medium">promedio</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 md:h-2 mt-3 overflow-hidden">
               <div className="bg-emerald-500 h-1.5 md:h-2 rounded-full" style={{ width: `${attendanceRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Competencies Progress */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
               <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl">
                 <TrendingUp className="w-6 h-6" />
               </div>
               <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Logro de Competencias</h3>
             </div>
             <button 
                onClick={() => onNavigate('GRADEBOOK_COMPETENCIES')}
                className="text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
             >
                Ver Detalle
             </button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
             {classPerformance.count > 0 ? (
                <>
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-700" />
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" 
                        strokeDasharray={351.8} strokeDashoffset={351.8 - (351.8 * classPerformance.average) / 100} 
                        className="text-indigo-500 transition-all duration-1000 ease-in-out" 
                      />
                    </svg>
                    <span className="absolute text-3xl font-black text-slate-800 dark:text-slate-100">{classPerformance.average}%</span>
                  </div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-200 text-lg">Promedio General</h4>
                  <p className="text-slate-500 text-sm mt-1">Basado en {classPerformance.count} instrumentos evaluados</p>
                </>
             ) : (
                <>
                  <CalendarMinus className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Aún no hay calificaciones</p>
                  <p className="text-slate-400 text-sm mt-1">Añade instrumentos para ver el progreso del curso.</p>
                </>
             )}
          </div>
        </div>

        <div className="md:col-span-3 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Diario Reflexivo</h3>
            </div>
            <button 
              onClick={() => onOpenJournalModal(null, cls.id)}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800 dark:bg-slate-700 px-4 py-2 rounded-xl hover:bg-slate-900 transition-colors shadow-md"
            >
              <PlusCircle className="w-4 h-4" /> Añadir Entrada
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {recentJournalEntries.length > 0 ? recentJournalEntries.map(entry => (
               <div 
                 key={entry.id} 
                 onClick={() => onOpenJournalModal(entry)}
                 className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer group"
               >
                 <div className="flex justify-between items-start mb-2">
                   <p className="text-xs font-bold text-amber-600 dark:text-amber-500">
                     {new Date(entry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                   </p>
                   <PencilLine className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>
                 <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-4 leading-relaxed italic">
                   "{entry.content}"
                 </p>
               </div>
             )) : (
               <div className="col-span-1 md:col-span-3 text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                 <BookOpen className="w-10 h-10 text-slate-300 mb-3 mx-auto" />
                 <p className="text-slate-500 font-medium mb-1">El diario reflexivo está vacío</p>
                 <p className="text-sm text-slate-400">Registra anécdotas o reflexiones del día sobre este curso.</p>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
