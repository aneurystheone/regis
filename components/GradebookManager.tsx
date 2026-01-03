
import React, { useState, useMemo, useEffect } from 'react';
import type { Student, Class, Competency, EvaluationInstrument, Grade, EvaluationPeriod, FundamentalCompetency, CompetencyGroup, RecoveryGrade } from '../types';
import { PlusIcon, AcademicCapIcon, BoltIcon, PencilIcon, DocumentTextIcon, ChevronDownIcon, StarIcon, UserGroupIcon, TrashIcon, DocumentDuplicateIcon } from './icons';
import { ClassSelector } from './ClassSelector';

interface GradebookManagerProps {
    students: Student[];
    classes: Class[];
    fundamentalCompetencies: FundamentalCompetency[];
    competencies: Competency[];
    instruments: EvaluationInstrument[];
    grades: Grade[];
    recoveryGrades: RecoveryGrade[];
    onAddCompetencyClick: () => void;
    onAddInstrumentClick: () => void;
    onEditInstrumentClick: (instrument: EvaluationInstrument) => void;
    onViewInstrumentDetails: (instrument: EvaluationInstrument) => void;
    onAddRecoveryGradeClick: (student: Student, period: EvaluationPeriod, competencyGroup: CompetencyGroup, currentScore: number | null) => void;
    initialTab: 'GRADES' | 'INSTRUMENTS' | 'COMPETENCIES';
    onExpressGradingClick: (instrument: EvaluationInstrument, studentId?: string) => void;
    studentFilter: string | null;
    onClearStudentFilter: () => void;
    initialFundamentalFilter?: string | null;
    selectedClassId: string | null;
    onSelectClass: (classId: string) => void;
    onAddStudentClick: (classId: string) => void;
    onEditCompetency: (competency: Competency) => void;
    onDeleteCompetency: (competency: Competency) => void;
    onCopyCompetency: (competency: Competency) => void;
}

const evaluationPeriods: EvaluationPeriod[] = ['P1', 'P2', 'P3', 'P4'];
const competencyGroups: CompetencyGroup[] = ['G1', 'G2', 'G3', 'G4'];
const groupNames: Record<CompetencyGroup, string> = {
    G1: "Comunicativa",
    G2: "Lógico/Crítico",
    G3: "Ética/Ciudadana",
    G4: "Científica/Salud"
};

const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; className?: string }> = ({ label, icon, isActive, onClick, className = '' }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg border-b-2 transition-colors focus:outline-none ${isActive
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            } ${className}`}
    >
        {icon}
        <span className={`${isActive ? 'inline' : 'hidden'} sm:inline`}>{label}</span>
    </button>
);


const getGradeColor = (score: number | null, isFinal = false): string => {
    if (score === null || score === undefined) {
        return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    }
    const fontWeight = isFinal ? 'font-extrabold' : 'font-semibold';
    if (score >= 90) return `bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200 ${fontWeight}`;
    if (score >= 80) return `bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 ${fontWeight}`;
    if (score >= 70) return `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 ${fontWeight}`;
    return `bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 ${fontWeight}`;
};

const calculateGradeSheet = (
    classStudents: Student[],
    classInstruments: EvaluationInstrument[],
    grades: Grade[],
    recoveryGrades: RecoveryGrade[],
    competenciesByGroup: Map<CompetencyGroup, string[]>,
    level: string
) => {
    const data = new Map<string, { [key: string]: number | null }>();

    for (const student of classStudents) {
        const studentScores: { [key: string]: number | null } = {};
        const finalPeriodScoresByGroup: { [key in CompetencyGroup]?: number[] } = {};

        for (const group of competencyGroups) {
            const groupCompetencyIds = new Set(competenciesByGroup.get(group) || []);
            finalPeriodScoresByGroup[group] = [];

            for (const period of evaluationPeriods) {
                const instrumentsInPeriodAndGroup = classInstruments.filter(inst =>
                    inst.period === period && inst.competencyIds.some(cid => groupCompetencyIds.has(cid))
                );

                const relevantGrades = grades.filter(g =>
                    g.studentId === student.id &&
                    instrumentsInPeriodAndGroup.some(i => i.id === g.instrumentId) &&
                    g.score !== null
                );

                let periodScore = null;
                if (relevantGrades.length > 0) {
                    const totalScored = relevantGrades.reduce((sum, g) => sum + g.score!, 0);
                    const totalPossible = relevantGrades.reduce((sum, g) => {
                        const instrument = instrumentsInPeriodAndGroup.find(i => i.id === g.instrumentId);
                        return sum + (instrument?.totalPoints || 0);
                    }, 0);
                    if (totalPossible > 0) {
                        periodScore = Math.round((totalScored / totalPossible) * 100);
                    }
                }
                studentScores[`${group}-${period}`] = periodScore;

                const recoveryGrade = recoveryGrades.find(rg =>
                    rg.studentId === student.id && rg.period === period && rg.competencyGroup === group
                );
                studentScores[`${group}-RP${period.slice(1)}`] = recoveryGrade?.score ?? null;

                const minPassing = (level?.toLowerCase().includes('secundari')) ? 70 : 65;
                let finalPeriodScore = periodScore;

                if (periodScore !== null && periodScore < minPassing) {
                    if (recoveryGrade) {
                        finalPeriodScore = recoveryGrade.score;
                    }
                } else if (periodScore === null && recoveryGrade) {
                    finalPeriodScore = recoveryGrade.score;
                }

                if (finalPeriodScore !== null) {
                    finalPeriodScoresByGroup[group]!.push(finalPeriodScore);
                }
            }

            const groupScores = finalPeriodScoresByGroup[group]!;
            if (groupScores.length > 0) {
                studentScores[`PC${group.slice(1)}`] = Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length);
            } else {
                studentScores[`PC${group.slice(1)}`] = null;
            }
        }

        const allPeriodsAndGroupsComplete = competencyGroups.every(g =>
            finalPeriodScoresByGroup[g]!.length === evaluationPeriods.length
        );

        if (allPeriodsAndGroupsComplete) {
            const pcScores = competencyGroups.map(g => studentScores[`PC${g.slice(1)}`]).filter(s => s !== null) as number[];
            if (pcScores.length > 0) {
                studentScores['final'] = Math.round(pcScores.reduce((a, b) => a + b, 0) / pcScores.length);
            } else {
                studentScores['final'] = null;
            }
        } else {
            studentScores['final'] = null;
        }

        data.set(student.id, studentScores);
    }
    return data;
};

const calculatePeriodDetails = (
    periodInstruments: EvaluationInstrument[],
    classStudents: Student[],
    grades: Grade[],
    recoveryGrades: RecoveryGrade[],
    competenciesByGroup: Map<CompetencyGroup, string[]>,
    selectedPeriod: EvaluationPeriod,
    level: string
) => {
    return classStudents.map(student => {
        const instrumentGrades: Record<string, { score: number | null, instrument: EvaluationInstrument }> = {};
        let totalScored = 0;
        let totalPossible = 0;

        periodInstruments.forEach(inst => {
            const grade = grades.find(g => g.studentId === student.id && g.instrumentId === inst.id);
            instrumentGrades[inst.id] = { score: grade?.score ?? null, instrument: inst };
            if (grade?.score !== null && grade?.score !== undefined) {
                totalScored += grade.score;
                totalPossible += inst.totalPoints;
            }
        });

        const originalPcScores: { [key in CompetencyGroup]?: number | null } = {};
        const pcScores: { [key in CompetencyGroup]?: number | null } = {};
        const recoveryPeriodGrades: { [key in CompetencyGroup]?: number | null } = {};

        for (const group of competencyGroups) {
            const groupCompetencyIds = new Set(competenciesByGroup.get(group) || []);
            const instrumentsInPeriodAndGroup = periodInstruments.filter(inst => inst.competencyIds.some(cid => groupCompetencyIds.has(cid)));

            const recoveryGrade = recoveryGrades.find(rg => rg.studentId === student.id && rg.period === selectedPeriod && rg.competencyGroup === group);
            recoveryPeriodGrades[group] = recoveryGrade?.score ?? null;

            if (instrumentsInPeriodAndGroup.length === 0) {
                originalPcScores[group] = null;
                pcScores[group] = null;
                continue;
            }

            const relevantGrades = grades.filter(g => g.studentId === student.id && instrumentsInPeriodAndGroup.some(i => i.id === g.instrumentId) && g.score !== null);
            let periodGroupScore = null;
            if (relevantGrades.length > 0) {
                const totalGroupScored = relevantGrades.reduce((sum, g) => sum + g.score!, 0);
                const totalGroupPossible = relevantGrades.reduce((sum, g) => (instrumentsInPeriodAndGroup.find(i => i.id === g.instrumentId)?.totalPoints || 0) + sum, 0);
                if (totalGroupPossible > 0) periodGroupScore = Math.round((totalGroupScored / totalGroupPossible) * 100);
            }

            // Store the original instrument-based score
            originalPcScores[group] = periodGroupScore;

            const minPassing = (level?.toLowerCase().includes('secundari')) ? 70 : 65;
            let finalPeriodGroupScore = periodGroupScore;

            if (periodGroupScore !== null && periodGroupScore < minPassing) {
                if (recoveryGrade) {
                    finalPeriodGroupScore = recoveryGrade.score;
                }
            } else if (periodGroupScore === null && recoveryGrade) {
                finalPeriodGroupScore = recoveryGrade.score;
            }

            // Store the final calculated score (which may use RP)
            pcScores[group] = finalPeriodGroupScore;
        }

        // Calculate period average from the final group scores (including RP logic)
        const groupScoresForAverage = competencyGroups
            .map(g => pcScores[g])
            .filter(s => s !== null) as number[];


        const periodAverage = groupScoresForAverage.length === competencyGroups.length
            ? Math.round(groupScoresForAverage.reduce((a, b) => a + b, 0) / groupScoresForAverage.length)
            : null;

        return { student, instrumentGrades, periodAverage, originalPcScores, pcScores, recoveryPeriodGrades };
    });
};


export const GradebookManager: React.FC<GradebookManagerProps> = ({ students, classes, fundamentalCompetencies, competencies, instruments, grades, recoveryGrades, onAddCompetencyClick, onAddInstrumentClick, onEditInstrumentClick, onViewInstrumentDetails, initialTab, onExpressGradingClick, onAddRecoveryGradeClick, studentFilter, onClearStudentFilter, initialFundamentalFilter, selectedClassId, onSelectClass, onAddStudentClick, onEditCompetency, onDeleteCompetency, onCopyCompetency }) => {
    const [selectedFundamentalFilter, setSelectedFundamentalFilter] = useState<string>('all');

    // State for Grades View
    const [gradeViewType, setGradeViewType] = useState<'summary' | 'period'>('summary');
    const [selectedPeriod, setSelectedPeriod] = useState<EvaluationPeriod>('P1');
    const [periodCompetencyFilter, setPeriodCompetencyFilter] = useState<string>('all');
    const [showRecoveryGrades, setShowRecoveryGrades] = useState(false);
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (initialFundamentalFilter && fundamentalCompetencies.some(fc => fc.id === initialFundamentalFilter)) {
            setSelectedFundamentalFilter(initialFundamentalFilter);
        }
    }, [initialFundamentalFilter, fundamentalCompetencies]);

    useEffect(() => {
        setGradeViewType('summary');
        setPeriodCompetencyFilter('all');
        setShowRecoveryGrades(false);
        setExpandedStudentId(null);
    }, [selectedClassId]);

    const competenciesByGroup = useMemo(() => {
        const map = new Map<CompetencyGroup, string[]>();
        fundamentalCompetencies.forEach(fc => {
            const competencyIdsForGroup = competencies.filter(c => c.fundamentalId === fc.id).map(c => c.id);
            const existing = map.get(fc.group) || [];
            map.set(fc.group, [...existing, ...competencyIdsForGroup]);
        });
        return map;
    }, [fundamentalCompetencies, competencies]);

    const competencyToGroupMap = useMemo(() => {
        const map = new Map<string, CompetencyGroup>();
        for (const comp of competencies) {
            const fundamental = fundamentalCompetencies.find(fc => fc.id === comp.fundamentalId);
            if (fundamental) {
                map.set(comp.id, fundamental.group);
            }
        }
        return map;
    }, [competencies, fundamentalCompetencies]);

    const gradeSheetData = useMemo(() => {
        if (!selectedClassId) return { data: new Map(), classStudents: [] };
        const classStudents = students.filter(s => s.classId === selectedClassId && (studentFilter ? s.id === studentFilter : true)).sort((a, b) => a.name.localeCompare(b.name));
        const classInstruments = instruments.filter(i => i.classId === selectedClassId);
        const currentClass = classes.find(c => c.id === selectedClassId);
        const data = calculateGradeSheet(classStudents, classInstruments, grades, recoveryGrades, competenciesByGroup, currentClass?.level || 'Nivel Primario');
        return { data, classStudents };
    }, [selectedClassId, students, studentFilter, instruments, grades, recoveryGrades, competenciesByGroup, classes]);

    const periodDetailData = useMemo(() => {
        if (gradeViewType !== 'period' || !selectedClassId) return { periodInstruments: [], studentPeriodGrades: [], periodHeaderGroups: [] };

        const periodInstruments = instruments
            .filter(i => {
                if (i.classId !== selectedClassId || i.period !== selectedPeriod) return false;
                if (periodCompetencyFilter === 'all') return true;
                if (periodCompetencyFilter.startsWith('group-')) {
                    const group = periodCompetencyFilter.replace('group-', '');
                    return i.competencyIds.some(cid => competencyToGroupMap.get(cid) === group);
                }
                const specificIdsForFundamental = competencies.filter(c => c.fundamentalId === periodCompetencyFilter).map(c => c.id);
                const specificIdsSet = new Set(specificIdsForFundamental);
                return i.competencyIds.some(cid => specificIdsSet.has(cid));
            })
            .sort((a, b) => {
                const groupA = a.competencyIds[0] ? competencyToGroupMap.get(a.competencyIds[0]) || 'Z' : 'Z';
                const groupB = b.competencyIds[0] ? competencyToGroupMap.get(b.competencyIds[0]) || 'Z' : 'Z';
                if (groupA < groupB) return -1;
                if (groupA > groupB) return 1;
                return a.date.localeCompare(b.date);
            });

        const classStudents = students.filter(s => s.classId === selectedClassId && (studentFilter ? s.id === studentFilter : true)).sort((a, b) => a.name.localeCompare(b.name));
        const currentClass = classes.find(c => c.id === selectedClassId);

        const studentPeriodGrades = calculatePeriodDetails(periodInstruments, classStudents, grades, recoveryGrades, competenciesByGroup, selectedPeriod, currentClass?.level || 'Nivel Primario');

        const periodHeaderGroups: { group: CompetencyGroup | 'N/A'; name: string; colSpan: number }[] = [];
        if (periodInstruments.length > 0) {
            for (const inst of periodInstruments) {
                const firstCompetencyId = inst.competencyIds[0];
                const group = firstCompetencyId ? competencyToGroupMap.get(firstCompetencyId) || 'N/A' : 'N/A';
                const groupName = group !== 'N/A' ? `G${group.slice(1)}` : 'Gen.';

                if (periodHeaderGroups.length > 0 && periodHeaderGroups[periodHeaderGroups.length - 1].group === group) {
                    periodHeaderGroups[periodHeaderGroups.length - 1].colSpan++;
                } else {
                    periodHeaderGroups.push({ group, name: groupName, colSpan: 1 });
                }
            }
        }

        return { periodInstruments, studentPeriodGrades, periodHeaderGroups };
    }, [gradeViewType, selectedClassId, selectedPeriod, instruments, students, grades, studentFilter, competencyToGroupMap, periodCompetencyFilter, competenciesByGroup, recoveryGrades, competencies]);

    const classInstruments = useMemo(() => instruments.filter(i => i.classId === selectedClassId), [instruments, selectedClassId]);
    const classCompetencies = useMemo(() => competencies.filter(c => c.classId === selectedClassId), [competencies, selectedClassId]);
    const hasStudents = gradeSheetData.classStudents.length > 0;

    const renderGradesView = () => {
        return (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-md">
                {/* Header Controls */}
                <div className="flex flex-col gap-4 mb-6">
                    {/* Top Row: View Toggle */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-700/60 rounded-lg w-full sm:w-auto">
                            <button onClick={() => { setGradeViewType('summary'); setExpandedStudentId(null); }} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 whitespace-nowrap ${gradeViewType === 'summary' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                Resumen Anual
                            </button>
                            <button onClick={() => { setGradeViewType('period'); setExpandedStudentId(null); }} className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 whitespace-nowrap ${gradeViewType === 'period' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                Detalle de Período
                            </button>
                        </div>

                        {/* Period Selector - Only show when period view is active */}
                        {gradeViewType === 'period' && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    id="period-select"
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value as EvaluationPeriod)}
                                    className="block w-full sm:w-auto pl-3 pr-10 py-2 text-sm font-semibold border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
                                >
                                    {evaluationPeriods.map(p => <option key={p} value={p}>Período {p.slice(1)}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Filters and Recovery Toggle - Only show when period view is active */}
                    {gradeViewType === 'period' && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <select
                                id="period-competency-filter"
                                value={periodCompetencyFilter}
                                onChange={(e) => setPeriodCompetencyFilter(e.target.value)}
                                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm"
                            >
                                <option value="all">Todas las Competencias</option>
                                <optgroup label="Grupos">
                                    {competencyGroups.map(g => (
                                        <option key={`group-${g}`} value={`group-${g}`}>{groupNames[g]}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Competencias Fundamentales">
                                    {fundamentalCompetencies.map(fc => (
                                        <option key={fc.id} value={fc.id}>{fc.name}</option>
                                    ))}
                                </optgroup>
                            </select>

                            <div className="flex items-center gap-2">
                                <label htmlFor="show-recovery-toggle" className="text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none whitespace-nowrap">Recuperación (RP)</label>
                                <button
                                    id="show-recovery-toggle"
                                    onClick={() => setShowRecoveryGrades(!showRecoveryGrades)}
                                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 ${showRecoveryGrades ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                                    role="switch"
                                    aria-checked={showRecoveryGrades}
                                >
                                    <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${showRecoveryGrades ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Student Filter - Always visible when active */}
                    {studentFilter && (
                        <div className="flex items-center">
                            <button onClick={onClearStudentFilter} className="flex items-center text-sm bg-red-100 text-red-700 font-semibold py-2 px-3 rounded-lg hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70 transition-colors">
                                <PencilIcon className="w-4 h-4 mr-2" />
                                Filtro activo: {students.find(s => s.id === studentFilter)?.name} (X)
                            </button>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    {/* SUMMARY VIEW TABLE */}
                    {gradeViewType === 'summary' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border-collapse text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20">
                                    <tr>
                                        <th rowSpan={2} className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-b border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)] w-64">Estudiante</th>
                                        <th colSpan={4} className="px-2 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-900/20">Promedios por Grupo de Competencia</th>
                                        <th rowSpan={2} className="px-4 py-3 text-center font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider sticky right-0 bg-emerald-50 dark:bg-emerald-900/20 z-20 border-b border-l border-slate-200 dark:border-slate-700 w-32">Calificación Final</th>
                                    </tr>
                                    <tr>
                                        {competencyGroups.map(group => (
                                            <th key={`${group}-PC`} className="px-2 py-3 text-center font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[120px]">
                                                <div className="flex flex-col">
                                                    <span>{groupNames[group].split(' ')[0]}...</span>
                                                    <span className="text-xs text-slate-400 font-normal">(G{group.slice(1)})</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                    {gradeSheetData.classStudents.map((student, idx) => {
                                        const scores = gradeSheetData.data.get(student.id) || {};
                                        return (
                                            <tr key={student.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100 sticky left-0 z-10 bg-inherit border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                            <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        <span className="truncate">{student.name}</span>
                                                    </div>
                                                </td>
                                                {competencyGroups.map(group => (
                                                    <td key={`${group}-PC`} className="px-2 py-3 whitespace-nowrap text-center">
                                                        <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg text-sm ${getGradeColor(scores[`PC${group.slice(1)}`], true)}`}>
                                                            {scores[`PC${group.slice(1)}`] ?? '-'}
                                                        </span>
                                                    </td>
                                                ))}
                                                <td className="px-4 py-3 whitespace-nowrap text-center sticky right-0 z-10 bg-inherit border-l border-slate-200 dark:border-slate-700">
                                                    <span className={`inline-flex items-center justify-center w-16 h-10 rounded-lg text-lg shadow-sm ${getGradeColor(scores['final'], true)}`}>
                                                        {scores['final'] ?? '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PERIOD DETAIL VIEW TABLE */}
                    {gradeViewType === 'period' && (
                        <div className="overflow-x-auto">
                            {periodDetailData.periodInstruments.length > 0 ? (
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border-collapse text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20">
                                        <tr>
                                            <th rowSpan={2} className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-b-2 border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)] w-64">Estudiante</th>
                                            {periodDetailData.periodHeaderGroups.map((groupInfo, index) => (
                                                <th
                                                    key={index}
                                                    colSpan={groupInfo.colSpan}
                                                    className="px-3 py-2 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 tracking-wider whitespace-nowrap border-b border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                                                >
                                                    {groupInfo.name}
                                                </th>
                                            ))}
                                            <th
                                                colSpan={competencyGroups.length * (showRecoveryGrades ? 2 : 1)}
                                                className="px-2 py-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700 border-l-2"
                                            >
                                                Promedios PC
                                            </th>
                                            <th rowSpan={2} className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky right-0 bg-slate-100 dark:bg-slate-700/80 z-20 border-b-2 border-l-2 border-slate-200 dark:border-slate-700 align-middle whitespace-nowrap w-24">
                                                {selectedPeriod}
                                            </th>
                                        </tr>
                                        <tr>
                                            {periodDetailData.periodInstruments.map(inst => (
                                                <th key={inst.id} className="px-2 py-3 text-center font-medium text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-700 min-w-[100px] group">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <button onClick={() => onViewInstrumentDetails(inst)} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1 text-xs" title={inst.name}>
                                                            {inst.name}
                                                        </button>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">{inst.totalPoints}pts</span>
                                                            <button onClick={() => onExpressGradingClick(inst)} className="text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-transform hover:scale-110" title="Calificación Rápida">
                                                                <BoltIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </th>
                                            ))}
                                            {competencyGroups.flatMap(group => [
                                                <th key={`pc-header-${group}`} className="px-1 py-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 min-w-[40px]">
                                                    G{group.slice(1)}
                                                </th>,
                                                showRecoveryGrades && (
                                                    <th key={`rp-header-${group}`} className="px-1 py-2 text-center text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase border-b-2 border-slate-200 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-900/10 border-l border-slate-200 dark:border-slate-700 min-w-[40px]">
                                                        RP
                                                    </th>
                                                )
                                            ])}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        {periodDetailData.studentPeriodGrades.map(({ student, instrumentGrades, periodAverage, originalPcScores, pcScores, recoveryPeriodGrades }, idx) => (
                                            <tr key={student.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100 sticky left-0 z-10 bg-inherit border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                            <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        <span className="truncate">{student.name}</span>
                                                    </div>
                                                </td>
                                                {periodDetailData.periodInstruments.map(inst => {
                                                    const gradeInfo = instrumentGrades[inst.id];
                                                    return (
                                                        <td key={inst.id} className="px-2 py-2 whitespace-nowrap text-center">
                                                            <button
                                                                onClick={() => onExpressGradingClick(gradeInfo.instrument, student.id)}
                                                                className={`inline-flex items-center justify-center w-10 h-8 rounded text-sm font-semibold transition-all hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getGradeColor(gradeInfo.score)}`}
                                                            >
                                                                {gradeInfo.score ?? '-'}
                                                            </button>
                                                        </td>
                                                    )
                                                })}
                                                {competencyGroups.flatMap(group => [
                                                    <td key={`pc-cell-${student.id}-${group}`} className="px-1 py-2 whitespace-nowrap text-center border-l border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30">
                                                        <span className={`text-xs font-bold ${originalPcScores?.[group] !== null && originalPcScores?.[group]! < 70 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {originalPcScores?.[group] ?? '-'}
                                                        </span>
                                                    </td>,
                                                    showRecoveryGrades && (
                                                        <td key={`rp-cell-${student.id}-${group}`} className="px-1 py-2 whitespace-nowrap text-center border-l border-slate-200 dark:border-slate-700 bg-blue-50/10 dark:bg-blue-900/10">
                                                            <button onClick={() => onAddRecoveryGradeClick(student, selectedPeriod, group, originalPcScores?.[group] ?? null)} className={`w-8 h-6 text-xs rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors ${recoveryPeriodGrades?.[group] !== null && recoveryPeriodGrades?.[group] !== undefined ? 'text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-400'}`}>
                                                                {recoveryPeriodGrades?.[group] ?? '+'}
                                                            </button>
                                                        </td>
                                                    )
                                                ])}
                                                <td className="px-4 py-3 whitespace-nowrap text-center sticky right-0 z-10 bg-inherit border-l-2 border-slate-200 dark:border-slate-700">
                                                    <span className={`inline-flex items-center justify-center w-12 h-9 rounded-lg font-bold text-sm shadow-sm ${getGradeColor(periodAverage, true)}`}>
                                                        {periodAverage ?? '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                                    <AcademicCapIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="font-medium">No hay instrumentos de evaluación para este período.</p>
                                    <button onClick={onAddInstrumentClick} className="mt-4 text-indigo-600 hover:underline text-sm">Añadir Instrumento</button>
                                </div>
                            )}
                        </div>
                    )}
                    {!hasStudents && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-slate-500 dark:text-slate-400">No hay estudiantes en esta clase.</p>
                            {selectedClassId && (
                                <button
                                    onClick={() => onAddStudentClick(selectedClassId)}
                                    className="inline-flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <PlusIcon className="w-5 h-5 mr-2" />
                                    Añadir Estudiante
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile View: Card List */}
                <div className="lg:hidden space-y-4">
                    {gradeViewType === 'summary' && gradeSheetData.classStudents.map(student => {
                        const scores = gradeSheetData.data.get(student.id) || {};
                        const isExpanded = expandedStudentId === student.id;
                        return (
                            <div key={student.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200">
                                <button onClick={() => setExpandedStudentId(isExpanded ? null : student.id)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 active:bg-slate-100 dark:active:bg-slate-700">
                                    <div className="flex items-center gap-3">
                                        <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600 shadow-sm" />
                                        <div className="text-left">
                                            <span className="block font-bold text-slate-800 dark:text-slate-100">{student.name}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">ID: {student.id}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className={`px-2 py-1 rounded-md text-sm shadow-sm ${getGradeColor(scores['final'], true)}`}>{scores['final'] ?? '-'}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Final</span>
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                <div className={`border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-4 space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Promedios por Competencia</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {competencyGroups.map(group => (
                                                <div key={group} className="flex justify-between items-center bg-white dark:bg-slate-700 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{groupNames[group].split(' ')[0]}</span>
                                                        <span className="text-[10px] text-slate-400">G{group.slice(1)}</span>
                                                    </div>
                                                    <span className={`text-sm font-bold px-2 py-1 rounded ${getGradeColor(scores[`PC${group.slice(1)}`])}`}>{scores[`PC${group.slice(1)}`] ?? '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {showRecoveryGrades && (
                                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-xs font-bold text-blue-500 dark:text-blue-400 mb-2 uppercase">Recuperaciones Activas</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {competencyGroups.flatMap(g => evaluationPeriods.map(p => {
                                                        const score = scores[`${g}-RP${p.slice(1)}`];
                                                        if (score === null || score === undefined) return null;
                                                        return (
                                                            <div key={`${g}-${p}`} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                                                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">G{g.slice(1)}-{p}</span>
                                                                <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{score}</span>
                                                            </div>
                                                        )
                                                    }))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {gradeViewType === 'period' && periodDetailData.studentPeriodGrades.map(({ student, instrumentGrades, periodAverage }) => {
                        const isExpanded = expandedStudentId === student.id;
                        return (
                            <div key={student.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200">
                                <button onClick={() => setExpandedStudentId(isExpanded ? null : student.id)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 active:bg-slate-100 dark:active:bg-slate-700">
                                    <div className="flex items-center gap-3">
                                        <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600 shadow-sm" />
                                        <div className="text-left">
                                            <span className="block font-bold text-slate-800 dark:text-slate-100">{student.name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className={`px-2 py-1 rounded-md text-sm shadow-sm ${getGradeColor(periodAverage, true)}`}>{periodAverage ?? '-'}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{selectedPeriod}</span>
                                        </div>
                                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                <div className={`border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="p-4 space-y-3">
                                        {periodDetailData.periodInstruments.length > 0 ? periodDetailData.periodInstruments.map(inst => {
                                            const gradeInfo = instrumentGrades[inst.id];
                                            return (
                                                <div key={inst.id} className="flex justify-between items-center bg-white dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                                                    <div className="flex flex-col max-w-[70%]">
                                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{inst.name}</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{inst.type} &bull; {inst.totalPoints} pts</span>
                                                    </div>
                                                    <button onClick={() => onExpressGradingClick(inst, student.id)} className={`px-3 py-1.5 text-sm font-bold rounded-md shadow-sm active:scale-95 transition-transform ${getGradeColor(gradeInfo.score)}`}>{gradeInfo.score ?? '-'}</button>
                                                </div>
                                            )
                                        }) : (
                                            <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4 italic">No hay instrumentos en este período.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {!hasStudents && (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <p className="mb-3">No hay estudiantes en esta clase.</p>
                            {selectedClassId && (
                                <button
                                    onClick={() => onAddStudentClick(selectedClassId)}
                                    className="inline-flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <PlusIcon className="w-5 h-5 mr-2" />
                                    Añadir Estudiante
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        );
    };

    return (
        <div>
            {/* Mobile Class Selector */}
            <div className="md:hidden p-4 pb-0">
                <ClassSelector
                    classes={classes}
                    selectedClassId={selectedClassId}
                    onSelectClass={onSelectClass}
                    size="default"
                />
            </div>

            <div className="p-4 sm:p-8 space-y-6">
                {/* Desktop Header & Class Selector */}
                <div className="hidden md:flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Libro de Calificaciones</h2>
                    <ClassSelector
                        classes={classes}
                        selectedClassId={selectedClassId}
                        onSelectClass={onSelectClass}
                        className="w-full max-w-sm"
                    />
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                        <TabButton label="Competencias" icon={<BoltIcon className="w-5 h-5" />} isActive={activeTab === 'COMPETENCIES'} onClick={() => setActiveTab('COMPETENCIES')} />
                        <TabButton label="Instrumentos" icon={<DocumentTextIcon className="w-5 h-5" />} isActive={activeTab === 'INSTRUMENTS'} onClick={() => setActiveTab('INSTRUMENTS')} />
                        <TabButton label="Calificaciones" icon={<StarIcon className="w-5 h-5" />} isActive={activeTab === 'GRADES'} onClick={() => setActiveTab('GRADES')} />
                    </nav>
                </div>

                {/* Content */}
                {!hasStudents && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg flex justify-between items-center">
                        <div className="flex items-center">
                            <UserGroupIcon className="w-5 h-5 text-blue-500 mr-3" />
                            <div>
                                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Clase sin estudiantes</p>
                                <p className="text-xs text-blue-600 dark:text-blue-300">Añada estudiantes para comenzar a calificar.</p>
                            </div>
                        </div>
                        {selectedClassId && (
                            <button
                                onClick={() => onAddStudentClick(selectedClassId)}
                                className="text-sm bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold py-1 px-3 rounded border border-blue-200 dark:border-blue-800 shadow-sm hover:bg-blue-50 dark:hover:bg-slate-700"
                            >
                                Añadir Ahora
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'GRADES' && renderGradesView()}

                {activeTab === 'INSTRUMENTS' && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button
                                onClick={onAddInstrumentClick}
                                className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Añadir Instrumento
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classInstruments.map(inst => (
                                <div key={inst.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border-l-4 border-indigo-500 hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{inst.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{inst.type}</p>
                                        </div>
                                        <span className="text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-1 rounded-full">{inst.totalPoints} pts</span>
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                        <p><span className="font-semibold">Fecha:</span> {new Date(inst.date).toLocaleDateString()}</p>
                                        <p><span className="font-semibold">Período:</span> {inst.period}</p>
                                        <p><span className="font-semibold">Competencias:</span> {inst.competencyIds.length}</p>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <button onClick={() => onEditInstrumentClick(inst)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><PencilIcon className="w-5 h-5" /></button>
                                        <button onClick={() => onViewInstrumentDetails(inst)} className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><DocumentTextIcon className="w-5 h-5" /></button>
                                        <button onClick={() => onExpressGradingClick(inst)} className="p-2 text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors" title="Calificar"><BoltIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            ))}
                            {classInstruments.length === 0 && (
                                <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                    <p className="mb-2">No hay instrumentos de evaluación creados.</p>
                                    <button onClick={onAddInstrumentClick} className="text-indigo-600 hover:underline font-medium">Crear el primero</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'COMPETENCIES' && (
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
                                    <div key={group} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
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
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                    <p className="mb-2">No hay competencias específicas asignadas a esta clase.</p>
                                    <button onClick={onAddCompetencyClick} className="text-indigo-600 hover:underline font-medium">Seleccionar del Currículo</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
