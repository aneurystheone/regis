import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Competency, FundamentalCompetency, CompetencyGroup } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon, XIcon, BoltIcon } from './icons';

interface CompetenciesManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    classCompetencies: Competency[];
    competencyGroups: CompetencyGroup[];
    fundamentalCompetencies: FundamentalCompetency[];
    groupNames: Record<CompetencyGroup, string>;
    onAddCompetencyClick: () => void;
    onEditCompetency: (competency: Competency) => void;
    onDeleteCompetency: (competency: Competency) => void;
    onCopyCompetency: (competency: Competency) => void;
}

export const CompetenciesManagerModal: React.FC<CompetenciesManagerModalProps> = ({
    isOpen,
    onClose,
    classCompetencies,
    competencyGroups,
    fundamentalCompetencies,
    groupNames,
    onAddCompetencyClick,
    onEditCompetency,
    onDeleteCompetency,
    onCopyCompetency
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
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
                        className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10"
                        role="dialog"
                        aria-modal="true"
                    >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                            <BoltIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestión de Competencias</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button
                                onClick={onAddCompetencyClick}
                                className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Añadir Competencia
                            </button>
                        </div>
                        <div className="space-y-6">
                            {competencyGroups.map(group => {
                                const groupCompetencies = classCompetencies.filter(c => {
                                    const fc = fundamentalCompetencies.find(f => f.id === c.fundamentalId);
                                    return fc?.group === group;
                                });

                                if (groupCompetencies.length === 0) return null;

                                return (
                                    <div key={group} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-100 dark:border-slate-700">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-3 border-b border-slate-200 dark:border-slate-700">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{groupNames[group]} (G{group.slice(1)})</h3>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {groupCompetencies.map(comp => (
                                                <div key={comp.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded">{comp.code}</span>
                                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{comp.name}</h4>
                                                            </div>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400">{comp.description}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => onCopyCompetency(comp)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1" title="Duplicar">
                                                                <DocumentDuplicateIcon className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => onEditCompetency(comp)} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1" title="Editar">
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => onDeleteCompetency(comp)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1" title="Eliminar">
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {comp.indicators && comp.indicators.length > 0 && (
                                                        <div className="mt-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Indicadores</p>
                                                            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                                                                {comp.indicators.map(ind => (
                                                                    <li key={ind.id}>{ind.text}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {classCompetencies.length === 0 && (
                                <div className="space-y-6">
                                    {competencyGroups.map(group => {
                                        const groupFundamentals = fundamentalCompetencies.filter(fc => fc.group === group);

                                        if (groupFundamentals.length === 0) return null;

                                        return (
                                            <div key={group} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden opacity-90 border border-slate-100 dark:border-slate-700">
                                                <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{groupNames[group]} (G{group.slice(1)})</h3>
                                                    <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">Pendiente</span>
                                                </div>
                                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {groupFundamentals.map(fc => (
                                                        <div key={fc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-l-4 border-transparent hover:border-indigo-400">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-grow pr-4">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded dashed border border-slate-300 dark:border-slate-600">--</span>
                                                                        <h4 className="font-semibold text-slate-600 dark:text-slate-300 italic">{fc.name}</h4>
                                                                    </div>
                                                                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No se ha definido una competencia específica para esta fundamental.</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={onAddCompetencyClick}
                                                                        className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                                        title="Definir Competencia Específica"
                                                                    >
                                                                        <PencilIcon className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )}
</AnimatePresence>
    );
};
