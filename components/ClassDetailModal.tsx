

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Class, Student, AttendanceRecord, Grade, EvaluationInstrument } from '../types';
import { AttendanceStatus } from '../types';
import { XIcon, PencilIcon, ClockIcon, UserGroupIcon, UserCircleIcon, TrashIcon } from './icons';

interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: Class | null;
  students: Student[];
  teacherName: string;
  onEdit: (cls: Class) => void;
  onDelete: (cls: Class) => void;
  attendance: AttendanceRecord[];
  grades: Grade[];
  instruments: EvaluationInstrument[];
}

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`flex items-center p-3 rounded-lg bg-opacity-10 ${color}`}>
    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-slate-700 bg-opacity-50 flex-shrink-0 shadow-sm">
      {icon}
    </div>
    <div className="ml-3">
      <p className="font-bold text-xl">{value}</p>
      <p className="text-sm font-medium opacity-90">{label}</p>
    </div>
  </div>
);

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ isOpen, onClose, cls, students, teacherName, onEdit, onDelete }) => {

  const classStudents = useMemo(() => {
    if (!cls) return [];
    return cls.groupId 
      ? students.filter(s => s.groupId === cls.groupId)
      : students.filter(s => s.classId === cls.id);
  }, [cls, students]);

  const enrollment = useMemo(() => {
    const total = classStudents.length;
    const female = classStudents.filter(s => s.gender === 'F').length;
    const male = classStudents.filter(s => s.gender === 'M').length;
    return { total, female, male };
  }, [classStudents]);

  if (!cls) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Frosted Glass Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            role="document"
          >

        {/* Modal Header */}
        <div className="flex-shrink-0 p-6 border-b border-white/20 dark:border-slate-700/50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">{cls.grade.replace(' Grado', '')} {cls.section} - {cls.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{cls.schoolYear}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Cerrar modal">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="flex-grow overflow-y-auto p-6 space-y-8 text-slate-700 dark:text-slate-300">
          <div className="p-5 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-sm space-y-4">
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 mr-3 text-indigo-500" />
              <div>
                <p className="font-semibold">Horario</p>
                <p className="text-sm">{cls.schedule}</p>
              </div>
            </div>
            <div className="flex items-center">
              <UserCircleIcon className="w-5 h-5 mr-3 text-indigo-500" />
              <div>
                <p className="font-semibold">Maestro Encargado</p>
                <p className="text-sm">{teacherName}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><UserGroupIcon className="w-5 h-5" /> Matrícula</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <InfoCard icon={<UserGroupIcon className="w-6 h-6 text-indigo-500" />} label="Total" value={enrollment.total} color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800" />
              </div>
              <InfoCard icon={<span className="text-3xl font-black text-rose-400 dark:text-rose-400">♀</span>} label="Femenino" value={enrollment.female} color="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20" />
              <InfoCard icon={<span className="text-3xl font-black text-sky-500 dark:text-sky-400">♂</span>} label="Masculino" value={enrollment.male} color="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20" />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 flex flex-wrap-reverse sm:flex-nowrap justify-end gap-3 p-6 border-t border-white/20 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(cls);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold py-3 px-6 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-500/20"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => onEdit(cls)}
            className="flex-1 sm:flex-none flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
          >
            <PencilIcon className="w-4 h-4 mr-2 text-current" />
            Editar
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};