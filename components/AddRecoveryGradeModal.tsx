import React, { useState, useEffect } from 'react';
import type { Student, EvaluationPeriod, CompetencyGroup, RecoveryGrade } from '../types';
import { XIcon, AcademicCapIcon } from './icons';

interface AddRecoveryGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    student: Student;
    period: EvaluationPeriod;
    competencyGroup: CompetencyGroup;
    currentScore: number | null;
  } | null;
  onSave: (gradeData: Omit<RecoveryGrade, 'id'>) => void;
}

const groupNames: Record<CompetencyGroup, string> = {
    G1: "Comunicativa",
    G2: "Pensamiento Lógico y Resolución de Problemas",
    G3: "Ética y Desarrollo Personal",
    G4: "Científica y Ambiental"
};

export const AddRecoveryGradeModal: React.FC<AddRecoveryGradeModalProps> = ({ isOpen, onClose, context, onSave }) => {
  const [score, setScore] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setScore('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (context && score.trim() !== '') {
        const numericScore = parseInt(score, 10);
        if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 100) {
            onSave({
                studentId: context.student.id,
                classId: context.student.classId,
                period: context.period,
                competencyGroup: context.competencyGroup,
                score: numericScore
            });
        } else {
            alert("Por favor, ingrese una calificación válida entre 0 y 100.");
        }
    }
  };

  if (!isOpen || !context) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all" role="document">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Recuperación Pedagógica</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Cerrar modal">
            <XIcon />
          </button>
        </div>
        <div className="mb-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p><strong>Estudiante:</strong> {context.student.name}</p>
            <p><strong>Período:</strong> {context.period}</p>
            <p><strong>Grupo de Competencia:</strong> {groupNames[context.competencyGroup]}</p>
            <p><strong>Calificación Actual:</strong> <span className={context.currentScore !== null && context.currentScore < 70 ? 'font-bold text-red-500' : ''}>{context.currentScore ?? 'N/A'}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recovery-score" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nueva Calificación (RP)
            </label>
            <input
              id="recovery-score"
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0 - 100"
              min="0"
              max="100"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400"
              disabled={!score.trim()}
            >
              <AcademicCapIcon className="w-5 h-5 mr-2" />
              Guardar Calificación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
