
import React, { useState, useEffect } from 'react';
import type { Class } from '../types';
import { PencilIcon, XIcon } from './icons';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classId: string, updatedData: Omit<Class, 'id'>) => void;
  classToEdit: Class | null;
}

const subjects = [
  'Lengua Española', 'Matemática', 'Ciencias Sociales', 'Ciencias de la Naturaleza',
  'Biología', 'Química', 'Física', 'Formación Integral Humana y Religiosa',
  'Educación Artística', 'Educación Física', 'Inglés', 'Francés',
  'Informática', 'Contabilidad', 'Mercadeo'
].sort();

const levels = ['Nivel Primario', 'Nivel Secundario'];
const grades = ['1ro', '2do', '3ro', '4to', '5to', '6to'];
const sections = ['A', 'B', 'C', 'D'];
const classColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#78716c'];

export const EditClassModal: React.FC<EditClassModalProps> = ({ isOpen, onClose, onSave, classToEdit }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [schedule, setSchedule] = useState('');
  const [color, setColor] = useState(classColors[0]);
  const [level, setLevel] = useState('');

  // Generate dynamic school years
  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let i = -1; i < 4; i++) {
      const start = currentYear + i - 1;
      list.push(`${start}-${start + 1}`);
    }
    return list;
  }, []);

  useEffect(() => {
    if (classToEdit && isOpen) {
      setName(classToEdit.name);
      setGrade(classToEdit.grade);
      setSection(classToEdit.section);
      setSchoolYear(classToEdit.schoolYear);
      setSchedule(classToEdit.schedule);
      setColor(classToEdit.color);
      setLevel(classToEdit.level || 'Nivel Primario');
    }
  }, [classToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (classToEdit && name.trim() && grade.trim() && section.trim() && schoolYear.trim() && level.trim()) {
      onSave(classToEdit.id, { name, grade, section, schoolYear, schedule, color, level });
      onClose();
    }
  };

  if (!isOpen || !classToEdit) {
    return null;
  }

  const inputBaseClasses = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4 transform transition-all" role="document">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Editar Clase</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors" aria-label="Cerrar modal">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-class-level" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nivel
              </label>
              <select
                id="edit-class-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={`${inputBaseClasses} text-base`}
                required
              >
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="edit-class-subject" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Asignatura
              </label>
              <select
                id="edit-class-subject"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputBaseClasses} text-base`}
                required
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-class-grade" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Grado</label>
            <select
              id="edit-class-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={inputBaseClasses}
              required
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-class-section" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Sección</label>
              <input
                id="edit-class-section"
                list="edit-section-options"
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
                className={inputBaseClasses}
              />
              <datalist id="edit-section-options">
                {sections.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="edit-class-year" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Año Escolar</label>
              <select
                id="edit-class-year"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className={inputBaseClasses}
                required
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="edit-class-schedule" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Horario</label>
            <input id="edit-class-schedule" type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)}
              className={inputBaseClasses}
              placeholder="Ej: Lunes y Miércoles 9:00 - 10:30 AM" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Color de la Clase</label>
            <div className="flex flex-wrap gap-2">
              {classColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full cursor-pointer transition-all duration-150 ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-800' : 'hover:scale-110'}`}
                  aria-label={`Seleccionar color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose}
              className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};