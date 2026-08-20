
import { Grade, EvaluationInstrument, Competency, RecoveryGrade, StudentAcademicSummary } from '../types';

/**
 * Helper to map a competency to a PC group (PC1-PC4).
 * @param subject Subject name (for specific rules if needed)
 * @param competencyId Competency ID
 * @param level Education level ('PRIMARIO' or 'SECUNDARIO')
 * @returns 'PC1'...'PC4' or 'GP1'...'GP3'
 */
/**
 * Helper to map a competency to a PC group (PC1-PC4).
 * @param subject Subject name (for specific rules if needed)
 * @param competencyId Competency ID
 * @param level Education level ('PRIMARIO' or 'SECUNDARIO')
 * @returns 'PC1'...'PC4' or 'GP1'...'GP3'
 */
export function getCompetencyGroup(
    subject: string,
    competencyId: string,
    level: string = 'SECUNDARIO',
    competencyCode: string = '',
    competencyEvaluationGroup?: 'PC1' | 'PC2' | 'PC3' | 'PC4' | 'GP1' | 'GP2' | 'GP3'
): 'PC1' | 'PC2' | 'PC3' | 'PC4' | 'GP1' | 'GP2' | 'GP3' {
    // 1. Priority: Explicit Evaluation Group (New Logic)
    if (competencyEvaluationGroup) {
        return competencyEvaluationGroup;
    }

    // Logic: Map Competency to Group (Backward Compatibility / Fallback).

    if (level === 'PRIMARIO' || level === 'Nivel Primario') {
        // Primary Logic: 3 Groups (GP1, GP2, GP3)
        // Try to deduce from Code (e.g., CP1 -> GP1)
        if (competencyCode.includes('GP1') || competencyCode.includes('CP1')) return 'GP1';
        if (competencyCode.includes('GP2') || competencyCode.includes('CP2')) return 'GP2';
        if (competencyCode.includes('GP3') || competencyCode.includes('CP3')) return 'GP3';

        // Check for Dynamic ID (e.g., GP1-classId)
        if (competencyId.startsWith('GP1-')) return 'GP1';
        if (competencyId.startsWith('GP2-')) return 'GP2';
        if (competencyId.startsWith('GP3-')) return 'GP3';

        // Fallback for Primary
        const hash = competencyId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const groupIndex = (hash % 3) + 1;
        return `GP${groupIndex}` as 'GP1' | 'GP2' | 'GP3';
    }

    // Secondary Logic: 4 Groups (PC1...PC4)

    // Try to deduce from Code (e.g., CE1 -> PC1)
    if (competencyCode.includes('CE1') || competencyCode.includes('C1')) return 'PC1';
    if (competencyCode.includes('CE2') || competencyCode.includes('C2')) return 'PC2';
    if (competencyCode.includes('CE3') || competencyCode.includes('C3')) return 'PC3';

    // Group 4 usually includes CE4-CE7
    if (competencyCode.includes('CE4') || competencyCode.includes('C4')) return 'PC4';
    if (competencyCode.includes('CE5') || competencyCode.includes('C5')) return 'PC4';
    if (competencyCode.includes('CE6') || competencyCode.includes('C6')) return 'PC4';
    if (competencyCode.includes('CE7') || competencyCode.includes('C7')) return 'PC4';

    // Check for Dynamic ID (e.g., PC1-classId) - Allow simple prefix match or legacy ID
    if (competencyId.startsWith('PC1')) return 'PC1'; // Covers 'PC1' and 'PC1-...'
    if (competencyId.startsWith('PC2')) return 'PC2';
    if (competencyId.startsWith('PC3')) return 'PC3';
    if (competencyId.startsWith('PC4')) return 'PC4';

    // Fallback: Equitable distribution based on ID hash
    const hash = competencyId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const groupIndex = (hash % 4) + 1;
    return `PC${groupIndex}` as 'PC1' | 'PC2' | 'PC3' | 'PC4';
}

/**
 * Calculates the StudentAcademicSummary based on all grades.
 */
export function calculateAcademicSummary(
    studentId: string,
    grades: Grade[],
    instruments: EvaluationInstrument[],
    competencies: Competency[],
    recoveryGrades: RecoveryGrade[] = [],
    level: string = 'SECUNDARIO'
): StudentAcademicSummary {
    const summary: StudentAcademicSummary = {
        studentId,
        periods: {},
        finalScore: 0,
        updatedAt: new Date().toISOString()
    };

    const periods: ('P1' | 'P2' | 'P3' | 'P4')[] = ['P1', 'P2', 'P3', 'P4'];

    let totalPeriodAverage = 0;
    let periodCount = 0;

    periods.forEach(period => {
        const periodInstruments = instruments.filter(i => i.period === period);
        // Gets grades strictly for this period's instruments
        const periodGrades = grades.filter(g => periodInstruments.some(i => i.id === g.instrumentId));

        // Note: Even if NO grades, we might need to show structure, but usually we skip calculation.
        // However, if there are recoveries but no normal grades, we should still consider it? 
        // For now, let's process if there are instruments OR recovery grades.
        if (periodGrades.length === 0 && !recoveryGrades.some(r => r.period === period && r.studentId === studentId)) return;

        // Group by PC1-PC4 or GP1-GP3
        const groups: Record<string, { scored: number; possible: number }[]> = {
            PC1: [], PC2: [], PC3: [], PC4: [],
            GP1: [], GP2: [], GP3: []
        };

        periodGrades.forEach(g => {
            const inst = periodInstruments.find(i => i.id === g.instrumentId);
            if (!inst || g.score === null || g.score === undefined || isNaN(g.score)) return;

            const groupsForInstrument = new Set<string>();

            inst.competencyIds.forEach(compId => {
                const comp = competencies.find(c => c.id === compId);

                const group = getCompetencyGroup(
                    inst.name,
                    compId,
                    level,
                    comp ? comp.code : '',
                    comp?.evaluationGroup // Pass the new explicit group
                );

                groupsForInstrument.add(group);
            });

            groupsForInstrument.forEach(group => {
                if (groups[group]) {
                    groups[group].push({ scored: g.score!, possible: inst.totalPoints || 100 });
                }
            });
        });

        // Calculate Averages for each group using (scored / possible) * 100
        const calculateGroupAvg = (groupArr: { scored: number; possible: number }[]) => {
            if (groupArr.length === 0) return 0;
            const totalScored = groupArr.reduce((a, b) => a + b.scored, 0);
            const totalPossible = groupArr.reduce((a, b) => a + b.possible, 0);
            return totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : 0;
        };

        const groupAverages: any = {
            PC1: calculateGroupAvg(groups.PC1),
            PC2: calculateGroupAvg(groups.PC2),
            PC3: calculateGroupAvg(groups.PC3),
            PC4: calculateGroupAvg(groups.PC4),
            GP1: calculateGroupAvg(groups.GP1),
            GP2: calculateGroupAvg(groups.GP2),
            GP3: calculateGroupAvg(groups.GP3),
        };

        // Apply Recovery Grades (RP) per Group BEFORE Period Average
        // Rule: RP replaces the group grade if higher? Or is it a separate column that overrides?
        // Usually, RP is specific to a Competency Group in a Period.
        const periodRecoveries = recoveryGrades.filter(r => r.studentId === studentId && r.period === period);

        periodRecoveries.forEach(rp => {
            if (rp.competencyGroup && groupAverages[rp.competencyGroup] !== undefined) {
                // Policy: Use RP if higher, or just replace? 
                // Standard is usually: RP replaces the failed grade.
                // Assuming RP is the final grade for that group in that period.
                if (rp.score > groupAverages[rp.competencyGroup]) {
                    groupAverages[rp.competencyGroup] = rp.score;
                }
            }
        });

        // Period Average Calculation
        let pAvg = 0;
        if (level === 'PRIMARIO' || level === 'Nivel Primario') {
            // (GP1 + GP2 + GP3) / 3
            pAvg = (groupAverages.GP1 + groupAverages.GP2 + groupAverages.GP3) / 3;
        } else {
            // (PC1 + PC2 + PC3 + PC4) / 4
            pAvg = (groupAverages.PC1 + groupAverages.PC2 + groupAverages.PC3 + groupAverages.PC4) / 4;
        }

        summary.periods[period] = {
            competencyGroups: groupAverages,
            periodAverage: pAvg,
            // rp: ... // We consumed RP into the groups, but we can store a flag or the raw RPs if needed for display.
            // keeping legacy rp field for backward compat or global overrides if any
            rp: periodRecoveries.length > 0 ? Math.max(...periodRecoveries.map(r => r.score)) : null
        };

        totalPeriodAverage += pAvg;
        periodCount++;
    });

    // Final Score
    // Average of the active periods
    summary.finalScore = periodCount > 0 ? totalPeriodAverage / periodCount : 0;

    return summary;
}

/**
 * Generates Wildcard Competencies when no specific competencies are defined.
 */
export function generateWildcardCompetencies(classId: string, level: string = 'SECUNDARIO'): Competency[] {
    const isPrimary = level === 'PRIMARIO' || level === 'Nivel Primario';

    if (isPrimary) {
        return [
            { id: `GP1-${classId}`, classId, fundamentalId: 'wildcard-F1', code: 'GP1', name: 'Competencia Específica (GP1)', description: 'Grupo Pedagógico 1', indicators: [], evaluationGroup: 'GP1' },
            { id: `GP2-${classId}`, classId, fundamentalId: 'wildcard-F1', code: 'GP2', name: 'Competencia Específica (GP2)', description: 'Grupo Pedagógico 2', indicators: [], evaluationGroup: 'GP2' },
            { id: `GP3-${classId}`, classId, fundamentalId: 'wildcard-F1', code: 'GP3', name: 'Competencia Específica (GP3)', description: 'Grupo Pedagógico 3', indicators: [], evaluationGroup: 'GP3' },
        ];
    } else {
        return [
            { id: `PC1-${classId}`, classId, fundamentalId: 'wildcard-F1', code: 'PC1', name: 'Competencia Específica (PC1)', description: 'Período Competencial 1', indicators: [], evaluationGroup: 'PC1' },
            { id: `PC2-${classId}`, classId, fundamentalId: 'wildcard-F1', code: 'PC2', name: 'Competencia Específica (PC2)', description: 'Período Competencial 2', indicators: [], evaluationGroup: 'PC2' },
            { id: `PC3-${classId}`, classId, fundamentalId: 'wildcard-F1', code: 'PC3', name: 'Competencia Específica (PC3)', description: 'Período Competencial 3', indicators: [], evaluationGroup: 'PC3' },
            { id: `PC4-${classId}`, classId, fundamentalId: 'wildcard-F1', code: 'PC4', name: 'Competencia Específica (PC4)', description: 'Período Competencial 4', indicators: [], evaluationGroup: 'PC4' },
        ];
    }
}
