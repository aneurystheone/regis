import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon, DocumentDuplicateIcon } from './icons';
import type { Class, Competency } from '../types';

interface CopyCompetencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    competency: Competency | null;
    classes: Class[];
    onCopy: (competency: Competency, targetClassIds: string[]) => void;
}

export const CopyCompetencyModal: React.FC<CopyCompetencyModalProps> = ({ isOpen, onClose, competency, classes, onCopy }) => {
    const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

    const availableClasses = useMemo(() => {
        if (!competency) return [];
        return classes.filter(c => c.id !== competency.classId);
    }, [classes, competency]);

    const handleToggleClass = (classId: string) => {
        const newSelected = new Set(selectedClassIds);
        if (newSelected.has(classId)) {
            newSelected.delete(classId);
        } else {
            newSelected.add(classId);
        }
        setSelectedClassIds(newSelected);
    };

    const handleCopy = () => {
        if (competency && selectedClassIds.size > 0) {
            onCopy(competency, Array.from(selectedClassIds));
            setSelectedClassIds(new Set());
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && competency && (
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
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md m-4 p-6 border border-slate-200 dark:border-slate-700 relative z-10 overflow-hidden"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <DocumentDuplicateIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                Copiar Competencia
                            </h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                Selecciona las clases a las que deseas copiar la competencia:
                            </p>
                            <div className="font-medium text-slate-800 dark:text-slate-100 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 mb-4">
                                {competency.name}
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6 pr-2 custom-scrollbar">
                            {availableClasses.length > 0 ? (
                                availableClasses.map(cls => (
                                    <label key={cls.id} className="flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedClassIds.has(cls.id)}
                                            onChange={() => handleToggleClass(cls.id)}
                                            className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                                        />
                                        <div className="ml-3">
                                            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{cls.name}</span>
                                            <span className="block text-xs text-slate-500 dark:text-slate-400">{cls.grade} - {cls.section}</span>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-4">No hay otras clases disponibles.</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCopy}
                                disabled={selectedClassIds.size === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/30"
                            >
                                Copiar ({selectedClassIds.size})
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
