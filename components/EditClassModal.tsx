import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PencilIcon, XIcon } from './icons';
import type { Class, SchoolGroup } from '../types';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classId: string, updatedData: Partial<Class>) => void;
  classToEdit: Class | null;
  classes?: Class[]; 
  userGroups?: SchoolGroup[];
}

const primarioSubjects = [
  'Lengua Española', 'Matemática', 'Ciencias Sociales', 'Ciencias de la Naturaleza',
  'Formación Integral Humana y Religiosa', 'Educación Artística', 'Educación Física', 'Inglés'
];

const secundarioSubjects = [
  'Lengua Española', 'Matemática', 'Ciencias Sociales', 'Ciencias de la Naturaleza',
  'Biología', 'Química', 'Física', 'Formación Integral Humana y Religiosa',
  'Educación Artística', 'Educación Física', 'Inglés', 'Francés',
  'Informática', 'Contabilidad', 'Mercadeo'
];

const levels = ['Nivel Primario', 'Nivel Secundario'];
const grades = ['1ro', '2do', '3ro', '4to', '5to', '6to'];
const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
const classColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#78716c'];

export const EditClassModal: React.FC<EditClassModalProps> = ({ 
  isOpen, onClose, onSave, classToEdit 
}) => {
  const [level, setLevel] = useState('Nivel Primario');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [schedule, setSchedule] = useState('');
  const [color, setColor] = useState(classColors[0]);
  const [teacher, setTeacher] = useState('');

  const availableSubjects = level === 'Nivel Primario' ? primarioSubjects : secundarioSubjects;

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let i = -1; i < 4; i++) {
      const start = currentYear + i - 1;
      list.push(`${start}-${start + 1}`);
    }
    return list;
  }, []);

  // Load selected class data
  useEffect(() => {
    if (classToEdit && isOpen) {
      setLevel(classToEdit.level || 'Nivel Primario');
      setName(classToEdit.name || '');
      setGrade(classToEdit.grade || '');
      setSection(classToEdit.section || '');
      setSchoolYear(classToEdit.schoolYear || '');
      setSchedule(classToEdit.schedule || '');
      setColor(classToEdit.color || classColors[0]);
      setTeacher(classToEdit.teacher || '');
    }
  }, [classToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (classToEdit && (name?.trim() || '') && (grade?.trim() || '') && (section?.trim() || '') && (schoolYear?.trim() || '') && (level?.trim() || '')) {
      
      const payload: Partial<Class> = { 
        name, grade, section, schoolYear, schedule, color, level, teacher,
        // Mantener el grupo original si existía (evitando romper referencias)
        groupId: classToEdit.groupId
      };
      
      onSave(classToEdit.id, payload);
      onClose();
    }
  };

  const inputBaseClasses = "w-full px-3 py-2 text-sm border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium";

  return (
    <AnimatePresence>
      {isOpen && classToEdit && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-neutral-50 dark:bg-slate-900 rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar relative z-10"
            role="dialog"
            aria-modal="true"
          >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Clase</h2>
            <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Level & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                  Nivel
                </label>
                <select
                  value={level}
                  onChange={(e) => {
                    const newLevel = e.target.value;
                    setLevel(newLevel);
                    setName(newLevel === 'Nivel Primario' ? primarioSubjects[0] : secundarioSubjects[0]);
                  }}
                  className={inputBaseClasses}
                  required
                >
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                  Asignatura
                </label>
                <select
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputBaseClasses}
                  required
                >
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Grade & Section & Year */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Grado</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputBaseClasses} required>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Sección</label>
                <select value={section} onChange={(e) => setSection(e.target.value)} className={inputBaseClasses} required>
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Año</label>
                <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className={inputBaseClasses} required>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Teacher & Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                  Maestro Encargado
                </label>
                <input 
                  type="text" 
                  value={teacher} 
                  onChange={(e) => setTeacher(e.target.value)}
                  className={inputBaseClasses}
                  placeholder="Ej: Lic. Adela Ramírez" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                  Horario <span className="text-slate-400 normal-case font-normal">(opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={schedule} 
                  onChange={(e) => setSchedule(e.target.value)}
                  className={inputBaseClasses}
                  placeholder="Ej: Lu y Miércoles 9:00 AM" 
                />
              </div>
            </div>

            {/* Color Carousel */}
            <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Color de la Clase</label>
              
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-1 pt-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {classColors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`shrink-0 snap-center w-7 h-7 rounded-full cursor-pointer transition-all duration-200 shadow-sm ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110' : 'ring-1 ring-slate-200 dark:ring-slate-700 shadow-inner'}`}
                    aria-label={`Seleccionar color ${c}`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
              <button 
                type="button" 
                onClick={onClose}
                className="w-full sm:w-auto text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold py-3 px-6 rounded-2xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-3 px-8 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                disabled={!(name?.trim()) || !(grade?.trim()) || !(schoolYear?.trim()) || !(section?.trim())}
              >
                <PencilIcon className="w-5 h-5" />
                Guardar Cambios
              </button>
            </div>
          </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};