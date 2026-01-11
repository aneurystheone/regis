
import React, { useState, useEffect, useMemo } from 'react';
import type { Class, Competency } from '../types';
import { PlusIcon, XIcon, BookOpenIcon, SearchIcon, PencilIcon, ExclamationIcon } from './icons';
import { getCurriculumByGradeAndSubject, getCompetencyDetail } from '../services/curriculumService';

interface AddCompetencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddCompetencies: (competencies: Omit<Competency, 'id'>[]) => void;
    classes: Class[];
    competencies: Competency[];
    selectedClassId: string | null;
    fundamentalCompetencies: import('../types').FundamentalCompetency[];
    competencyToEdit?: Competency | null;
    onUpdateCompetency?: (id: string, data: Omit<Competency, 'id'>) => void;
}

// Local interface for list items based on FirestoreCurriculum summary
interface CompetencySummary {
    id: string;
    code: string;
    name: string;
    fundamentalId: string;
}

export const AddCompetencyModal: React.FC<AddCompetencyModalProps> = ({ isOpen, onClose, onAddCompetencies, classes, competencies, selectedClassId, fundamentalCompetencies, competencyToEdit, onUpdateCompetency }) => {
    const [mode, setMode] = useState<'import' | 'custom'>('import');
    const [availableCompetencies, setAvailableCompetencies] = useState<CompetencySummary[]>([]);
    const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    // State for custom creation
    const [customName, setCustomName] = useState('');
    const [customCode, setCustomCode] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [selectedFundamentalId, setSelectedFundamentalId] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (competencyToEdit) {
                setMode('custom');
                setCustomName(competencyToEdit.name);
                setCustomCode(competencyToEdit.code);
                setCustomDescription(competencyToEdit.description);
                setSelectedFundamentalId(competencyToEdit.fundamentalId);
            } else {
                // Reset for add mode
                setMode('import');
                setCustomName('');
                setCustomCode('');
                setCustomDescription('');
                if (fundamentalCompetencies.length > 0 && !selectedFundamentalId) {
                    setSelectedFundamentalId(fundamentalCompetencies[0].id);
                }
            }
        }
    }, [isOpen, competencyToEdit, fundamentalCompetencies]);

    const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    useEffect(() => {
        const fetchCurriculum = async () => {
            setFetchError(false);
            if (isOpen && currentClass) {
                setIsLoading(true);
                try {
                    const curriculum = await getCurriculumByGradeAndSubject(currentClass.grade, currentClass.name);
                    if (curriculum) {
                        const classCompetencyCodes = new Set(competencies.filter(c => c.classId === currentClass.id).map(c => c.code));
                        // Filter out already added competencies
                        const filtered = curriculum.competenciesSummary.filter(comp => !classCompetencyCodes.has(comp.code));
                        setAvailableCompetencies(filtered);
                    } else {
                        setAvailableCompetencies([]);
                        setFetchError(true);
                    }
                } catch (error) {
                    console.error("Error fetching curriculum:", error);
                    setAvailableCompetencies([]);
                    setFetchError(true);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Reset state on close or if no class is selected (only if not editing)
                if (!competencyToEdit) {
                    setMode('import');
                    setSearchQuery('');
                    setSelectedCodes([]);
                    setCustomName('');
                    setCustomCode('');
                    setCustomDescription('');
                    setAvailableCompetencies([]);
                }
            }
        };

        fetchCurriculum();
    }, [isOpen, currentClass, competencies]);

    const filteredCompetencies = useMemo(() => {
        if (!searchQuery) return availableCompetencies;
        const lowerQuery = searchQuery.toLowerCase();
        return availableCompetencies.filter(comp =>
            comp.name.toLowerCase().includes(lowerQuery) ||
            comp.code.toLowerCase().includes(lowerQuery)
        );
    }, [availableCompetencies, searchQuery]);

    const handleToggleSelection = (code: string) => {
        setSelectedCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };

    const handleImport = async () => {
        if (selectedCodes.length === 0 || !currentClass) return;

        setIsLoading(true);
        try {
            const promises = selectedCodes.map(code => getCompetencyDetail(code));
            const results = await Promise.all(promises);

            const competenciesToImport: Omit<Competency, 'id'>[] = results
                .filter((c): c is NonNullable<typeof c> => c !== null)
                .map(c => ({
                    classId: currentClass.id,
                    fundamentalId: c.fundamentalId,
                    code: c.code,
                    name: c.name,
                    description: c.description,
                    indicators: c.indicators
                }));

            if (competenciesToImport.length > 0) {
                onAddCompetencies(competenciesToImport);
                onClose();
            }
        } catch (error) {
            console.error("Error importing competencies:", error);
            alert("Hubo un error al importar las competencias. Por favor, revise su conexión.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName.trim() || !customCode.trim() || !currentClass) return;

        const newCompetency: Omit<Competency, 'id'> = {
            classId: currentClass.id,
            fundamentalId: selectedFundamentalId || 'FC3', // Fallback if empty, though selection should be enforced
            name: customName,
            code: customCode,
            description: customDescription,
            indicators: []
        };
        if (competencyToEdit && onUpdateCompetency) {
            onUpdateCompetency(competencyToEdit.id, newCompetency);
        } else {
            onAddCompetencies([newCompetency]);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]" role="document">
                <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{competencyToEdit ? 'Editar Competencia' : 'Añadir Competencia Específica'}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Para la clase: <span className="font-semibold">{currentClass?.grade?.replace(' Grado', '')} {currentClass?.section} - {currentClass?.name}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"><XIcon /></button>
                    </div>
                    {!competencyToEdit && (
                        <div className="mt-4 flex p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <button onClick={() => setMode('import')} className={`w-1/2 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'import' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>
                                <BookOpenIcon className="w-5 h-5" /> Importar del Currículo
                            </button>
                            <button onClick={() => setMode('custom')} className={`w-1/2 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'custom' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>
                                <PencilIcon className="w-5 h-5" /> Crear Personalizada
                            </button>
                        </div>
                    )}
                </div>

                {mode === 'import' ? (
                    <>
                        <div className="flex-grow overflow-y-auto p-6 space-y-4">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por nombre o código..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md"
                                />
                            </div>
                            <div className="space-y-2">
                                {isLoading ? (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                        <p>Cargando competencias...</p>
                                    </div>
                                ) : filteredCompetencies.length > 0 ? filteredCompetencies.map(comp => (
                                    <div key={comp.code} className="flex items-start p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <input
                                            type="checkbox"
                                            id={`comp-${comp.code}`}
                                            checked={selectedCodes.includes(comp.code)}
                                            onChange={() => handleToggleSelection(comp.code)}
                                            className="h-4 w-4 mt-1 bg-white dark:bg-slate-600 text-indigo-600 border-slate-300 dark:border-slate-500 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor={`comp-${comp.code}`} className="ml-3 flex-grow cursor-pointer">
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{comp.code}: {comp.name}</p>
                                        </label>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                        <p className="font-semibold">No hay competencias disponibles.</p>
                                        {fetchError ? (
                                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded text-sm text-blue-800 dark:text-blue-200 flex flex-col gap-1 items-center">
                                                <ExclamationIcon className="w-5 h-5" />
                                                <span className="font-bold">¡Próximamente!</span>
                                                <span className="text-center">Estamos trabajando para añadir el currículo de <strong>{currentClass?.grade}</strong>.</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm">Es posible que ya haya importado todas las competencias disponibles para esta asignatura.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-shrink-0 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end gap-3">
                            <button onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Cancelar</button>
                            <button onClick={handleImport} disabled={selectedCodes.length === 0 || isLoading}
                                className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm disabled:bg-slate-400 dark:disabled:bg-slate-600">
                                <PlusIcon className="w-5 h-5 mr-2" />
                                {isLoading ? 'Importando...' : `Importar (${selectedCodes.length})`}
                            </button>
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleCustomSubmit} className="flex flex-col flex-grow">
                        <div className="overflow-y-auto p-6 space-y-4">
                            <div>
                                <label htmlFor="custom-comp-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre</label>
                                <input id="custom-comp-name" type="text" value={customName} onChange={e => setCustomName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="custom-comp-fundamental" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Competencia Fundamental</label>
                                    <select
                                        id="custom-comp-fundamental"
                                        value={selectedFundamentalId}
                                        onChange={e => setSelectedFundamentalId(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md"
                                    >
                                        {fundamentalCompetencies.map(fc => (
                                            <option key={fc.id} value={fc.id}>
                                                {fc.name} ({fc.group})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="custom-comp-code" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Código</label>
                                    <input id="custom-comp-code" type="text" value={customCode} onChange={e => setCustomCode(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="custom-comp-desc" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Descripción</label>
                                <textarea id="custom-comp-desc" value={customDescription} onChange={e => setCustomDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md" />
                            </div>
                        </div>
                        <div className="flex-shrink-0 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Cancelar</button>
                            <button type="submit" disabled={!customName.trim() || !customCode.trim()} className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm disabled:bg-slate-400">
                                {competencyToEdit ? (
                                    <>
                                        <PencilIcon className="w-5 h-5 mr-2" />
                                        Guardar Cambios
                                    </>
                                ) : (
                                    <>
                                        <PlusIcon className="w-5 h-5 mr-2" />
                                        Crear Competencia
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
