import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Student, CompetencyGroup, EvaluationPeriod, EvaluationInstrument } from '../types';
import { Avatar } from './Avatar';
import { ChevronDownIcon } from './icons';

interface PeriodDetailData {
    periodInstruments: EvaluationInstrument[];
    studentPeriodGrades: Array<{
        student: Student;
        instrumentGrades: Record<string, { score: number | null; instrument: EvaluationInstrument }>;
        periodAverage: number | null;
        originalPcScores: { [key in CompetencyGroup]?: number | null };
        pcScores: { [key in CompetencyGroup]?: number | null };
        recoveryPeriodGrades: { [key in CompetencyGroup]?: number | null };
    }>;
    periodHeaderGroups: Array<{ group: string; name: string; colSpan: number }>;
}

interface MobileGradeGridProps {
    students: Student[];
    gradeData: Map<string, Record<string, number | null>>;
    competencyGroups: CompetencyGroup[];
    groupNames: Record<CompetencyGroup, string>;
    viewType: 'summary' | 'period';
    selectedPeriod?: EvaluationPeriod;
    showRecoveryGrades?: boolean;
    getGradeColor: (score: number | null, isFinal?: boolean) => string;
    periodDetailData?: PeriodDetailData;
    instruments?: EvaluationInstrument[];
    onExpressGradingClick?: (instrument: EvaluationInstrument, studentId?: string) => void;
    competencyToGroupMap?: Map<string, CompetencyGroup>;
    onAddRecoveryGradeClick?: (student: Student, period: EvaluationPeriod, competencyGroup: CompetencyGroup, currentScore: number | null) => void;
    onAddInstrumentClick: (prefill?: { period?: EvaluationPeriod, competencyIds?: string[] }) => void;
    mobileColumnView?: 'averages' | 'instruments';
}

export const MobileGradeGrid: React.FC<MobileGradeGridProps> = ({
    students,
    gradeData,
    competencyGroups,
    groupNames,
    viewType,
    selectedPeriod,
    showRecoveryGrades = false,
    getGradeColor,
    periodDetailData,
    instruments = [],
    onExpressGradingClick,
    competencyToGroupMap,
    onAddRecoveryGradeClick,
    onAddInstrumentClick,
    mobileColumnView = 'averages'
}) => {
    const [gradeDetailModal, setGradeDetailModal] = useState<{
        student: Student;
        group: CompetencyGroup;
        groupName: string;
        instruments: Array<{ instrument: EvaluationInstrument; score: number | null }>;
    } | null>(null);

    // Track active tooltip for student names (mobile touch)
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // Handler to toggle tooltip
    const toggleTooltip = (e: React.MouseEvent, studentId: string) => {
        e.stopPropagation();
        if (activeTooltip === studentId) {
            setActiveTooltip(null);
        } else {
            setActiveTooltip(studentId);
            // Auto-hide after 3 seconds
            setTimeout(() => {
                setActiveTooltip(prev => prev === studentId ? null : prev);
            }, 3000);
        }
    };

    const handleCompetencyClick = (e: React.MouseEvent, student: Student, group: CompetencyGroup) => {
        e.stopPropagation(); // Prevent row expansion

        // Only allow modal in period view, not summary
        if (viewType !== 'period' || !periodDetailData || !competencyToGroupMap) return;

        // Find student's period grade data
        const studentData = periodDetailData.studentPeriodGrades.find(spg => spg.student.id === student.id);
        if (!studentData) return;

        // Get instruments for this competency group
        const groupInstruments = periodDetailData.periodInstruments
            .filter(inst => {
                // Check if any of the instrument's competencies belong to this group
                return inst.competencyIds.some(cid => competencyToGroupMap.get(cid) === group);
            })
            .map(inst => ({
                instrument: inst,
                score: studentData.instrumentGrades[inst.id]?.score ?? null
            }));

        setGradeDetailModal({
            student,
            group,
            groupName: groupNames[group],
            instruments: groupInstruments
        });
    };

    return (
        <div className="md:hidden min-w-max">
            {/* Scrollable Grid */}
            <div>
                <table className="w-full border-collapse text-sm">
                    {/* Fixed Header */}
                    <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-20">
                        <tr>
                            {/* Student column - sticky left */}
                            <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-700 px-3 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.3)] border-b border-slate-200 dark:border-slate-600">
                                Estudiante
                            </th>

                            {/* Columns based on mobileColumnView */}
                            {mobileColumnView === 'averages' ? (
                                <>
                                    {/* Competency group columns */}
                                    {competencyGroups.map(group => (
                                        <React.Fragment key={group}>
                                            <th
                                                className="px-2 py-3 text-center min-w-[70px] border-b border-slate-200 dark:border-slate-600"
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                                        {groupNames[group].split(' ')[0]}...
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                        G{group.slice(1)}
                                                    </span>
                                                </div>
                                            </th>

                                            {/* RP Column Header */}
                                            {showRecoveryGrades && (
                                                <th className="px-2 py-3 text-center min-w-[70px] bg-amber-50 dark:bg-amber-900/20 border-b border-slate-200 dark:border-slate-600">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                                                            RP
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                                            G{group.slice(1)}
                                                        </span>
                                                    </div>
                                                </th>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {/* Instrument columns */}
                                    {periodDetailData?.periodInstruments.map(inst => (
                                        <th
                                            key={inst.id}
                                            className="px-2 py-3 text-center min-w-[90px] border-b border-slate-200 dark:border-slate-600"
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[80px]" title={inst.name}>
                                                    {inst.name.length > 10 ? inst.name.substring(0, 10) + '...' : inst.name}
                                                </span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                    {inst.totalPoints}pts
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                    {(!periodDetailData?.periodInstruments || periodDetailData.periodInstruments.length === 0) && viewType === 'period' && (
                                        <th className="px-4 py-3 text-center text-xs text-slate-400 border-b border-slate-200 dark:border-slate-600 font-normal">
                                            Sin instrumentos
                                        </th>
                                    )}
                                </>
                            )}

                            {/* Final/Average column - scrollable */}
                            <th className="px-3 py-3 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider min-w-[80px] border-b border-slate-200 dark:border-slate-600">
                                {viewType === 'period' ? 'Prom.' : 'Final'}
                            </th>
                        </tr>
                    </thead>

                    {/* Scrollable Body */}
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {/* Summary View */}
                        {viewType === 'summary' && students.map((student, idx) => {
                            const scores = gradeData.get(student.id) || {};
                            const isEven = idx % 2 === 0;
                            // Solid backgrounds for sticky columns
                            const stickyBg = isEven ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800';
                            // Row background (can use opacity for non-sticky)
                            const rowBg = isEven ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50';

                            return (
                                <tr
                                    key={student.id}
                                    className={`${rowBg}`}
                                >
                                    {/* Student name - sticky left */}
                                    <td className={`sticky left-0 ${activeTooltip === student.id ? 'z-30' : 'z-10'} ${stickyBg} px-3 py-3 shadow-[2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.2)] border-r border-slate-100 dark:border-slate-700`}>
                                        <div className="flex items-center gap-3 min-w-[140px] relative" onClick={(e) => toggleTooltip(e, student.id)}>
                                            <span className="text-slate-400 font-bold text-xs min-w-[20px] text-center">
                                                {student.orderNumber || '#'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate font-bold text-sm text-slate-800 dark:text-slate-100" title={student.name}>
                                                    {student.firstName ? student.firstName.split(' ')[0] : student.name.split(' ')[0]}
                                                </div>
                                            </div>

                                            {/* Tooltip */}
                                            {activeTooltip === student.id && (
                                                <div className="absolute left-10 bottom-full mb-2 z-50 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl whitespace-nowrap animate-fade-in">
                                                    <div className="font-bold">{student.name}</div>
                                                    <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Group grades */}
                                    {competencyGroups.map(group => {
                                        const score = scores[`PC${group.slice(1)}`];
                                        const rpScore = scores[`RP${group.slice(1)}`];
                                        return (
                                            <React.Fragment key={group}>
                                                <td className="px-2 py-3 text-center">
                                                    <span className={`
                                                            inline-flex items-center justify-center
                                                            w-12 h-9 rounded-md font-bold text-sm
                                                            ${getGradeColor(score)}
                                                        `}>
                                                        {score ?? '-'}
                                                    </span>
                                                </td>

                                                {/* RP Cell */}
                                                {showRecoveryGrades && (
                                                    <td className="px-2 py-3 text-center bg-amber-50/50 dark:bg-amber-900/10">
                                                        <span className={`
                                                                inline-flex items-center justify-center
                                                                w-12 h-9 rounded-md font-bold text-sm
                                                                ${rpScore ? getGradeColor(rpScore) : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}
                                                            `}>
                                                            {rpScore ?? '-'}
                                                        </span>
                                                    </td>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}

                                    {/* Final grade */}
                                    <td className="px-3 py-3 text-center">
                                        <span className={`
                                                inline-flex items-center justify-center
                                                w-14 h-10 rounded-lg font-bold text-lg
                                                ${getGradeColor(scores['final'], true)}
                                            `}>
                                            {scores['final'] ?? '-'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Period View */}
                        {viewType === 'period' && periodDetailData && periodDetailData.studentPeriodGrades.map(({ student, pcScores, periodAverage, recoveryPeriodGrades, originalPcScores }, idx) => {
                            const isEven = idx % 2 === 0;
                            // Solid backgrounds for sticky columns
                            const stickyBg = isEven ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800';
                            // Row background
                            const rowBg = isEven ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50';

                            return (
                                <React.Fragment key={student.id}>
                                    <tr
                                        className={`${rowBg}`}
                                    >
                                        {/* Student name */}
                                        <td className={`sticky left-0 ${activeTooltip === student.id ? 'z-30' : 'z-10'} ${stickyBg} px-3 py-3 shadow-[2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.2)] border-r border-slate-100 dark:border-slate-700`}>
                                            <div className="flex items-center gap-3 min-w-[140px] relative" onClick={(e) => toggleTooltip(e, student.id)}>
                                                <span className="text-slate-400 font-bold text-xs min-w-[20px] text-center">
                                                    {student.orderNumber || '#'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate font-bold text-sm text-slate-800 dark:text-slate-100" title={student.name}>
                                                        {student.firstName ? student.firstName.split(' ')[0] : student.name.split(' ')[0]}
                                                    </div>
                                                </div>

                                                {/* Tooltip */}
                                                {activeTooltip === student.id && (
                                                    <div className="absolute left-10 bottom-full mb-2 z-50 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl whitespace-nowrap animate-fade-in">
                                                        <div className="font-bold">{student.name}</div>
                                                        <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Period scores based on mobileColumnView */}
                                        {mobileColumnView === 'averages' ? (
                                            <>
                                                {competencyGroups.map(group => {
                                                    const score = originalPcScores?.[group];
                                                    const rpScore = recoveryPeriodGrades[group];
                                                    return (
                                                        <React.Fragment key={group}>
                                                            <td
                                                                className="px-2 py-3 text-center"
                                                                onClick={(e) => handleCompetencyClick(e, student, group)}
                                                            >
                                                                <span className={`
                                                                    inline-flex items-center justify-center
                                                                    w-12 h-9 rounded-md font-bold text-sm
                                                                    ${getGradeColor(score)}
                                                                    cursor-pointer active:scale-95 transition-transform
                                                                `}>
                                                                    {score ?? '-'}
                                                                </span>
                                                            </td>

                                                            {/* RP Cell */}
                                                            {showRecoveryGrades && (
                                                                <td
                                                                    className="px-2 py-3 text-center bg-amber-50/50 dark:bg-amber-900/10 cursor-pointer active:bg-amber-100 dark:active:bg-amber-900/30 transition-colors"
                                                                    onClick={(e) => {
                                                                        if (onAddRecoveryGradeClick && selectedPeriod) {
                                                                            e.stopPropagation();
                                                                            onAddRecoveryGradeClick(student, selectedPeriod, group, rpScore ?? null);
                                                                        }
                                                                    }}
                                                                >
                                                                    <span className={`
                                                                        inline-flex items-center justify-center
                                                                        w-12 h-9 rounded-md font-bold text-sm
                                                                        ${rpScore ? getGradeColor(rpScore) : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}
                                                                    `}>
                                                                        {rpScore ?? '-'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <>
                                                {periodDetailData?.periodInstruments.map(inst => {
                                                    const scoreData = periodDetailData.studentPeriodGrades.find(spg => spg.student.id === student.id)?.instrumentGrades[inst.id];
                                                    const score = scoreData?.score ?? null;
                                                    return (
                                                        <td
                                                            key={inst.id}
                                                            className="px-2 py-3 text-center"
                                                            onClick={(e) => {
                                                                if (onExpressGradingClick) {
                                                                    e.stopPropagation();
                                                                    onExpressGradingClick(inst, student.id);
                                                                }
                                                            }}
                                                        >
                                                            <span className={`
                                                                inline-flex items-center justify-center
                                                                w-12 h-9 rounded-md font-bold text-sm
                                                                ${getGradeColor(score)}
                                                                cursor-pointer active:scale-95 transition-transform
                                                            `}>
                                                                {score ?? '-'}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                {(!periodDetailData?.periodInstruments || periodDetailData.periodInstruments.length === 0) && (
                                                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                                                        -
                                                    </td>
                                                )}
                                            </>
                                        )}

                                        {/* Period average */}
                                        <td className="px-3 py-3 text-center">
                                            <span className={`
                                                inline-flex items-center justify-center
                                                w-14 h-10 rounded-lg font-bold text-lg
                                                ${getGradeColor(periodAverage, true)}
                                            `}>
                                                {periodAverage ?? '-'}
                                            </span>
                                        </td>
                                    </tr>

                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div >

            {/* Footer hint */}
            < div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 text-center" >
                💡 {viewType === 'period' ? 'Toca una calificación para ver detalles • ' : ''}Desliza para ver más columnas
            </div >

            {/* Grade Detail Modal */}
            {
                gradeDetailModal && typeof document !== 'undefined' && createPortal(
                    <div
                        className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center animate-fadeIn backdrop-blur-md"
                        onClick={() => setGradeDetailModal(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-800 rounded-t-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl animate-slideUp"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-4 text-white z-10">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-bold text-lg truncate">
                                        {gradeDetailModal.student.firstName} {gradeDetailModal.student.lastName || ''}
                                    </h3>
                                    <button
                                        onClick={() => setGradeDetailModal(null)}
                                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm opacity-90">
                                    {gradeDetailModal.groupName} • {selectedPeriod}
                                </p>
                            </div>

                            {/* Action Row */}
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700 flex justify-end">
                                <button
                                    onClick={() => {
                                        if (onAddInstrumentClick && competencyToGroupMap && selectedPeriod) {
                                            const groupCompetencyIds: string[] = [];
                                            competencyToGroupMap.forEach((g, cid) => {
                                                if (g === gradeDetailModal.group) groupCompetencyIds.push(cid);
                                            });

                                            onAddInstrumentClick({
                                                period: selectedPeriod,
                                                competencyIds: groupCompetencyIds
                                            });
                                            setGradeDetailModal(null);
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Añadir Instrumento
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
                                {gradeDetailModal.instruments.length > 0 ? (
                                    <div className="space-y-3">
                                        {gradeDetailModal.instruments.map(({ instrument, score }) => (
                                            <div
                                                key={instrument.id}
                                                onClick={() => {
                                                    if (onExpressGradingClick) {
                                                        onExpressGradingClick(instrument, gradeDetailModal.student.id);
                                                        setGradeDetailModal(null);
                                                    }
                                                }}
                                                className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border-2 border-slate-200 dark:border-slate-600 active:scale-[0.98] active:bg-slate-100 dark:active:bg-slate-700 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">
                                                            {instrument.name}
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded">
                                                                {instrument.type}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{instrument.totalPoints} pts</span>
                                                            <span>•</span>
                                                            <span>{instrument.date}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`
                                                        inline-flex items-center justify-center
                                                        w-16 h-10 rounded-lg font-bold text-lg
                                                        shadow-sm
                                                        ${getGradeColor(score)}
                                                    `}>
                                                            {score ?? '-'}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold">
                                                            Tocar
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                        <p className="text-sm">No hay instrumentos en este grupo de competencia para {selectedPeriod}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div >
    );
};
