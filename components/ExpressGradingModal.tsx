
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { EvaluationInstrument, Student, Grade } from '../types';
import { XIcon } from './icons';

interface ExpressGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: EvaluationInstrument | null;
  students: Student[];
  grades: Grade[];
  onSaveGrades: (instrumentId: string, updatedGrades: { studentId: string; score: number | null, criteriaScores?: Record<string, boolean | number | null> }[]) => void;
  initialFocusStudentId?: string | null;
}

export const ExpressGradingModal: React.FC<ExpressGradingModalProps> = ({ isOpen, onClose, instrument, students, grades, onSaveGrades, initialFocusStudentId }) => {
  const [localGrades, setLocalGrades] = useState<Record<string, { score: string; criteria: Record<string, boolean | number | null> }>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const classStudents = useMemo(() => {
    if (!instrument) return [];
    return students.filter(s => s.classId === instrument.classId).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, instrument]);

  const hasCriteria = instrument && instrument.criteria && instrument.criteria.length > 0;

  useEffect(() => {
    if (instrument && isOpen) {
      const initialGrades: typeof localGrades = {};
      for (const student of classStudents) {
        const existingGrade = grades.find(g => g.studentId === student.id && g.instrumentId === instrument.id);
        initialGrades[student.id] = {
          score: existingGrade?.score?.toString() ?? '',
          criteria: existingGrade?.criteriaScores ?? {}
        };
      }
      setLocalGrades(initialGrades);
    }
  }, [instrument, isOpen, grades, classStudents]);

  // Focus effect separated to ensure it runs after rendering inputs
  useEffect(() => {
    if (isOpen && initialFocusStudentId) {
      // Small timeout to ensure the DOM is ready
      setTimeout(() => {
        const el = inputRefs.current[initialFocusStudentId];
        if (el) {
          el.focus();
          el.select();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [isOpen, initialFocusStudentId]); // Removed localGrades to prevent re-focusing on type

  const handleScoreChange = (studentId: string, value: string) => {
    setLocalGrades(prev => ({ ...prev, [studentId]: { ...prev[studentId], score: value } }));
  };

  const handleCriteriaChange = (studentId: string, criterionId: string, value: boolean | number) => {
    setLocalGrades(prev => {
      const studentData = { ...prev[studentId] };
      const updatedCriteria = { ...studentData.criteria, [criterionId]: value };

      let updatedScore = studentData.score;

      // Auto-calculate score for Lista de Cotejo
      if (instrument?.type === 'Lista de Cotejo' && instrument.criteria) {
        const totalCriteriaCount = instrument.criteria.length;
        const checkedCount = Object.values(updatedCriteria).filter(v => v === true).length;

        if (totalCriteriaCount > 0) {
          // Formula: (Checked / Total) * totalPoints
          const calculatedScore = (checkedCount / totalCriteriaCount) * instrument.totalPoints;
          // Round to 1 decimal place or just use Math.round? Let's use 1 decimal place for better precision
          updatedScore = (Math.round(calculatedScore * 10) / 10).toString();
        }
      }

      return {
        ...prev,
        [studentId]: {
          ...studentData,
          score: updatedScore,
          criteria: updatedCriteria
        }
      };
    });
  }

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextStudent = classStudents[currentIndex + 1];
      if (nextStudent) {
        const nextInput = inputRefs.current[nextStudent.id];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instrument) return;

    const updatedGrades = Object.keys(localGrades).map((studentId) => {
      const gradeData = localGrades[studentId];
      const score = gradeData.score === '' ? null : parseInt(gradeData.score, 10);
      const finalScore = score !== null && !isNaN(score) ? Math.min(Math.max(score, 0), instrument.totalPoints) : null;
      return { studentId, score: finalScore, criteriaScores: gradeData.criteria };
    });

    onSaveGrades(instrument.id, updatedGrades);
    onClose();
  };

  const renderSimpleGrading = () => (
    classStudents.map((student, index) => (
      <div key={student.id} className="grid grid-cols-3 items-center gap-4">
        <label htmlFor={`grade-${student.id}`} className="col-span-2 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{student.name}</label>
        <input
          ref={el => { inputRefs.current[student.id] = el; }}
          id={`grade-${student.id}`} type="number" value={localGrades[student.id]?.score ?? ''}
          onChange={(e) => handleScoreChange(student.id, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          max={instrument!.totalPoints} min={0}
          placeholder="-"
          className="col-span-1 w-full text-center border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
    ))
  );

  const renderCriteriaGrading = () => (
    <table className="w-full text-sm text-left">
      <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
        <tr>
          <th className="font-semibold p-2 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">Estudiante</th>
          {instrument?.criteria?.map(c => <th key={c.id} className="font-semibold p-2 text-center w-24 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">{c.text}</th>)}
        </tr>
      </thead>
      <tbody>
        {classStudents.map(student => (
          <tr key={student.id} className="border-t border-slate-200 dark:border-slate-700">
            <td className="p-2 font-medium text-slate-700 dark:text-slate-200">{student.name}</td>
            {instrument?.criteria?.map(c => (
              <td key={c.id} className="p-2 text-center">
                {instrument.type === 'Lista de Cotejo' && (
                  <input type="checkbox" checked={!!localGrades[student.id]?.criteria[c.id]} onChange={e => handleCriteriaChange(student.id, c.id, e.target.checked)}
                    className="h-5 w-5 bg-slate-100 dark:bg-slate-700 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 dark:focus:ring-offset-slate-800" />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!isOpen || !instrument) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl m-4 transform transition-all flex flex-col" style={{ maxHeight: '90vh' }} role="document">
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Calificación Rápida</h2>
            <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal"><XIcon /></button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">{instrument.name}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Total de Puntos: {instrument.totalPoints}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2">
          <div className="space-y-3">
            {hasCriteria ? renderCriteriaGrading() : renderSimpleGrading()}
            {classStudents.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-4">No hay estudiantes en esta clase.</p>}
          </div>

          <div className="flex justify-end gap-4 pt-6 mt-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors">Cancelar</button>
            <button type="submit" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">Guardar Calificaciones</button>
          </div>
        </form>
      </div>
    </div>
  );
};
