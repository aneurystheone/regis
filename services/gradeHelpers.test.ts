
import { describe, it, expect } from 'vitest';
import { calculateAcademicSummary, getCompetencyGroup } from './gradeHelpers';
import { Grade, EvaluationInstrument, Competency, RecoveryGrade } from '../types';

describe('Grade Calculation Helpers', () => {

    describe('getCompetencyGroup', () => {
        it('should infer group from competency code', () => {
            expect(getCompetencyGroup('Math', '1', 'SECUNDARIO', 'CE1-Math')).toBe('PC1');
            expect(getCompetencyGroup('Math', '2', 'SECUNDARIO', 'CE2-Math')).toBe('PC2');
            expect(getCompetencyGroup('Math', '3', 'SECUNDARIO', 'CE3-Math')).toBe('PC3');
            expect(getCompetencyGroup('Math', '4', 'SECUNDARIO', 'CE4-Math')).toBe('PC4');
            expect(getCompetencyGroup('Math', '5', 'SECUNDARIO', 'CE5-Math')).toBe('PC4');
        });

        it('should fallback to hash distribution if code is ambiguous', () => {
            // "A" char code 65 -> 65 % 4 = 1 -> +1 = 2 -> PC2
            expect(getCompetencyGroup('Math', 'A', 'SECUNDARIO', 'Ambiguous')).toBe('PC2');
            // "B" char code 66 -> 66 % 4 = 2 -> +1 = 3 -> PC3
            expect(getCompetencyGroup('Math', 'B', 'SECUNDARIO', 'Ambiguous')).toBe('PC3');
        });
    });

    describe('calculateAcademicSummary', () => {
        const studentId = 'student1';

        const mockCompetencies: Competency[] = [
            { id: 'c1', code: 'CE1', evaluationGroup: 'PC1' } as any,
            { id: 'c2', code: 'CE2', evaluationGroup: 'PC2' } as any,
            { id: 'c3', code: 'CE3', evaluationGroup: 'PC3' } as any,
            { id: 'c4', code: 'CE4', evaluationGroup: 'PC4' } as any,
        ];

        const mockInstruments: EvaluationInstrument[] = [
            { id: 'inst1', period: 'P1', competencyIds: ['c1'], name: 'Quiz 1' } as any, // PC1
            { id: 'inst2', period: 'P1', competencyIds: ['c2'], name: 'Quiz 2' } as any, // PC2
            { id: 'inst3', period: 'P1', competencyIds: ['c3'], name: 'Quiz 3' } as any, // PC3
            { id: 'inst4', period: 'P1', competencyIds: ['c4'], name: 'Quiz 4' } as any, // PC4
        ];

        it('should calculate accurate period averages', () => {
            const grades: Grade[] = [
                { studentId, instrumentId: 'inst1', score: 80 } as any, // PC1 = 80
                { studentId, instrumentId: 'inst2', score: 90 } as any, // PC2 = 90
                { studentId, instrumentId: 'inst3', score: 85 } as any, // PC3 = 85
                { studentId, instrumentId: 'inst4', score: 95 } as any, // PC4 = 95
            ];

            const summary = calculateAcademicSummary(studentId, grades, mockInstruments, mockCompetencies);

            const p1 = summary.periods.P1;
            expect(p1).toBeDefined();
            expect(p1!.competencyGroups.PC1).toBe(80);
            expect(p1!.competencyGroups.PC2).toBe(90);
            expect(p1!.competencyGroups.PC3).toBe(85);
            expect(p1!.competencyGroups.PC4).toBe(95);

            // Average: (80+90+85+95)/4 = 350/4 = 87.5
            expect(p1!.periodAverage).toBe(87.5);
            expect(summary.finalScore).toBe(87.5);
        });

        it('should handle missing groups by treating them as 0', () => {
            const grades: Grade[] = [
                { studentId, instrumentId: 'inst1', score: 100 } as any, // PC1 = 100
            ];

            const summary = calculateAcademicSummary(studentId, grades, mockInstruments, mockCompetencies);
            const p1 = summary.periods.P1!;

            expect(p1.competencyGroups.PC1).toBe(100);
            expect(p1.competencyGroups.PC2).toBe(0);

            // Average: (100 + 0 + 0 + 0) / 4 = 25
            expect(p1.periodAverage).toBe(25);
        });

        it('should apply Recovery Period (RP) logic', () => {
            const grades: Grade[] = [
                { studentId, instrumentId: 'inst1', score: 60 } as any, // Low score
            ];

            // Without RP: (60+0+0+0)/4 = 15

            const recoveryGrades: RecoveryGrade[] = [
                { studentId, period: 'P1', score: 70, competencyGroup: 'PC1' } as any
            ];

            const summary = calculateAcademicSummary(studentId, grades, mockInstruments, mockCompetencies, recoveryGrades);

            expect(summary.periods.P1!.competencyGroups.PC1).toBe(70); // RP replaced the 60 in PC1 group average
            expect(summary.periods.P1!.periodAverage).toBe(17.5); // (70 + 0 + 0 + 0) / 4
            expect(summary.periods.P1!.rp).toBe(70);
            expect(summary.finalScore).toBe(17.5);
        });

        describe('Primary Level (GP1-GP3)', () => {
            const mockInstrumentsPrimary: EvaluationInstrument[] = [
                { id: 'instP1', period: 'P1', competencyIds: ['c1'], name: 'Quiz P1' } as any, // GP1
                { id: 'instP2', period: 'P1', competencyIds: ['c2'], name: 'Quiz P2' } as any, // GP2
                { id: 'instP3', period: 'P1', competencyIds: ['c3'], name: 'Quiz P3' } as any, // GP3
            ];

            // Mock competencies with codes that map to GP1-GP3
            const mockCompetenciesPrimary: Competency[] = [
                { id: 'c1', code: 'CP1-Math' } as any,
                { id: 'c2', code: 'CP2-Math' } as any,
                { id: 'c3', code: 'CP3-Math' } as any,
            ];

            it('should calculate using 3 groups and divide by 3', () => {
                const grades: Grade[] = [
                    { studentId, instrumentId: 'instP1', score: 90 } as any, // GP1
                    { studentId, instrumentId: 'instP2', score: 80 } as any, // GP2
                    { studentId, instrumentId: 'instP3', score: 100 } as any, // GP3
                ];

                const summary = calculateAcademicSummary(studentId, grades, mockInstrumentsPrimary, mockCompetenciesPrimary, [], 'PRIMARIO');

                const p1 = summary.periods.P1!;
                expect(p1.competencyGroups.GP1).toBe(90);
                expect(p1.competencyGroups.GP2).toBe(80);
                expect(p1.competencyGroups.GP3).toBe(100);

                // (90 + 80 + 100) / 3 = 270 / 3 = 90
                expect(p1.periodAverage).toBe(90);
            });
        });
    });
});
