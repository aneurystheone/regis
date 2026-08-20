

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Student, Class } from '../types';
import { XIcon, SwitchHorizontalIcon } from './icons';

interface MoveStudentBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: Class[];
  onMoveStudents: (studentIds: string[], newClassId: string) => void;
}

export const MoveStudentBulkModal: React.FC<MoveStudentBulkModalProps> = ({ isOpen, onClose, students, classes, onMoveStudents }) => {
  const [selectedClassId, setSelectedClassId] = useState('');

  const availableClasses = useMemo(() => {
    if (!students || students.length === 0) return [];
    const studentClassIds = [...new Set(students.map(s => s.classId))];
    // If all selected students are from the same class, don't show that class as a destination
    if (studentClassIds.length === 1) {
      return classes.filter(c => c.id !== studentClassIds[0]);
    }
    // Otherwise, all classes are valid destinations
    return classes;
  }, [students, classes]);

  useEffect(() => {
    // Reset selection when modal opens or available classes change
    if (isOpen) {
      setSelectedClassId('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (students.length > 0 && selectedClassId) {
      const studentIds = students.map(s => s.id);
      onMoveStudents(studentIds, selectedClassId);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && students.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mover Estudiantes</h2>
              <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <p className="mb-4 text-slate-600 dark:text-slate-300">
              Mover a <span className="font-semibold text-slate-800 dark:text-slate-100">{students.length} estudiantes</span> a una nueva clase.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="move-class-select-bulk" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Nueva Clase
                </label>
                <select
                  id="move-class-select-bulk"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="" disabled>Seleccione una clase...</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.grade.replace(' Grado', '')} {c.section} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-slate-400"
                  disabled={!selectedClassId}
                >
                  <SwitchHorizontalIcon className="w-5 h-5 mr-2" />
                  Mover Estudiantes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};