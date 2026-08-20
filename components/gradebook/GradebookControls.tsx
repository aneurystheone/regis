import React, { useState, forwardRef } from 'react';
import { ChevronDownIcon, MoreHorizontalIcon, MoreVerticalIcon, DocumentTextIcon, BoltIcon, PencilIcon, ChartBarIcon, XIcon, UserGroupIcon } from '../icons';
import type { EvaluationPeriod, CompetencyGroup, FundamentalCompetency, Student, WorkTeam } from '../../types';

interface GradebookControlsProps {
    gradeViewType: 'summary' | 'period';
    setGradeViewType: (type: 'summary' | 'period') => void;
    selectedPeriod: EvaluationPeriod;
    setSelectedPeriod: (period: EvaluationPeriod) => void;
    evaluationPeriods: EvaluationPeriod[];
    periodCompetencyFilter: string;
    setPeriodCompetencyFilter: (filter: string) => void;
    competencyGroups: CompetencyGroup[];
    groupNames: Record<CompetencyGroup, string>;
    fundamentalCompetencies: FundamentalCompetency[];
    showRecoveryGrades: boolean;
    setShowRecoveryGrades: (show: boolean) => void;
    setIsInstrumentsModalOpen: (open: boolean) => void;
    setIsCompetenciesModalOpen: (open: boolean) => void;
    columnView?: 'all' | 'instruments' | 'averages' | 'recovery';
    setColumnView?: (view: 'all' | 'instruments' | 'averages' | 'recovery') => void;
    studentFilter: string | null;
    students: Student[];
    onClearStudentFilter: () => void;
    setExpandedStudentId: (id: string | null) => void;
    mobileColumnView: 'averages' | 'instruments';
    setMobileColumnView: (view: 'averages' | 'instruments') => void;
    showStatusFilters: boolean;
    setShowStatusFilters: (show: boolean) => void;
    statusFilter: 'recovery' | 'empty' | 'merit' | null;
    setStatusFilter: (filter: 'recovery' | 'empty' | 'merit' | null) => void;
    teams?: WorkTeam[];
    teamFilter?: string | null;
    setTeamFilter?: (teamId: string | null) => void;
}

export const GradebookControls = forwardRef<HTMLDivElement, GradebookControlsProps>(({
    gradeViewType,
    setGradeViewType,
    selectedPeriod,
    setSelectedPeriod,
    evaluationPeriods,
    periodCompetencyFilter,
    setPeriodCompetencyFilter,
    competencyGroups,
    groupNames,
    fundamentalCompetencies,
    showRecoveryGrades,
    setShowRecoveryGrades,
    columnView = 'all',
    setColumnView,
    setIsInstrumentsModalOpen,
    setIsCompetenciesModalOpen,
    studentFilter,
    students,
    onClearStudentFilter,
    setExpandedStudentId,
    mobileColumnView,
    setMobileColumnView,
    showStatusFilters,
    setShowStatusFilters,
    statusFilter,
    setStatusFilter,
    teams,
    teamFilter,
    setTeamFilter
}, ref) => {
    const [showViewMenu, setShowViewMenu] = useState(false);

    return (
        <div
            ref={ref}
            className="flex-shrink-0 bg-white dark:bg-slate-800 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-slate-100 dark:border-slate-700/50 flex flex-col gap-4 rounded-t-xl z-30"
        >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                {/* Main Controls Group */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 w-full flex-1">

                    {/* Period Selector + Options */}
                    <div className="flex flex-row items-center gap-2 w-full">
                        {/* Period Selector */}
                        <div className="relative flex-1 md:flex-none md:w-auto md:min-w-[190px] z-20">
                            <label htmlFor="view-selector" className="sr-only">Seleccionar Vista</label>
                            <select
                                id="view-selector"
                                value={gradeViewType === 'summary' ? 'summary' : selectedPeriod}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'summary') {
                                        setGradeViewType('summary');
                                    } else {
                                        setGradeViewType('period');
                                        setSelectedPeriod(value as EvaluationPeriod);
                                    }
                                    setExpandedStudentId(null);
                                }}
                                className="block w-full pl-3 pr-8 py-2 text-sm font-bold border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl shadow-sm cursor-pointer hover:border-indigo-300 transition-all appearance-none"
                            >
                                {evaluationPeriods.map(p => (
                                    <option key={p} value={p}>📅 Período {p.slice(1)}</option>
                                ))}
                                <option value="summary" className="font-bold text-indigo-600">📊 Resumen Anual</option>
                            </select>
                            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        {gradeViewType === 'period' && (
                            <>
                                {/* 2. Competency Filter */}
                                <div className="relative hidden md:block z-20 md:min-w-[200px] max-w-[240px]">
                                    <select
                                        id="period-competency-filter"
                                        value={periodCompetencyFilter}
                                        onChange={(e) => setPeriodCompetencyFilter(e.target.value)}
                                        className="block w-full pl-3 pr-8 py-2 text-sm font-bold border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl shadow-sm cursor-pointer hover:border-indigo-300 transition-all appearance-none"
                                    >
                                        <option value="all">Todas las Competencias</option>
                                        <optgroup label="Grupos">
                                            {competencyGroups.map(g => (
                                                <option key={`group-${g}`} value={`group-${g}`}>{groupNames[g]}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Fundamentales">
                                            {fundamentalCompetencies.map(fc => (
                                                <option key={fc.id} value={fc.id}>{fc.name}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>

                                {/* 3. "Mostrar" Dropdown (Category view: Instrumentos, Promedios, Recuperaciones) */}
                                <div className="relative z-20 min-w-[120px] max-w-[160px]">
                                    <select
                                        value={columnView}
                                        onChange={(e) => {
                                            const val = e.target.value as 'all' | 'instruments' | 'averages' | 'recovery';
                                            setColumnView?.(val);
                                            if (val === 'recovery') {
                                                setShowRecoveryGrades(true);
                                            } else {
                                                setShowRecoveryGrades(false);
                                            }
                                            if (val === 'instruments' || val === 'averages') {
                                                setMobileColumnView(val);
                                            }
                                        }}
                                        className="block w-full pl-3 pr-8 py-2 text-sm font-bold border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl shadow-sm cursor-pointer hover:border-indigo-300 transition-all appearance-none"
                                    >
                                        <option value="all">Mostrar</option>
                                        <option value="instruments">Instrumentos</option>
                                        <option value="averages">Promedios</option>
                                        <option value="recovery">Recuperaciones</option>
                                    </select>
                                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>

                                {/* 4. Unified Team and Status Filter ("Todos los estudiantes") */}
                                <div className="relative z-20 min-w-[170px] max-w-[210px]">
                                    <select
                                        value={teamFilter ? `team_${teamFilter}` : statusFilter ? `status_${statusFilter}` : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) {
                                                setTeamFilter?.(null);
                                                setStatusFilter?.(null);
                                            } else if (val.startsWith('team_')) {
                                                setTeamFilter?.(val.replace('team_', ''));
                                                setStatusFilter?.(null);
                                            } else if (val.startsWith('status_')) {
                                                setStatusFilter?.(val.replace('status_', '') as any);
                                                setTeamFilter?.(null);
                                            }
                                        }}
                                        className="block w-full pl-3 pr-8 py-2 text-sm font-bold border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl shadow-sm cursor-pointer hover:border-indigo-300 transition-all appearance-none"
                                    >
                                        <option value="">Todos los estudiantes</option>
                                        {teams && teams.length > 0 && (
                                            <optgroup label="Equipos">
                                                {teams.map(t => (
                                                    <option key={t.id} value={`team_${t.id}`}>{t.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                        <optgroup label="Condición Académica">
                                            <option value="status_recovery">En recuperación</option>
                                            <option value="status_merit">Meritorios</option>
                                            <option value="status_empty">Nota vacía</option>
                                        </optgroup>
                                    </select>
                                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>

                                {/* Mobile Toggle: Instruments vs Averages */}
                                <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                                    <button
                                        onClick={() => setMobileColumnView('instruments')}
                                        className={`p-1.5 rounded-md transition-colors ${mobileColumnView === 'instruments' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                                        title="Ver Instrumentos"
                                    >
                                        <DocumentTextIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setMobileColumnView('averages')}
                                        className={`p-1.5 rounded-md transition-colors ${mobileColumnView === 'averages' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                                        title="Ver Promedios"
                                    >
                                        <ChartBarIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* 4. Más opciones */}
                        <div className="relative ml-auto">
                            <button
                                onClick={() => setShowViewMenu(!showViewMenu)}
                                className={`flex-shrink-0 flex items-center justify-center font-bold text-sm w-9 h-9 rounded-lg transition-all focus:outline-none ${showViewMenu ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-2 ring-indigo-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                title="Más opciones"
                                aria-expanded={showViewMenu}
                            >
                                <MoreHorizontalIcon className="hidden md:block w-5 h-5" />
                                <MoreVerticalIcon className="md:hidden w-5 h-5" />
                            </button>

                            {showViewMenu && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowViewMenu(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 z-40 animate-in fade-in zoom-in duration-200">
                                        <button
                                            onClick={() => { setIsInstrumentsModalOpen(true); setShowViewMenu(false); }}
                                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <DocumentTextIcon className="w-4 h-4 mr-3 text-slate-400" />
                                            Instrumentos
                                        </button>
                                        <button
                                            onClick={() => { setIsCompetenciesModalOpen(true); setShowViewMenu(false); }}
                                            className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <BoltIcon className="w-4 h-4 mr-3 text-slate-400" />
                                            Competencias
                                        </button>

                                    </div>
                                </>
                            )}
                        </div>

                    </div>
                </div>

                {/* Active Filters Row */}
                {(studentFilter || statusFilter || teamFilter) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                        
                        {teamFilter && (
                            <button 
                                onClick={() => setTeamFilter?.(null)} 
                                className="flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 ring-2 ring-fuchsia-500/50 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/70"
                                title="Eliminar filtro de equipo"
                            >
                                <span className="mr-1">Equipo: {teams?.find(t => t.id === teamFilter)?.name}</span>
                                <XIcon className="w-4 h-4 ml-1" />
                            </button>
                        )}

                        {statusFilter && (
                            <button 
                                onClick={() => setStatusFilter?.(null)} 
                                className="flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ring-2 ring-amber-500/50 hover:bg-amber-200 dark:hover:bg-amber-900/70"
                                title="Eliminar filtro de condición"
                            >
                                <span className="mr-1">
                                    {statusFilter === 'recovery' ? 'En recuperación' : statusFilter === 'empty' ? 'Nota vacía' : 'Meritorios'}
                                </span>
                                <XIcon className="w-4 h-4 ml-1" />
                            </button>
                        )}
                        
                        {studentFilter && (
                            <button 
                                onClick={onClearStudentFilter} 
                                className="flex items-center px-3 py-1.5 text-sm font-medium rounded-full transition-colors bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-2 ring-indigo-500/50 hover:bg-indigo-200 dark:hover:bg-indigo-900/70"
                                title="Eliminar filtro de estudiante"
                            >
                                <span className="mr-1">Estudiante: {students.find(s => s.id === studentFilter)?.name?.split(' ')[0]}</span>
                                <XIcon className="w-4 h-4 ml-1" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

GradebookControls.displayName = 'GradebookControls';
