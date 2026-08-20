import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { EvaluationInstrument, EvaluationPeriod, CompetencyGroup } from '../types';
import { PlusIcon, ChevronDownIcon, DocumentTextIcon, PencilIcon, BoltIcon, TrashIcon, XIcon, DocumentDuplicateIcon, SparklesIcon, ClockIcon, LayoutGridIcon, ListIcon } from './icons';
import { useConfirm } from '../contexts/ConfirmationContext';
import type { Class } from '../types';

interface InstrumentsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    classInstruments: EvaluationInstrument[];
    evaluationPeriods: EvaluationPeriod[];
    competencyGroups: CompetencyGroup[];
    competencyToGroupMap: Map<string, CompetencyGroup>;
    groupNames: Record<CompetencyGroup, string>;
    onAddInstrumentClick: (prefill?: { period?: EvaluationPeriod, competencyIds?: string[] }) => void;
    onEditInstrumentClick: (instrument: EvaluationInstrument) => void;
    onViewInstrumentDetails: (instrument: EvaluationInstrument) => void;
    onExpressGradingClick: (instrument: EvaluationInstrument) => void;
    onDeleteInstrument: (instrumentId: string) => void;
    onReplicateInstrument?: (instrumentId: string, targetClassIds: string[]) => void;
    classes?: Class[];
    selectedClassId?: string | null;
    initialPeriod?: EvaluationPeriod;
}

export const InstrumentsManagerModal: React.FC<InstrumentsManagerModalProps> = ({
    isOpen,
    onClose,
    classInstruments,
    evaluationPeriods,
    competencyGroups,
    competencyToGroupMap,
    groupNames,
    onAddInstrumentClick,
    onEditInstrumentClick,
    onViewInstrumentDetails,
    onExpressGradingClick,
    onDeleteInstrument,
    onReplicateInstrument,
    classes = [],
    selectedClassId,
    initialPeriod
}) => {
    const [activePeriod, setActivePeriod] = useState<EvaluationPeriod>(initialPeriod || evaluationPeriods[0] || 'P1');
    const [expandedInstrumentId, setExpandedInstrumentId] = useState<string | null>(null);
    const [showGroupDividers, setShowGroupDividers] = useState(false);
    const [replicateTarget, setReplicateTarget] = useState<EvaluationInstrument | null>(null);
    const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);
    const confirm = useConfirm();

    React.useEffect(() => {
        if (isOpen && initialPeriod) {
            setActivePeriod(initialPeriod);
        }
    }, [isOpen, initialPeriod]);

    const currentClass = classes.find(c => c.id === selectedClassId);
    const isPrimario = currentClass?.level?.toLowerCase().includes('primari');

    const renderInstrumentCard = (inst: EvaluationInstrument) => {
        const isExpanded = expandedInstrumentId === inst.id;
        const firstCompId = inst.competencyIds[0];
        const groupCode = firstCompId ? (competencyToGroupMap.get(firstCompId) || '???') : '???';
        const pillCodePrefix = isPrimario ? 'GP' : 'PC';
        const pillCode = groupCode.startsWith('G') ? `${pillCodePrefix}${groupCode.slice(1)}` : groupCode;

        return (
            <div
                key={inst.id}
                onClick={() => setExpandedInstrumentId(isExpanded ? null : inst.id)}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md border ${isExpanded ? 'border-indigo-300 dark:border-indigo-600 ring-2 ring-indigo-500/10' : 'border-slate-100 dark:border-slate-700'} group/card relative overflow-hidden flex flex-col cursor-pointer transition-all duration-300`}
            >
                <div className={`h-1 w-full ${isExpanded ? 'bg-indigo-600' : 'bg-indigo-500/80'}`}></div>

                <div className="p-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className={`font-bold text-slate-800 dark:text-slate-100 leading-tight transition-all ${isExpanded ? 'text-base mb-2' : 'text-sm line-clamp-2'}`} title={inst.name}>
                            {inst.syncGroupId && <SparklesIcon className="w-3.5 h-3.5 inline mr-1 text-indigo-500 animate-pulse" title="Sincronizado" />}
                            {inst.name}
                        </h3>
                        <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded border transition-all ${isExpanded ? 'text-sm bg-indigo-600 text-white' : 'text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50'}`}>
                            {inst.totalPoints} pts
                        </span>
                    </div>

                    {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 transition-all duration-300">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-tight bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                                    {inst.type}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-tight bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                                    {pillCode}
                                </span>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {new Date(inst.date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{inst.competencyIds.length} Comp.</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => onEditInstrumentClick(inst)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="Editar"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onViewInstrumentDetails(inst)}
                                    className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="Detalles"
                                >
                                    <DocumentTextIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onExpressGradingClick(inst)}
                                    className="p-1.5 text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors"
                                    title="Calificar"
                                >
                                    <BoltIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedTargetClassIds([]);
                                        setReplicateTarget(inst);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    title="Replicar a otras secciones"
                                >
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={async () => {
                                        const isConfirmed = await confirm({
                                            title: 'Eliminar instrumento',
                                            message: `¿Eliminar el instrumento "${inst.name}"? Las calificaciones asociadas también serán eliminadas.`,
                                            type: 'danger',
                                            confirmText: 'Eliminar',
                                        });
                                        if (isConfirmed) {
                                            onDeleteInstrument(inst.id);
                                        }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    title="Eliminar"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="inst-manager-wrapper"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        key="inst-manager-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    <motion.div
                        key="inst-manager-card"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                                    <DocumentTextIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestión de Instrumentos</h2>
                                    {currentClass && (
                                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                            {currentClass.grade} {currentClass.section} - {currentClass.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                                aria-label="Cerrar modal"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <button
                                                onClick={() => setShowGroupDividers(true)}
                                                className={`p-1.5 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold ${showGroupDividers ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                                title="Vista por grupos"
                                            >
                                                <LayoutGridIcon className="w-4 h-4" />
                                                <span className="hidden sm:inline">Grupos</span>
                                            </button>
                                            <button
                                                onClick={() => setShowGroupDividers(false)}
                                                className={`p-1.5 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold ${!showGroupDividers ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                                title="Vista de lista plana"
                                            >
                                                <ListIcon className="w-4 h-4" />
                                                <span className="hidden sm:inline">Lista</span>
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <select
                                                value={activePeriod}
                                                onChange={(e) => setActivePeriod(e.target.value as EvaluationPeriod)}
                                                className="appearance-none bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 pl-4 pr-10 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 shadow-sm"
                                            >
                                                {evaluationPeriods.map(p => (
                                                    <option key={p} value={p}>Período {p.slice(1)}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onAddInstrumentClick({ period: activePeriod })}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-95 flex items-center gap-1.5 font-bold text-xs"
                                        title="Nuevo Instrumento"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span>Nuevo Instrumento</span>
                                    </button>
                                </div>

                                {classInstruments.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                        <p className="mb-2">No hay instrumentos de evaluación creados.</p>
                                        <button onClick={() => onAddInstrumentClick({ period: activePeriod })} className="text-indigo-600 hover:underline font-medium">Crear el primero</button>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {(() => {
                                            const hasInstrumentsInPeriod = classInstruments.some(i => i.period === activePeriod);
                                            if (!hasInstrumentsInPeriod) {
                                                return (
                                                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <ClockIcon className="w-8 h-8 text-slate-400" />
                                                        </div>
                                                        <p className="text-slate-500 dark:text-slate-400 mb-4">No hay instrumentos registrados en el Período {activePeriod.slice(1)}.</p>
                                                        <button
                                                            onClick={() => onAddInstrumentClick({ period: activePeriod })}
                                                            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline font-bold transition-all"
                                                        >
                                                            <PlusIcon className="w-4 h-4 mr-2" />
                                                            Crear Instrumento
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return showGroupDividers ? (
                                                <div className="space-y-6">
                                                    {competencyGroups.map(group => {
                                                        const groupInstruments = classInstruments.filter(inst => {
                                                            return inst.period === activePeriod && inst.competencyIds.some(cid => competencyToGroupMap.get(cid) === group);
                                                        });

                                                        if (groupInstruments.length === 0) return null;
                                                        const pillCodePrefix = isPrimario ? 'GP' : 'PC';

                                                        return (
                                                            <div key={`${activePeriod}-${group}`} className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-700/60 mb-4 last:mb-0">
                                                                <div className="flex items-center gap-3 mb-4">
                                                                    <div className={`w-1 h-5 rounded-full bg-indigo-500`}></div>
                                                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm italic uppercase tracking-wider">
                                                                        {groupNames[group]} <span className="text-slate-400 font-normal text-xs ml-1">({pillCodePrefix}{group.slice(1)})</span>
                                                                    </h4>
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {groupInstruments.map(inst => renderInstrumentCard(inst))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {(() => {
                                                        const ungroupedInstruments = classInstruments.filter(inst => {
                                                            return inst.period === activePeriod && !inst.competencyIds.some(cid => competencyToGroupMap.has(cid));
                                                        });
                                                        if (ungroupedInstruments.length === 0) return null;
                                                        return (
                                                            <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-4 sm:p-5 border border-amber-200/60 dark:border-amber-700/60 mt-4">
                                                                <div className="flex items-center gap-3 mb-4">
                                                                    <div className="w-1 h-5 rounded-full bg-amber-500"></div>
                                                                    <h4 className="font-bold text-amber-700 dark:text-amber-300 text-sm italic uppercase tracking-wider">
                                                                        Sin grupo
                                                                    </h4>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {ungroupedInstruments.map(inst => renderInstrumentCard(inst))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {classInstruments
                                                        .filter(inst => inst.period === activePeriod)
                                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                        .map(inst => renderInstrumentCard(inst))
                                                    }
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Replicate Overlay */}
                        <AnimatePresence>
                            {replicateTarget && (
                                <motion.div
                                    key="replicate-overlay-wrapper"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                                >
                                    <motion.div
                                        key="replicate-backdrop"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => {
                                            setReplicateTarget(null);
                                            setSelectedTargetClassIds([]);
                                        }}
                                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                                    />

                                    <motion.div
                                        key="replicate-card"
                                        initial={{ scale: 0.95, opacity: 0, y: 15 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 0.95, opacity: 0, y: 15 }}
                                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                        className="bg-white dark:bg-slate-800 w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative z-10 flex flex-col p-6"
                                        role="dialog"
                                        aria-modal="true"
                                    >
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                            <DocumentDuplicateIcon className="w-5 h-5 text-blue-600" />
                                            Replicar Instrumento
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                            Selecciona las secciones donde deseas copiar <span className="font-bold text-slate-700 dark:text-slate-200">"{replicateTarget.name}"</span>.
                                            Los criterios se mantendrán sincronizados.
                                        </p>

                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar my-2">
                                            {classes
                                                .filter(c => c.id !== selectedClassId && c.level === classes.find(cl => cl.id === selectedClassId)?.level)
                                                .map(c => (
                                                    <label key={c.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedTargetClassIds.includes(c.id)
                                                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                        : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 hover:border-slate-300'
                                                        }`}>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                                                {c.grade.replace(' Grado', '')} {c.section} - {c.name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 uppercase font-medium">{c.schoolYear}</span>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTargetClassIds.includes(c.id)}
                                                            onChange={e => {
                                                                if (e.target.checked) setSelectedTargetClassIds([...selectedTargetClassIds, c.id]);
                                                                else setSelectedTargetClassIds(selectedTargetClassIds.filter(id => id !== c.id));
                                                            }}
                                                            className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-600 transition-all"
                                                        />
                                                    </label>
                                                ))
                                            }
                                        </div>

                                        <div className="mt-4 flex gap-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setReplicateTarget(null);
                                                    setSelectedTargetClassIds([]);
                                                }}
                                                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (onReplicateInstrument && selectedTargetClassIds.length > 0) {
                                                        onReplicateInstrument(replicateTarget.id, selectedTargetClassIds);
                                                        setReplicateTarget(null);
                                                        setSelectedTargetClassIds([]);
                                                    }
                                                }}
                                                disabled={selectedTargetClassIds.length === 0}
                                                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Replicar ({selectedTargetClassIds.length})
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
