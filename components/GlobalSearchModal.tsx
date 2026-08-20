import React, { useState, useMemo, useEffect } from 'react';
import type { Student, EvaluationInstrument, View, Class, Competency, FundamentalCompetency } from '../types';
import { Search, X, Users, FileText, BookOpen, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    instruments: EvaluationInstrument[];
    classes: Class[];
    competencies: Competency[];
    fundamentalCompetencies: FundamentalCompetency[];
    deletedStudents: Student[];
    onNavigate: (view: View | 'VIEW_INSTRUMENT_DETAIL', context?: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
    isOpen, onClose, students, instruments, classes, competencies,
    fundamentalCompetencies, deletedStudents, onNavigate
}) => {
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

        // Pre-compute deleted student IDs for O(1) lookups
        const deletedStudentIds = new Set(deletedStudents.map(ds => ds.id));

        // Optimize search to completely ignore deleted students & orphaned students
        const filteredStudents = students.filter(s =>
            !deletedStudentIds.has(s.id) &&
            classes.some(c => c.id === s.classId) &&
            s.name.toLowerCase().includes(lowerCaseQuery)
        );

        const filteredInstruments = instruments.filter(i => i.name.toLowerCase().includes(lowerCaseQuery));
        const filteredClasses = classes.filter(c =>
            c.name.toLowerCase().includes(lowerCaseQuery) ||
            c.grade.toLowerCase().includes(lowerCaseQuery) ||
            c.section.toLowerCase().includes(lowerCaseQuery)
        );
        const filteredCompetencies = competencies.filter(c => c.name.toLowerCase().includes(lowerCaseQuery));

        return { students: filteredStudents, instruments: filteredInstruments, classes: filteredClasses, competencies: filteredCompetencies };
    }, [query, students, instruments, classes, competencies, deletedStudents]);

    const getStudentClassInfo = (student: Student) => {
        const studentClass = classes.find(c => c.id === student.classId);
        if (!studentClass) return ' - (En Papelera)';
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

    const hasResults = searchResults.students.length > 0 || searchResults.instruments.length > 0 || searchResults.classes.length > 0 || searchResults.competencies.length > 0;

    // Animation Variants
    const staggerContainer = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const listItemVariant = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-20" aria-modal="true" role="dialog">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="bg-neutral-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl m-4 overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800"
                        role="document"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header / Search Input */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center bg-white dark:bg-slate-800/50">
                            <Search className="w-6 h-6 text-indigo-500 mr-3 shrink-0" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Buscar estudiantes, clases, evaluaciones..."
                                className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-lg font-medium"
                                autoFocus
                            />
                            <button
                                onClick={onClose}
                                className="p-2 ml-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
                                aria-label="Cerrar búsqueda"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Results Body */}
                        <div className="max-h-[60vh] overflow-y-auto bg-white/50 dark:bg-slate-900/50">
                            {query.trim() && hasResults ? (
                                <motion.div
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="show"
                                    className="pb-4"
                                >
                                    {searchResults.students.length > 0 && (
                                        <div className="p-4">
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 ml-2">Estudiantes</h3>
                                            <ul className="space-y-2">
                                                {searchResults.students.map(s => (
                                                    <motion.li
                                                        variants={listItemVariant}
                                                        key={s.id}
                                                        onClick={() => handleStudentClick(s)}
                                                        className="flex items-center p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group"
                                                    >
                                                        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                                            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{s.name}</span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{getStudentClassInfo(s)}</span>
                                                        </div>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {searchResults.instruments.length > 0 && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 ml-2">Instrumentos de Evaluación</h3>
                                            <ul className="space-y-2">
                                                {searchResults.instruments.map(i => (
                                                    <motion.li
                                                        variants={listItemVariant}
                                                        key={i.id}
                                                        onClick={() => handleInstrumentClick(i)}
                                                        className="flex items-center p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group"
                                                    >
                                                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                                            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{i.name}</span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{i.type} - {i.period}</span>
                                                        </div>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {searchResults.classes.length > 0 && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 ml-2">Clases</h3>
                                            <ul className="space-y-2">
                                                {searchResults.classes.map(c => (
                                                    <motion.li
                                                        variants={listItemVariant}
                                                        key={c.id}
                                                        onClick={() => handleClassClick(c)}
                                                        className="flex items-center p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group"
                                                    >
                                                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                                            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{c.name}</span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{c.grade} {c.section}</span>
                                                        </div>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {searchResults.competencies.length > 0 && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 ml-2">Competencias</h3>
                                            <ul className="space-y-2">
                                                {searchResults.competencies.map(c => (
                                                    <motion.li
                                                        variants={listItemVariant}
                                                        key={c.id}
                                                        onClick={() => handleCompetencyClick(c)}
                                                        className="flex items-center p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group"
                                                    >
                                                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-4 group-hover:scale-110 transition-transform">
                                                            <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{c.name}</span>
                                                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{fundamentalCompetencyMap[c.fundamentalId]}</span>
                                                        </div>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="p-12 flex flex-col items-center justify-center text-center">
                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                                        <Search className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                                        {query.trim() ? `No se encontraron resultados para "${query}"` : 'Escribe para buscar cualquier elemento...'}
                                    </p>
                                    {!query.trim() && (
                                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                                            Busca por nombre de estudiante, clase o evaluación.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};