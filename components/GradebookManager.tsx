import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Student, Class, Competency, EvaluationInstrument, Grade, EvaluationPeriod, FundamentalCompetency, CompetencyGroup, RecoveryGrade, WorkTeam } from '../types';
import { PlusIcon, AcademicCapIcon, DocumentAddIcon, SearchIcon, XIcon } from './icons';
import { ClassSelector } from './ClassSelector';
import { MobileGradeGrid } from './MobileGradeGrid';
import { InstrumentsManagerModal } from './InstrumentsManagerModal';
import { CompetenciesManagerModal } from './CompetenciesManagerModal';
import { AddRecoveryGradeModal } from './AddRecoveryGradeModal';

// Extracted Gradebook Components
import { GradebookControls } from './gradebook/GradebookControls';
import { DesktopSummaryTable } from './gradebook/DesktopSummaryTable';
import { DesktopPeriodTable } from './gradebook/DesktopPeriodTable';
import { useGradebookData, evaluationPeriods, getGradeColor } from '../hooks/useGradebookData';
import { getCurrentEvaluationPeriod } from '../utils';
import { api } from '../services/api';

interface GradebookManagerProps {
    students: Student[];
    classes: Class[];
    fundamentalCompetencies: FundamentalCompetency[];
    competencies: Competency[];
    instruments: EvaluationInstrument[];
    grades: Grade[];
    recoveryGrades: RecoveryGrade[];
    onAddCompetencyClick: () => void;
    onAddInstrumentClick: (prefill?: { period?: EvaluationPeriod, competencyIds?: string[] }) => void;
    onEditInstrumentClick: (instrument: EvaluationInstrument) => void;
    onViewInstrumentDetails: (instrument: EvaluationInstrument) => void;
    onDeleteInstrument: (instrumentId: string) => void;
    onSaveRecoveryGrade: (gradeData: Omit<RecoveryGrade, 'id'>) => Promise<void> | void;
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
    onImportStudentsClick?: () => void;
    onReplicateInstrument?: (instrumentId: string, targetClassIds: string[]) => void;
    onNavigate?: (view: any) => void;
}

export const GradebookManager: React.FC<GradebookManagerProps> = ({ 
    students, classes, fundamentalCompetencies, competencies, instruments, grades, 
    recoveryGrades, onAddCompetencyClick, onAddInstrumentClick, onEditInstrumentClick, 
    onViewInstrumentDetails, onDeleteInstrument, initialTab, onExpressGradingClick, 
    onSaveRecoveryGrade, studentFilter, onClearStudentFilter, initialFundamentalFilter, 
    selectedClassId, onSelectClass, onAddStudentClick, onEditCompetency, onDeleteCompetency, 
    onCopyCompetency, onImportStudentsClick, onReplicateInstrument, onNavigate 
}) => {
    const headerControlsRef = useRef<HTMLDivElement>(null);

    const [selectedFundamentalFilter, setSelectedFundamentalFilter] = useState<string>('all');

    // State for Grades View
    const [gradeViewType, setGradeViewType] = useState<'summary' | 'period'>('period');
    const [selectedPeriod, setSelectedPeriod] = useState<EvaluationPeriod>(getCurrentEvaluationPeriod());
    const [periodCompetencyFilter, setPeriodCompetencyFilter] = useState<string>('all');
    const [showRecoveryGrades, setShowRecoveryGrades] = useState(false);
    const [columnView, setColumnView] = useState<'all' | 'instruments' | 'averages' | 'recovery'>('all');
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [mobileColumnView, setMobileColumnView] = useState<'averages' | 'instruments'>('averages');

    // Modals state
    const [isInstrumentsModalOpen, setIsInstrumentsModalOpen] = useState(false);
    const [isCompetenciesModalOpen, setIsCompetenciesModalOpen] = useState(false);
    
    // Status filters state
    const [showStatusFilters, setShowStatusFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'recovery' | 'empty' | 'merit' | null>(null);
    
    // Recovery Modal State
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
    const [recoveryContext, setRecoveryContext] = useState<{ student: Student, period: EvaluationPeriod, competencyGroup: CompetencyGroup, currentScore: number | null } | null>(null);

    const [activeTab, setActiveTab] = useState<'GRADES' | 'INSTRUMENTS' | 'COMPETENCIES'>('GRADES');

    // Teams state
    const [teams, setTeams] = useState<WorkTeam[]>([]);
    const [teamFilter, setTeamFilter] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = api.subscribeToTeams((data) => {
            setTeams(data);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (initialTab === 'INSTRUMENTS') {
            setIsInstrumentsModalOpen(true);
        } else if (initialTab === 'COMPETENCIES') {
            setIsCompetenciesModalOpen(true);
        }
        setActiveTab('GRADES');
    }, [initialTab]);

    useEffect(() => {
        if (initialFundamentalFilter && fundamentalCompetencies.some(fc => fc.id === initialFundamentalFilter)) {
            setSelectedFundamentalFilter(initialFundamentalFilter);
        }
    }, [initialFundamentalFilter, fundamentalCompetencies]);

    useEffect(() => {
        setGradeViewType('period');
        setPeriodCompetencyFilter('all');
        setShowRecoveryGrades(false);
        setExpandedStudentId(null);
    }, [selectedClassId]);

    // Use Custom Hook for Data processing
    const {
        competencyGroups,
        groupNames,
        isPrimario,
        gradeSheetData,
        periodDetailData,
        classInstruments,
        classCompetencies,
        hasStudents,
        competencyToGroupMap
    } = useGradebookData({
        classes,
        selectedClassId,
        fundamentalCompetencies,
        competencies,
        instruments,
        students,
        studentFilter,
        grades,
        recoveryGrades,
        gradeViewType,
        selectedPeriod,
        periodCompetencyFilter,
        searchQuery,
        teamFilter,
        teams
    });

    const minPassing = isPrimario ? 65 : 70;

    const filteredGradeSheetData = useMemo(() => {
        if (!statusFilter) return gradeSheetData;

        const filteredStudents = gradeSheetData.classStudents.filter(student => {
            const scores = gradeSheetData.data.get(student.id);
            if (!scores) return false;

            if (statusFilter === 'recovery') {
                return competencyGroups.some(g => {
                    const pcScore = scores[`PC${g.slice(1)}`];
                    return pcScore !== null && pcScore < minPassing;
                });
            }
            if (statusFilter === 'empty') {
                return scores['final'] === null;
            }
            if (statusFilter === 'merit') {
                const finalScore = scores['final'];
                return finalScore !== null && finalScore >= 90;
            }
            return true;
        });

        return { ...gradeSheetData, classStudents: filteredStudents };
    }, [gradeSheetData, statusFilter, competencyGroups, minPassing]);

    const filteredPeriodDetailData = useMemo(() => {
        if (!statusFilter) return periodDetailData;

        const filteredGrades = periodDetailData.studentPeriodGrades.filter(pDetails => {
            if (statusFilter === 'recovery') {
                return competencyGroups.some(g => pDetails.originalPcScores[g] !== null && pDetails.originalPcScores[g]! < minPassing);
            }
            if (statusFilter === 'empty') {
                return Object.values(pDetails.instrumentGrades).some(ig => ig.score === null);
            }
            if (statusFilter === 'merit') {
                return pDetails.periodAverage !== null && pDetails.periodAverage >= 90;
            }
            return true;
        });

        return { ...periodDetailData, studentPeriodGrades: filteredGrades };
    }, [periodDetailData, statusFilter, competencyGroups, minPassing]);

    const handleOpenRecoveryModal = (student: Student, period: EvaluationPeriod, competencyGroup: CompetencyGroup, currentScore: number | null) => {
        setRecoveryContext({ student, period, competencyGroup, currentScore });
        setIsRecoveryModalOpen(true);
    };

    const handleSaveAndContinue = async (gradeData: Omit<RecoveryGrade, 'id'>) => {
        await onSaveRecoveryGrade(gradeData);

        if (!recoveryContext) {
            setIsRecoveryModalOpen(false);
            return;
        }

        const students = gradeSheetData.classStudents;
        const currentIndex = students.findIndex(s => s.id === recoveryContext.student.id);
        if (currentIndex === -1) {
            setIsRecoveryModalOpen(false);
            return;
        }

        let nextStudentFound = false;
        for (let i = currentIndex + 1; i < students.length; i++) {
            const student = students[i];
            const pDetails = periodDetailData.studentPeriodGrades.find(p => p.student.id === student.id);
            
            if (pDetails) {
                const originalScore = pDetails.originalPcScores[recoveryContext.competencyGroup];
                const hasRecovery = pDetails.recoveryPeriodGrades[recoveryContext.competencyGroup] !== null;
                const minPassing = isPrimario ? 65 : 70;

                if (originalScore !== null && originalScore < minPassing && !hasRecovery) {
                    setRecoveryContext({
                        student,
                        period: recoveryContext.period,
                        competencyGroup: recoveryContext.competencyGroup,
                        currentScore: originalScore
                    });
                    nextStudentFound = true;
                    break;
                }
            }
        }

        if (!nextStudentFound) {
            setIsRecoveryModalOpen(false);
            setRecoveryContext(null);
        }
    };

    const renderGradesView = () => {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md flex flex-col sticky top-0 z-10 max-h-[calc(100dvh-12rem)] md:max-h-[calc(100vh-6rem)]">
                {/* Header Controls */}
                <GradebookControls 
                    ref={headerControlsRef}
                    gradeViewType={gradeViewType}
                    setGradeViewType={setGradeViewType}
                    selectedPeriod={selectedPeriod}
                    setSelectedPeriod={setSelectedPeriod}
                    evaluationPeriods={evaluationPeriods}
                    periodCompetencyFilter={periodCompetencyFilter}
                    setPeriodCompetencyFilter={setPeriodCompetencyFilter}
                    competencyGroups={competencyGroups}
                    groupNames={groupNames}
                    fundamentalCompetencies={fundamentalCompetencies}
                    showRecoveryGrades={showRecoveryGrades}
                    setShowRecoveryGrades={setShowRecoveryGrades}
                    columnView={columnView}
                    setColumnView={setColumnView}
                    setIsInstrumentsModalOpen={setIsInstrumentsModalOpen}
                    setIsCompetenciesModalOpen={setIsCompetenciesModalOpen}
                    studentFilter={studentFilter}
                    students={students}
                    onClearStudentFilter={onClearStudentFilter}
                    setExpandedStudentId={setExpandedStudentId}
                    mobileColumnView={mobileColumnView}
                    setMobileColumnView={setMobileColumnView}
                    showStatusFilters={showStatusFilters}
                    setShowStatusFilters={setShowStatusFilters}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    teams={teams.filter(t => {
                        const currentClass = classes.find(c => c.id === selectedClassId);
                        return t.classId === selectedClassId || (currentClass?.groupId && t.groupId === currentClass.groupId);
                    })}
                    teamFilter={teamFilter}
                    setTeamFilter={setTeamFilter}
                />

                {/* Scrollable content area */}
                <div className="flex-1 overflow-auto min-h-0 rounded-b-xl">
                    {hasStudents ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                {gradeViewType === 'summary' && (
                                    <DesktopSummaryTable 
                                        competencyGroups={competencyGroups}
                                        groupNames={groupNames}
                                        gradeSheetData={filteredGradeSheetData}
                                    />
                                )}

                                {gradeViewType === 'period' && (
                                    <>
                                        {periodDetailData.periodInstruments.length > 0 ? (
                                            <DesktopPeriodTable 
                                                periodDetailData={filteredPeriodDetailData}
                                                competencyGroups={competencyGroups}
                                                showRecoveryGrades={showRecoveryGrades}
                                                columnView={columnView}
                                                selectedPeriod={selectedPeriod}
                                                onViewInstrumentDetails={onViewInstrumentDetails}
                                                onExpressGradingClick={onExpressGradingClick}
                                                onAddRecoveryGradeClick={handleOpenRecoveryModal}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                                                <AcademicCapIcon className="w-12 h-12 mb-3 opacity-20" />
                                                <p className="font-medium">No hay instrumentos de evaluación para este período.</p>
                                                <button onClick={() => onAddInstrumentClick({ period: selectedPeriod })} className="mt-4 text-indigo-600 hover:underline text-sm">Añadir Instrumento</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Mobile Grid View */}
                            <div className="md:hidden">
                                <MobileGradeGrid
                                    students={filteredGradeSheetData.classStudents}
                                    gradeData={filteredGradeSheetData.data}
                                    competencyGroups={competencyGroups}
                                    groupNames={groupNames}
                                    viewType={gradeViewType}
                                    selectedPeriod={selectedPeriod}
                                    showRecoveryGrades={showRecoveryGrades}
                                    getGradeColor={getGradeColor}
                                    periodDetailData={filteredPeriodDetailData as any}
                                    instruments={classInstruments}
                                    onExpressGradingClick={onExpressGradingClick}
                                    competencyToGroupMap={competencyToGroupMap}
                                    onAddRecoveryGradeClick={handleOpenRecoveryModal}
                                    onAddInstrumentClick={onAddInstrumentClick}
                                    mobileColumnView={mobileColumnView}
                                />
                            </div>
                        </>
                    ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mx-4 sm:mx-6 mb-4 sm:mb-6">
                            {searchQuery.trim() !== '' ? (
                                <>
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-2">
                                        <SearchIcon className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 font-bold">No se encontraron resultados para "{searchQuery}"</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Intenta con otro término de búsqueda o limpia el filtro.</p>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Limpiar búsqueda
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">No hay estudiantes en esta clase.</p>
                                    {selectedClassId && (
                                        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                                            <button
                                                onClick={() => onAddStudentClick(selectedClassId)}
                                                className="inline-flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                            >
                                                <PlusIcon className="w-5 h-5 mr-2" />
                                                Añadir Estudiante
                                            </button>
                                            <button
                                                onClick={onImportStudentsClick}
                                                className="inline-flex items-center bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                            >
                                                <DocumentAddIcon className="w-5 h-5 mr-2" />
                                                Importar Lista
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Mobile Class Selector & Search */}
            <div className="md:hidden p-4 pb-0 flex gap-2 h-[62px]">
                {isSearchOpen ? (
                    <div className="flex-1 flex items-center bg-white dark:bg-slate-800 rounded-xl border border-indigo-300 dark:border-indigo-600 shadow-sm animate-in slide-in-from-right-4 duration-200 overflow-hidden">
                        <SearchIcon className="w-5 h-5 text-indigo-500 ml-3 shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar estudiante..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-slate-800 dark:text-slate-100 font-medium outline-none min-w-0 w-full"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                            }}
                            className="px-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-l border-slate-200 dark:border-slate-700 h-full"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 min-w-0">
                            <ClassSelector
                                classes={classes}
                                selectedClassId={selectedClassId}
                                onSelectClass={onSelectClass}
                                size="default"
                            />
                        </div>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="shrink-0 flex items-center justify-center w-[46px] h-[46px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                            aria-label="Buscar estudiante"
                        >
                            <SearchIcon className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>

            <div className="p-4 sm:p-8 space-y-6">

                {/* Content */}
                {activeTab === 'GRADES' && renderGradesView()}

                <InstrumentsManagerModal
                    isOpen={isInstrumentsModalOpen}
                    onClose={() => setIsInstrumentsModalOpen(false)}
                    classInstruments={classInstruments}
                    evaluationPeriods={evaluationPeriods}
                    competencyGroups={competencyGroups}
                    competencyToGroupMap={competencyToGroupMap}
                    groupNames={groupNames}
                    onAddInstrumentClick={onAddInstrumentClick}
                    onEditInstrumentClick={onEditInstrumentClick}
                    onViewInstrumentDetails={onViewInstrumentDetails}
                    onExpressGradingClick={onExpressGradingClick}
                    onDeleteInstrument={onDeleteInstrument}
                    onReplicateInstrument={onReplicateInstrument}
                    classes={classes}
                    selectedClassId={selectedClassId}
                    initialPeriod={selectedPeriod}
                />

                <CompetenciesManagerModal
                    isOpen={isCompetenciesModalOpen}
                    onClose={() => setIsCompetenciesModalOpen(false)}
                    classCompetencies={classCompetencies}
                    competencyGroups={competencyGroups}
                    fundamentalCompetencies={fundamentalCompetencies}
                    groupNames={groupNames}
                    onAddCompetencyClick={onAddCompetencyClick}
                    onEditCompetency={onEditCompetency}
                    onDeleteCompetency={onDeleteCompetency}
                    onCopyCompetency={onCopyCompetency}
                />

                <AddRecoveryGradeModal 
                    isOpen={isRecoveryModalOpen} 
                    onClose={() => { setIsRecoveryModalOpen(false); setRecoveryContext(null); }} 
                    context={recoveryContext} 
                    onSave={async (grade) => { await onSaveRecoveryGrade(grade); setIsRecoveryModalOpen(false); setRecoveryContext(null); }} 
                    onSaveAndContinue={handleSaveAndContinue} 
                />
            </div>
        </div>
    );
};
