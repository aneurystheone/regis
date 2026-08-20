import React from 'react';
import { Avatar } from '../Avatar';
import type { CompetencyGroup, EvaluationPeriod, EvaluationInstrument, Student } from '../../types';
import { getGradeColor } from '../../hooks/useGradebookData';

interface DesktopPeriodTableProps {
    periodDetailData: {
        periodInstruments: EvaluationInstrument[];
        studentPeriodGrades: Array<{
            student: Student;
            instrumentGrades: Record<string, { score: number | null, instrument: EvaluationInstrument }>;
            periodAverage: number | null;
            originalPcScores: { [key in CompetencyGroup]?: number | null };
            pcScores: { [key in CompetencyGroup]?: number | null };
            recoveryPeriodGrades: { [key in CompetencyGroup]?: number | null };
        }>;
        periodHeaderGroups: { group: CompetencyGroup | 'N/A'; name: string; colSpan: number }[];
    };
    competencyGroups: CompetencyGroup[];
    showRecoveryGrades: boolean;
    columnView?: 'all' | 'instruments' | 'averages' | 'recovery';
    selectedPeriod: EvaluationPeriod;
    onViewInstrumentDetails: (instrument: EvaluationInstrument) => void;
    onExpressGradingClick: (instrument: EvaluationInstrument, studentId?: string) => void;
    onAddRecoveryGradeClick: (student: Student, period: EvaluationPeriod, competencyGroup: CompetencyGroup, currentScore: number | null) => void;
}

export const DesktopPeriodTable: React.FC<DesktopPeriodTableProps> = ({
    periodDetailData,
    competencyGroups,
    showRecoveryGrades,
    columnView = 'all',
    selectedPeriod,
    onViewInstrumentDetails,
    onExpressGradingClick,
    onAddRecoveryGradeClick
}) => {
    if (periodDetailData.periodInstruments.length === 0) return null;

    const showInstruments = columnView === 'all' || columnView === 'instruments';
    const showAverages = columnView === 'all' || columnView === 'averages' || columnView === 'recovery';
    const showRecovery = (columnView === 'recovery' || showRecoveryGrades) && showAverages;

    return (
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20">
                <tr>
                    <th rowSpan={2} className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-b-2 border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)] w-64">No. | Estudiante</th>
                    {showInstruments && periodDetailData.periodHeaderGroups.map((groupInfo, index) => (
                        <th
                            key={index}
                            colSpan={groupInfo.colSpan}
                            className="px-3 py-2 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 tracking-wider whitespace-nowrap border-b border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                        >
                            {groupInfo.name}
                        </th>
                    ))}
                    {showAverages && (
                        <th
                            colSpan={competencyGroups.length * (showRecovery ? 2 : 1)}
                            className="px-2 py-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700 border-l-2"
                        >
                            Promedios PC
                        </th>
                    )}
                    <th rowSpan={2} className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky right-0 bg-slate-100 dark:bg-slate-800 z-20 border-b-2 border-l-2 border-slate-200 dark:border-slate-700 align-middle whitespace-nowrap w-24" title="Promedio de los grupos de competencia en este período.">
                        {selectedPeriod}
                    </th>
                </tr>
                <tr>
                    {showInstruments && periodDetailData.periodInstruments.map(inst => (
                        <th key={inst.id} className="px-2 py-3 text-center font-medium text-slate-500 dark:text-slate-400 border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[100px] group">
                            <button
                                onClick={() => onViewInstrumentDetails(inst)}
                                className="flex flex-col items-center gap-1 w-full hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title={`Ver detalles de ${inst.name}`}
                            >
                                <span className="line-clamp-1 text-sm font-bold leading-tight">{inst.name}</span>
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{inst.totalPoints} pts</span>
                            </button>
                        </th>
                    ))}
                    {showAverages && competencyGroups.flatMap(group => [
                        <th key={`pc-header-${group}`} className="px-1 py-2 text-center text-sm font-bold text-slate-500 dark:text-slate-400 uppercase border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 min-w-[40px]" title="Promedio de los instrumentos evaluados en este grupo durante este período.">
                            G{group.slice(1)}
                        </th>,
                        showRecovery && (
                            <th key={`rp-header-${group}`} className="px-1 py-2 text-center text-sm font-bold text-blue-500 dark:text-blue-400 uppercase border-b-2 border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950 border-l border-slate-200 dark:border-slate-700 min-w-[40px]">
                                RP
                            </th>
                        )
                    ])}
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {periodDetailData.studentPeriodGrades.map(({ student, instrumentGrades, periodAverage, originalPcScores, pcScores, recoveryPeriodGrades }, idx) => {
                    const displayName = student.firstName || student.name;

                    return (
                        <tr key={student.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'}>
                            <td className="px-4 py-1 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100 sticky left-0 z-10 bg-inherit border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center gap-3">
                                    {student.orderNumber && (
                                        <span className="text-slate-400 font-bold min-w-[1.5rem] text-right">{student.orderNumber}</span>
                                    )}
                                    <div className="w-8 h-8 flex-shrink-0">
                                        <Avatar name={student.name} src={student.avatar} size="sm" />
                                    </div>
                                    <span className="truncate" title={student.name}>{displayName}</span>
                                </div>
                            </td>
                            {showInstruments && periodDetailData.periodInstruments.map(inst => {
                                const gradeInfo = instrumentGrades[inst.id];
                                return (
                                    <td key={inst.id} className="px-2 py-1 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => onExpressGradingClick(gradeInfo.instrument, student.id)}
                                            className={`inline-flex items-center justify-center w-10 h-8 rounded text-sm font-semibold transition-all hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getGradeColor(gradeInfo.score)}`}
                                        >
                                            {gradeInfo.score ?? '-'}
                                        </button>
                                    </td>
                                );
                            })}
                            {showAverages && competencyGroups.flatMap(group => [
                                <td key={`pc-cell-${group}`} className="px-1 py-1 whitespace-nowrap text-center border-l border-slate-200 dark:border-slate-700">
                                    <span className={`inline-flex items-center justify-center w-10 h-8 rounded text-sm ${getGradeColor(originalPcScores[group])}`}>
                                        {originalPcScores[group] ?? '-'}
                                    </span>
                                </td>,
                                showRecovery && (
                                    <td 
                                        key={`rp-cell-${group}`} 
                                        className="px-1 py-1 whitespace-nowrap text-center border-l border-slate-200 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                                        onClick={() => {
                                            if (selectedPeriod) {
                                                onAddRecoveryGradeClick(student, selectedPeriod, group, recoveryPeriodGrades[group] ?? null);
                                            }
                                        }}
                                    >
                                        <span className={`inline-flex items-center justify-center w-10 h-8 rounded text-sm font-bold ${getGradeColor(recoveryPeriodGrades[group])}`}>
                                            {recoveryPeriodGrades[group] ?? '-'}
                                        </span>
                                    </td>
                                )
                            ])}
                            <td className="px-4 py-1 whitespace-nowrap text-center sticky right-0 z-10 bg-inherit border-l-2 border-slate-200 dark:border-slate-700">
                                <span className={`inline-flex items-center justify-center w-12 h-10 rounded-lg text-lg shadow-sm ${getGradeColor(periodAverage, true)}`}>
                                    {periodAverage ?? '-'}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};
