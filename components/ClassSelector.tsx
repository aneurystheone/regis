
import React from 'react';
import type { Class } from '../types';
import { ChevronDownIcon } from './icons';

interface ClassSelectorProps {
  classes: Class[];
  selectedClassId: string | null;
  onSelectClass: (classId: string) => void;
  label?: string;
  className?: string;
  size?: 'small' | 'default' | 'large';
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({ classes, selectedClassId, onSelectClass, label, className = '', size = 'large' }) => {
  if (classes.length === 0 || !selectedClassId) return null;

  const sizeClasses = {
    small: 'py-2 pl-3 pr-8 text-sm rounded-lg border',
    default: 'py-2.5 pl-3 pr-10 text-sm sm:text-base rounded-lg border', // Matches standard inputs better
    large: 'py-3 pl-4 pr-12 text-base sm:text-lg md:text-xl rounded-xl border-2'
  };

  const iconSizes = {
      small: 'w-4 h-4 right-2',
      default: 'w-5 h-5 right-3',
      large: 'w-6 h-6 right-4'
  };

  return (
    <div className={className}>
      {label && <label htmlFor="class-selector" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">{label}</label>}
      <div className="relative group">
        <select
          id="class-selector"
          value={selectedClassId}
          onChange={(e) => onSelectClass(e.target.value)}
          className={`appearance-none w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer border-slate-200 dark:border-slate-700 ${sizeClasses[size]}`}
          aria-label="Seleccionar clase"
        >
          {classes.map(c => (
            <option key={c.id} value={c.id}>
                {c.grade.replace(' Grado', '')} {c.section} - {c.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className={`text-slate-500 dark:text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:text-indigo-600 dark:group-hover:text-indigo-400 ${iconSizes[size]}`} />
      </div>
    </div>
  );
};
