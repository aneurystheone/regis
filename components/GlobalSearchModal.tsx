import React, { useState, useMemo, useEffect } from 'react';
import type { Student, EvaluationInstrument, View, Class, Competency, FundamentalCompetency } from '../types';
import { SearchIcon, XIcon, StudentsIcon, DocumentTextIcon, BookOpenIcon, AcademicCapIcon } from './icons';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  instruments: EvaluationInstrument[];
  classes: Class[];
  competencies: Competency[];
  fundamentalCompetencies: FundamentalCompetency[];
  onNavigate: (view: View | 'VIEW_INSTRUMENT_DETAIL', context?: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, students, instruments, classes, competencies, fundamentalCompetencies, onNavigate }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const fundamentalCompetencyMap = useMemo(() => {
    return fundamentalCompetencies.reduce((acc, fc) => {
        acc[fc.id] = fc.name;
        return acc;
    }, {} as Record<string, string>);
  }, [fundamentalCompetencies]);

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return { students: [], instruments: [], classes: [], competencies: [] };
    }
    const lowerCaseQuery = query.toLowerCase();
    const filteredStudents = students.filter(s => s.name.toLowerCase().includes(lowerCaseQuery));
    const filteredInstruments = instruments.filter(i => i.name.toLowerCase().includes(lowerCaseQuery));
    const filteredClasses = classes.filter(c => 
        c.name.toLowerCase().includes(lowerCaseQuery) ||
        c.grade.toLowerCase().includes(lowerCaseQuery) ||
        c.section.toLowerCase().includes(lowerCaseQuery)
    );
    const filteredCompetencies = competencies.filter(c => c.name.toLowerCase().includes(lowerCaseQuery));

    return { students: filteredStudents, instruments: filteredInstruments, classes: filteredClasses, competencies: filteredCompetencies };
  }, [query, students, instruments, classes, competencies]);
  
  const getStudentClassInfo = (student: Student) => {
    const studentClass = classes.find(c => c.id === student.classId);
    if (!studentClass) return '';
    return ` - ${studentClass.grade} ${studentClass.section}`;
  };

  const handleStudentClick = (student: Student) => {
    onNavigate('STUDENT_PROFILE', { studentId: student.id });
  };
  
  const handleInstrumentClick = (instrument: EvaluationInstrument) => {
    onNavigate('VIEW_INSTRUMENT_DETAIL', { instrumentId: instrument.id });
  };

  const handleClassClick = (cls: Class) => {
    onNavigate('STUDENTS', { classId: cls.id });
  };

  const handleCompetencyClick = (competency: Competency) => {
    onNavigate('GRADEBOOK_COMPETENCIES', { competencyId: competency.id });
  };

  if (!isOpen) return null;

  const hasResults = searchResults.students.length > 0 || searchResults.instruments.length > 0 || searchResults.classes.length > 0 || searchResults.competencies.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-12 md:pt-20" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl m-4 transform transition-all" role="document" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
            <SearchIcon className="w-5 h-5 text-slate-400 mr-3"/>
            <input 
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar estudiantes, clases, evaluaciones..."
                className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                autoFocus
            />
             <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Cerrar búsqueda">
                <XIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
            {query.trim() && hasResults ? (
                <div>
                    {searchResults.students.length > 0 && (
                        <div className="p-4">
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Estudiantes</h3>
                            <ul className="space-y-1">
                                {searchResults.students.map(s => (
                                    <li key={s.id} onClick={() => handleStudentClick(s)} className="flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                        <StudentsIcon className="w-5 h-5 mr-3 text-indigo-500"/>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{s.name}
                                            <span className="text-slate-500 dark:text-slate-400 text-sm">{getStudentClassInfo(s)}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {searchResults.instruments.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Instrumentos de Evaluación</h3>
                            <ul className="space-y-1">
                                {searchResults.instruments.map(i => (
                                    <li key={i.id} onClick={() => handleInstrumentClick(i)} className="flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                        <DocumentTextIcon className="w-5 h-5 mr-3 text-teal-500"/>
                                        <div>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{i.name}</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{i.type} - {i.period}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {searchResults.classes.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Clases</h3>
                            <ul className="space-y-1">
                                {searchResults.classes.map(c => (
                                    <li key={c.id} onClick={() => handleClassClick(c)} className="flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                        <BookOpenIcon className="w-5 h-5 mr-3 text-blue-500"/>
                                        <div>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{c.grade} {c.section}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {searchResults.competencies.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Competencias</h3>
                            <ul className="space-y-1">
                                {searchResults.competencies.map(c => (
                                    <li key={c.id} onClick={() => handleCompetencyClick(c)} className="flex items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                        <AcademicCapIcon className="w-5 h-5 mr-3 text-green-500"/>
                                        <div>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{fundamentalCompetencyMap[c.fundamentalId]}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <p>{query.trim() ? `No se encontraron resultados para "${query}"` : 'Comience a escribir para buscar...'}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};