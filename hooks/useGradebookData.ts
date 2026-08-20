import { useMemo } from 'react';
import type { 
    Student, Class, Competency, EvaluationInstrument, Grade, 
    EvaluationPeriod, FundamentalCompetency, CompetencyGroup, RecoveryGrade, WorkTeam 
} from '../types';
import { sortStudents, filterStudentsByClass, normalizeText } from '../utils';

export const evaluationPeriods: EvaluationPeriod[] = ['P1', 'P2', 'P3', 'P4'];

// Secundario: 4 groups
export const secundarioGroups: CompetencyGroup[] = ['G1', 'G2', 'G3', 'G4'];
export const secundarioGroupNames: Record<CompetencyGroup, string> = {
    G1: "Comunicativa",
    G2: "Pensamiento Lógico",
    G3: "Ética y Ciudadana",
    G4: "Científica y Amb.",
};

// Primario: 3 groups (mapping G1, G2+G4, G3)
export const primarioGroups: CompetencyGroup[] = ['G1', 'G2', 'G3'];
export const primarioGroupNames: Record<CompetencyGroup, string> = {
    G1: "Comunicativa",
    G2: "Pensamiento Lógico, Resolución de Problemas y Científica",
    G3: "Ética, Ciudadana, Personal y Ambiental",
    G4: "" // Not used in Primario
};

export const getGroupConfig = (level: string) => {
    const isPrimario = level?.toLowerCase().includes('primari');
    return {
        groups: isPrimario ? primarioGroups : secundarioGroups,
        groupNames: isPrimario ? primarioGroupNames : secundarioGroupNames,
        isPrimario
    };
};

export const getGradeColor = (score: number | null, isFinal = false): string => {
    if (score === null || score === undefined) {
        return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    }
    const fontWeight = isFinal ? 'font-extrabold' : 'font-semibold';
    if (score >= 90) return `bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200 ${fontWeight}`;
    if (score >= 80) return `bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 ${fontWeight}`;
    if (score >= 70) return `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 ${fontWeight}`;
    return `bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 ${fontWeight}`;
};

export const calculateGradeSheet = (
    classStudents: Student[],
    classInstruments: EvaluationInstrument[],
    grades: Grade[],
    recoveryGrades: RecoveryGrade[],
    competenciesByGroup: Map<CompetencyGroup, string[]>,
    level: string,
    competencyGroups: CompetencyGroup[]
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
                    inst.period === period && (
                        inst.competencyIds.length === 0 ||
                        inst.competencyIds.some(cid => groupCompetencyIds.has(cid))
                    )
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
            const pcScores = competencyGroups.map(g => studentScores[`PC${g.slice(1)}`]).filter((s): s is number => typeof s === 'number');
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

export const calculatePeriodDetails = (
    periodInstruments: EvaluationInstrument[],
    classStudents: Student[],
    grades: Grade[],
    recoveryGrades: RecoveryGrade[],
    competenciesByGroup: Map<CompetencyGroup, string[]>,
    selectedPeriod: EvaluationPeriod,
    level: string,
    competencyGroups: CompetencyGroup[]
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
            const instrumentsInPeriodAndGroup = periodInstruments.filter(inst =>
                inst.competencyIds.some(cid => groupCompetencyIds.has(cid))
            );

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

            pcScores[group] = finalPeriodGroupScore;
        }

        const minPassing = (level?.toLowerCase().includes('secundari')) ? 70 : 65;

        let canCalculateAverage = true;
        for (const group of competencyGroups) {
            const originalScore = originalPcScores[group];
            const hasRecovery = recoveryPeriodGrades[group] !== null;
            const finalScore = pcScores[group];

            if (finalScore === null || finalScore === undefined) {
                canCalculateAverage = false;
                break;
            }

            if (originalScore !== null && originalScore < minPassing && !hasRecovery) {
                canCalculateAverage = false;
                break;
            }
        }

        const groupScoresForAverage = competencyGroups
            .map(g => pcScores[g])
            .filter((s): s is number => typeof s === 'number');

        const periodAverage = (canCalculateAverage && groupScoresForAverage.length === competencyGroups.length)
            ? Math.round(groupScoresForAverage.reduce((a, b) => a + b, 0) / groupScoresForAverage.length)
            : null;

        return { student, instrumentGrades, periodAverage, originalPcScores, pcScores, recoveryPeriodGrades };
    });
};

interface UseGradebookDataProps {
    classes: Class[];
    selectedClassId: string | null;
    fundamentalCompetencies: FundamentalCompetency[];
    competencies: Competency[];
    instruments: EvaluationInstrument[];
    students: Student[];
    studentFilter: string | null;
    grades: Grade[];
    recoveryGrades: RecoveryGrade[];
    gradeViewType: 'summary' | 'period';
    selectedPeriod: EvaluationPeriod;
    periodCompetencyFilter: string;
    searchQuery?: string;
    teamFilter?: string | null;
    teams?: WorkTeam[];
}

export const useGradebookData = ({
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
    teams = []
}: UseGradebookDataProps) => {

    const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
    const { groups: competencyGroups, groupNames, isPrimario } = useMemo(() =>
        getGroupConfig(currentClass?.level || 'Nivel Primario'),
        [currentClass]
    );

    const competenciesByGroup = useMemo(() => {
        const map = new Map<CompetencyGroup, string[]>();
        fundamentalCompetencies.forEach(fc => {
            const competencyIdsForGroup = competencies.filter(c => c.fundamentalId === fc.id).map(c => c.id);
            const allIdsForThisFundamental = [...competencyIdsForGroup, fc.id];

            if (isPrimario) {
                let targetGroup = fc.group;

                if (fc.name.includes('Ambiental') || fc.id === 'FC6') {
                    targetGroup = 'G3';
                }
                else if (fc.name.includes('Científica') || fc.id === 'FC5') {
                    targetGroup = 'G2';
                }
                else if (fc.group === 'G4') {
                    targetGroup = 'G2';
                }

                const existing = map.get(targetGroup) || [];
                map.set(targetGroup, [...existing, ...allIdsForThisFundamental]);
            } else {
                const existing = map.get(fc.group) || [];
                map.set(fc.group, [...existing, ...allIdsForThisFundamental]);
            }
        });

        competencies.filter(c => c.classId === selectedClassId && c.fundamentalId === 'FC_GEN' && c.evaluationGroup).forEach(wc => {
            const evalGroup = wc.evaluationGroup!;
            let targetGroup: CompetencyGroup | undefined;
            if (isPrimario) {
                if (evalGroup === 'GP1') targetGroup = 'G1';
                else if (evalGroup === 'GP2') targetGroup = 'G2';
                else if (evalGroup === 'GP3') targetGroup = 'G3';
            } else {
                if (evalGroup === 'PC1') targetGroup = 'G1';
                else if (evalGroup === 'PC2') targetGroup = 'G2';
                else if (evalGroup === 'PC3') targetGroup = 'G3';
                else if (evalGroup === 'PC4') targetGroup = 'G4';
            }
            if (targetGroup) {
                const existing = map.get(targetGroup) || [];
                if (!existing.includes(wc.id)) {
                    map.set(targetGroup, [...existing, wc.id]);
                }
            }
        });

        const usedWildcards = new Set<string>();
        instruments.filter(i => i.classId === selectedClassId).forEach(inst => {
            inst.competencyIds.forEach(cid => {
                if (cid.startsWith('GP') || cid.startsWith('PC')) {
                    usedWildcards.add(cid);
                }
            });
        });

        if (isPrimario) {
            const g1 = map.get('G1') || []; if (!g1.includes('GP1')) map.set('G1', [...g1, 'GP1']);
            const g2 = map.get('G2') || []; if (!g2.includes('GP2')) map.set('G2', [...g2, 'GP2']);
            const g3 = map.get('G3') || []; if (!g3.includes('GP3')) map.set('G3', [...g3, 'GP3']);

            usedWildcards.forEach(cid => {
                if (cid.startsWith('GP1-') && !map.get('G1')?.includes(cid)) map.set('G1', [...(map.get('G1') || []), cid]);
                if (cid.startsWith('GP2-') && !map.get('G2')?.includes(cid)) map.set('G2', [...(map.get('G2') || []), cid]);
                if (cid.startsWith('GP3-') && !map.get('G3')?.includes(cid)) map.set('G3', [...(map.get('G3') || []), cid]);
            });
        } else {
            const g1 = map.get('G1') || []; if (!g1.includes('PC1')) map.set('G1', [...g1, 'PC1']);
            const g2 = map.get('G2') || []; if (!g2.includes('PC2')) map.set('G2', [...g2, 'PC2']);
            const g3 = map.get('G3') || []; if (!g3.includes('PC3')) map.set('G3', [...g3, 'PC3']);
            const g4 = map.get('G4') || []; if (!g4.includes('PC4')) map.set('G4', [...g4, 'PC4']);

            usedWildcards.forEach(cid => {
                if (cid.startsWith('PC1-') && !map.get('G1')?.includes(cid)) map.set('G1', [...(map.get('G1') || []), cid]);
                if (cid.startsWith('PC2-') && !map.get('G2')?.includes(cid)) map.set('G2', [...(map.get('G2') || []), cid]);
                if (cid.startsWith('PC3-') && !map.get('G3')?.includes(cid)) map.set('G3', [...(map.get('G3') || []), cid]);
                if (cid.startsWith('PC4-') && !map.get('G4')?.includes(cid)) map.set('G4', [...(map.get('G4') || []), cid]);
            });
        }

        return map;
    }, [fundamentalCompetencies, competencies, isPrimario, instruments, selectedClassId]);

    const competencyToGroupMap = useMemo(() => {
        const map = new Map<string, CompetencyGroup>();

        const getGroupForFundamental = (fc: FundamentalCompetency) => {
            if (isPrimario) {
                if (fc.name.includes('Ambiental') || fc.id === 'FC6') return 'G3';
                if (fc.name.includes('Científica') || fc.id === 'FC5') return 'G2';
                if (fc.group === 'G4') return 'G2';
            }
            return fc.group;
        };

        for (const comp of competencies) {
            const fundamental = fundamentalCompetencies.find(fc => fc.id === comp.fundamentalId);
            if (fundamental) {
                map.set(comp.id, getGroupForFundamental(fundamental));
            }
        }

        for (const fund of fundamentalCompetencies) {
            map.set(fund.id, getGroupForFundamental(fund));
        }

        for (const comp of competencies) {
            if (comp.fundamentalId === 'FC_GEN' && comp.evaluationGroup && !map.has(comp.id)) {
                const eg = comp.evaluationGroup;
                if (isPrimario) {
                    if (eg === 'GP1') map.set(comp.id, 'G1');
                    else if (eg === 'GP2') map.set(comp.id, 'G2');
                    else if (eg === 'GP3') map.set(comp.id, 'G3');
                } else {
                    if (eg === 'PC1') map.set(comp.id, 'G1');
                    else if (eg === 'PC2') map.set(comp.id, 'G2');
                    else if (eg === 'PC3') map.set(comp.id, 'G3');
                    else if (eg === 'PC4') map.set(comp.id, 'G4');
                }
            }
        }

        if (isPrimario) {
            map.set('GP1', 'G1');
            map.set('GP2', 'G2');
            map.set('GP3', 'G3');
        } else {
            map.set('PC1', 'G1');
            map.set('PC2', 'G2');
            map.set('PC3', 'G3');
            map.set('PC4', 'G4');
        }

        instruments.forEach(inst => {
            inst.competencyIds.forEach(cid => {
                if (map.has(cid)) return;
                if (isPrimario) {
                    if (cid.startsWith('GP1-')) map.set(cid, 'G1');
                    else if (cid.startsWith('GP2-')) map.set(cid, 'G2');
                    else if (cid.startsWith('GP3-')) map.set(cid, 'G3');
                } else {
                    if (cid.startsWith('PC1')) map.set(cid, 'G1');
                    else if (cid.startsWith('PC2')) map.set(cid, 'G2');
                    else if (cid.startsWith('PC3')) map.set(cid, 'G3');
                    else if (cid.startsWith('PC4')) map.set(cid, 'G4');
                }
            });
        });

        return map;
    }, [competencies, fundamentalCompetencies, isPrimario, instruments]);

    const gradeSheetData = useMemo(() => {
        if (!selectedClassId) return { data: new Map(), classStudents: [] };

        const classStudentsFiltered = filterStudentsByClass(students, selectedClassId, classes);

        const filtered = classStudentsFiltered.filter(s => {
            const matchesFilter = studentFilter ? s.id === studentFilter : true;
            const matchesSearch = searchQuery 
                ? normalizeText(s.name).includes(normalizeText(searchQuery)) 
                : true;
            const matchesTeam = teamFilter ? teams.find(t => t.id === teamFilter)?.studentIds.includes(s.id) : true;
            return matchesFilter && matchesSearch && matchesTeam;
        });

        const classStudents = sortStudents(filtered, searchQuery);
        const classInstruments = instruments.filter(i => i.classId === selectedClassId);
        const data = calculateGradeSheet(classStudents, classInstruments, grades, recoveryGrades, competenciesByGroup, currentClass?.level || 'Nivel Primario', competencyGroups);
        return { data, classStudents };
    }, [selectedClassId, students, studentFilter, searchQuery, teamFilter, teams, instruments, grades, recoveryGrades, competenciesByGroup, classes, currentClass, competencyGroups]);

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

        const currentClass = classes.find(c => c.id === selectedClassId);

        const classStudentsFiltered = filterStudentsByClass(students, selectedClassId, classes);

        const filtered = classStudentsFiltered.filter(s => {
            const matchesFilter = studentFilter ? s.id === studentFilter : true;
            const matchesSearch = searchQuery 
                ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) 
                : true;
            const matchesTeam = teamFilter ? teams.find(t => t.id === teamFilter)?.studentIds.includes(s.id) : true;
            return matchesFilter && matchesSearch && matchesTeam;
        });

        const classStudents = sortStudents(filtered);

        const studentPeriodGrades = calculatePeriodDetails(periodInstruments, classStudents, grades, recoveryGrades, competenciesByGroup, selectedPeriod, currentClass?.level || 'Nivel Primario', competencyGroups);

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
    }, [gradeViewType, selectedClassId, selectedPeriod, instruments, students, grades, studentFilter, searchQuery, teamFilter, teams, competencyToGroupMap, periodCompetencyFilter, competenciesByGroup, recoveryGrades, competencies, competencyGroups, classes]);

    const classInstruments = useMemo(() => instruments.filter(i => i.classId === selectedClassId), [instruments, selectedClassId]);
    const classCompetencies = useMemo(() => competencies.filter(c => c.classId === selectedClassId), [competencies, selectedClassId]);
    const hasStudents = gradeSheetData.classStudents.length > 0;

    return {
        currentClass,
        competencyGroups,
        groupNames,
        isPrimario,
        competenciesByGroup,
        competencyToGroupMap,
        gradeSheetData,
        periodDetailData,
        classInstruments,
        classCompetencies,
        hasStudents
    };
};
