

import React, { useState, useEffect } from 'react';
import type { Student, Class } from '../types';
import { XIcon, SwitchHorizontalIcon } from './icons';

interface MoveStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: Class[];
  onMoveStudent: (studentId: string, newClassId: string) => void;
}

export const MoveStudentModal: React.FC<MoveStudentModalProps> = ({ isOpen, onClose, student, classes, onMoveStudent }) => {
  const [selectedClassId, setSelectedClassId] = useState('');

  const availableClasses = classes.filter(c => c.id !== student?.classId);

  useEffect(() => {
    if (!isOpen) {
      setSelectedClassId('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student && selectedClassId) {
      onMoveStudent(student.id, selectedClassId);
      onClose();
    }
  };

  if (!isOpen || !student) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mover Estudiante</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          Mover a <span className="font-semibold text-slate-800 dark:text-slate-100">{student.name}</span> a una nueva clase.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="move-class-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nueva Clase
            </label>
            <select
              id="move-class-select"
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
              Mover Estudiante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};