import React, { useState, useEffect } from 'react';
import type { Student, EvaluationPeriod, CompetencyGroup, RecoveryGrade } from '../types';
import { XIcon, AcademicCapIcon } from './icons';
import { useAlert } from '../contexts/ConfirmationContext';

interface AddRecoveryGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    student: Student;
    period: EvaluationPeriod;
    competencyGroup: CompetencyGroup;
    currentScore: number | null;
  } | null;
  onSave: (gradeData: Omit<RecoveryGrade, 'id'>) => Promise<void>;
  onSaveAndContinue?: (gradeData: Omit<RecoveryGrade, 'id'>) => Promise<void>;
}

const groupNames: Record<CompetencyGroup, string> = {
  G1: "Comunicativa",
  G2: "Pensamiento Lógico y Resolución de Problemas",
  G3: "Ética y Desarrollo Personal",
  G4: "Científica y Ambiental"
};

export const AddRecoveryGradeModal: React.FC<AddRecoveryGradeModalProps> = ({ isOpen, onClose, context, onSave, onSaveAndContinue }) => {
  const [score, setScore] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const alert = useAlert();

  useEffect(() => {
    if (!isOpen) {
      setScore('');
    } else if (context && context.currentScore !== null) {
      setScore(context.currentScore.toString());
    }
  }, [isOpen, context]);

  const handleSaveAction = async (isContinue: boolean) => {
    if (context && score.trim() !== '') {
      const numericScore = parseInt(score, 10);
      if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 100) {
        setIsSaving(true);
        try {
          const gradeData = {
            studentId: context.student.id,
            classId: context.student.classId,
            period: context.period,
            competencyGroup: context.competencyGroup,
            score: numericScore
          };
          if (isContinue && onSaveAndContinue) {
            await onSaveAndContinue(gradeData);
          } else {
            await onSave(gradeData);
          }
        } finally {
          setIsSaving(false);
        }
      } else {
        await alert({ title: 'Error', message: 'Por favor, ingrese una calificación válida entre 0 y 100.', type: 'danger' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveAction(false);
  };

  if (!isOpen || !context) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all" role="document">
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
          <div className="flex justify-end gap-3 pt-4 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            {onSaveAndContinue && (
              <button
                type="button"
                onClick={() => handleSaveAction(true)}
                disabled={!score.trim() || isSaving}
                className="flex items-center bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 disabled:opacity-50 transition-colors"
              >
                Guardar y continuar
              </button>
            )}
            <button
              type="submit"
              className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-indigo-600 transition-colors"
              disabled={!score.trim() || isSaving}
            >
              <AcademicCapIcon className="w-5 h-5 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
