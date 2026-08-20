import React from 'react';
import { Avatar } from '../Avatar';
import type { CompetencyGroup, Student } from '../../types';
import { getGradeColor } from '../../hooks/useGradebookData';

interface DesktopSummaryTableProps {
    competencyGroups: CompetencyGroup[];
    groupNames: Record<CompetencyGroup, string>;
    gradeSheetData: {
        data: Map<string, { [key: string]: number | null }>;
        classStudents: Student[];
    };
}

export const DesktopSummaryTable: React.FC<DesktopSummaryTableProps> = ({
    competencyGroups,
    groupNames,
    gradeSheetData
}) => {
    return (
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-20">
                <tr>
                    <th rowSpan={2} className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-b border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.1)] w-64">Estudiante</th>
                    <th colSpan={competencyGroups.length} className="px-2 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-950">Promedios por Grupo de Competencia</th>
                    <th rowSpan={2} className="px-4 py-3 text-center font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider sticky right-0 bg-emerald-50 dark:bg-emerald-950 z-20 border-b border-l border-slate-200 dark:border-slate-700 w-32" title="Promedio final de todos los grupos de competencia.">Calificación Final</th>
                </tr>
                <tr>
                    {competencyGroups.map(group => (
                        <th key={`${group}-PC`} className="px-2 py-3 text-center font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[120px]" title="Promedio de los períodos (P1-P4) para este grupo de competencia.">
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
                                    <div className="w-8 h-8 flex-shrink-0">
                                        <Avatar name={student.name} src={student.avatar} size="sm" />
                                    </div>
                                    <span className="truncate">{student.firstName || student.name}</span>
                                </div>
                            </td>
                            {competencyGroups.map(group => (
                                <td key={`${group}-PC`} className="px-2 py-3 whitespace-nowrap text-center" title="Promedio de los períodos (P1-P4) para este grupo de competencia.">
                                    <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg text-sm ${getGradeColor(scores[`PC${group.slice(1)}`], true)}`}>
                                        {scores[`PC${group.slice(1)}`] ?? '-'}
                                    </span>
                                </td>
                            ))}
                            <td className="px-4 py-3 whitespace-nowrap text-center sticky right-0 z-10 bg-inherit border-l border-slate-200 dark:border-slate-700" title="Promedio final de todos los grupos de competencia.">
                                <span className={`inline-flex items-center justify-center w-16 h-10 rounded-lg text-lg shadow-sm ${getGradeColor(scores['final'], true)}`}>
                                    {scores['final'] ?? '-'}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};
