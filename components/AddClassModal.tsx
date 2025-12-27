
import React, { useState, useEffect } from 'react';
import { PlusIcon, XIcon, ExclamationIcon } from './icons';
import type { Class } from '../types';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClass: (name: string, grade: string, section: string, schoolYear: string, level: string) => void;
  classes: Class[];
}

const subjects = [
  'Lengua Española', 'Matemática', 'Ciencias Sociales', 'Ciencias de la Naturaleza', 
  'Biología', 'Química', 'Física', 'Formación Integral Humana y Religiosa',
  'Educación Artística', 'Educación Física', 'Inglés', 'Francés', 
  'Informática', 'Contabilidad', 'Mercadeo'
].sort();

const levels = ['Nivel Inicial', 'Nivel Primario', 'Nivel Secundario'];
const grades = ['1ro', '2do', '3ro', '4to', '5to', '6to'];
const sections = ['A', 'B', 'C', 'D', 'E', 'F'];

export const AddClassModal: React.FC<AddClassModalProps> = ({ isOpen, onClose, onAddClass, classes }) => {
  const [subject, setSubject] = useState(subjects[0]);
  const [level, setLevel] = useState('Nivel Primario');
  const [grade, setGrade] = useState('1ro');
  const [section, setSection] = useState('A');
  const [schoolYear, setSchoolYear] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Generate dynamic school years
  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    // Generate a range of years around current year
    const list = [];
    for (let i = -1; i < 4; i++) {
        const start = currentYear + i - 1;
        list.push(`${start}-${start + 1}`);
    }
    return list;
  }, []);

  useEffect(() => {
    if (isOpen) {
        // Set default year relative to current month
        const now = new Date();
        const currentY = now.getFullYear();
        // If month is after June, academic year starts this year (e.g., Aug 2024 -> 2024-2025)
        // If month is before July, academic year started previous year (e.g., Feb 2025 -> 2024-2025)
        const startYear = now.getMonth() > 5 ? currentY : currentY - 1;
        setSchoolYear(`${startYear}-${startYear + 1}`);
        
        setSubject(subjects[0]);
        setLevel('Nivel Primario');
        setGrade('1ro');
        setSection('A');
        setError(null);
    }
  }, [isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (subject.trim() && grade.trim() && section.trim() && schoolYear.trim() && level.trim()) {
      
      // Check for duplicates
      const isDuplicate = classes.some(c => 
        c.name === subject && 
        c.grade === grade && 
        c.section === section && 
        c.schoolYear === schoolYear &&
        c.level === level
      );

      if (isDuplicate) {
        setError(`Ya existe la clase: ${grade} ${section} - ${subject} (${schoolYear}).`);
        return;
      }

      onAddClass(subject, grade, section, schoolYear, level);
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const inputBaseClasses = "w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Añadir Nueva Clase</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg flex items-center text-sm">
            <ExclamationIcon className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="class-level" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nivel
                </label>
                <select
                id="class-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={inputBaseClasses}
                required
                >
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="class-subject" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Asignatura
                </label>
                <select
                id="class-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputBaseClasses}
                required
                >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label htmlFor="class-grade" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Grado
                </label>
                <select
                id="class-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className={inputBaseClasses}
                required
                >
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="class-section" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Sección
                </label>
                <select
                id="class-section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className={inputBaseClasses}
                required
                >
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="class-year" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Año Escolar
                </label>
                <select
                id="class-year"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className={inputBaseClasses}
                required
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
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
              disabled={!subject.trim() || !grade.trim() || !schoolYear.trim() || !section.trim()}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Añadir Clase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
