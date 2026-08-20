import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { EvaluationInstrument, Student, Grade, WorkTeam } from '../types';
import { sortStudents, filterStudentsByClass } from '../utils';
import { XIcon, CheckIcon, ArrowPathIcon, ExclamationIcon, CloudIcon, UserGroupIcon, UserIcon } from './icons';
import { api } from '../services/api';
import { useUsageSession } from '../services/usageService';
import { Class } from '../types';

interface ExpressGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: EvaluationInstrument | null;
  students: Student[];
  grades: Grade[];
  onGradeUpdated: (grade: Grade) => void;
  initialFocusStudentId?: string | null;
  classes: Class[];
  teams?: WorkTeam[];
}

type SyncStatus = 'synced' | 'syncing' | 'error' | 'draft';

export const ExpressGradingModal: React.FC<ExpressGradingModalProps> = ({ isOpen, onClose, instrument, students, grades, onGradeUpdated, initialFocusStudentId, classes, teams: propTeams }) => {
  const { logSession } = useUsageSession();
  const [localTeams, setLocalTeams] = useState<WorkTeam[]>(propTeams || []);
  const [localGrades, setLocalGrades] = useState<Record<string, { score: string; criteria: Record<string, boolean | number | null> }>>({});
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(initialFocusStudentId || null);
  const [hasTrackedGrades, setHasTrackedGrades] = useState(false);
  const [gradingMode, setGradingMode] = useState<'individual' | 'team'>('individual');
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const classStudents = useMemo(() => {
    if (!instrument) return [];
    return sortStudents(filterStudentsByClass(students, instrument.classId, classes)); // Use helper
  }, [students, instrument, classes]);

  const hasCriteria = instrument && instrument.criteria && instrument.criteria.length > 0;

  useEffect(() => {
    if (propTeams) {
      setLocalTeams(propTeams);
      return;
    }
    if (isOpen && instrument) {
      const cls = classes.find(c => c.id === instrument.classId);
      const unsubscribe = api.subscribeToTeams((data) => {
        setLocalTeams(data.filter(t => t.classId === instrument.classId || (cls?.groupId && t.groupId === cls.groupId)));
      });
      return () => unsubscribe();
    }
  }, [isOpen, instrument, propTeams, classes]);

  useEffect(() => {
    if (instrument && ['Proyecto', 'Exposición', 'Maqueta'].includes(instrument.type)) {
      setGradingMode('team');
    } else {
      setGradingMode('individual');
    }
  }, [instrument]);

  const groupedStudents = useMemo(() => {
    if (gradingMode === 'individual') return null;
    
    const assigned: Record<string, Student[]> = {};
    const unassigned: Student[] = [];

    (localTeams || []).forEach(t => assigned[t.id] = []);

    classStudents.forEach(s => {
      const team = (localTeams || []).find(t => t.studentIds.includes(s.id));
      if (team) {
        if (!assigned[team.id]) assigned[team.id] = [];
        assigned[team.id].push(s);
      } else {
        unassigned.push(s);
      }
    });

    return {
      localTeams: (localTeams || []).filter(t => assigned[t.id]?.length > 0).map(t => ({ team: t, students: assigned[t.id] })),
      unassigned
    };
  }, [gradingMode, classStudents, localTeams]);

  // Initialize from props and LocalStorage (Drafts)
  useEffect(() => {
    if (instrument && isOpen) {
      const initialGrades: typeof localGrades = {};
      const initialStatuses: Record<string, SyncStatus> = {};

      // Load drafts from localStorage
      const draftKey = `regis_draft_grades_${instrument.id}`;
      const savedDrafts = localStorage.getItem(draftKey);
      const draftsMap = savedDrafts ? JSON.parse(savedDrafts) : {};

      for (const student of classStudents) {
        const existingGrade = grades.find(g => g.studentId === student.id && g.instrumentId === instrument.id);
        const draft = draftsMap[student.id];

        if (draft) {
          initialGrades[student.id] = draft;
          initialStatuses[student.id] = 'draft';
        } else {
          initialGrades[student.id] = {
            score: existingGrade?.score?.toString() ?? '',
            criteria: existingGrade?.criteriaScores ?? {}
          };
          initialStatuses[student.id] = 'synced';
        }
      }
      setLocalGrades(initialGrades);
      setSyncStatuses(initialStatuses);
    }
  }, [instrument, isOpen, grades, classStudents]);

  // Persist drafts to localStorage
  useEffect(() => {
    if (instrument && isOpen) {
      const draftKey = `regis_draft_grades_${instrument.id}`;
      const draftsToSave = Object.keys(syncStatuses)
        .filter(sid => syncStatuses[sid] === 'draft' || syncStatuses[sid] === 'error')
        .reduce((acc, sid) => ({ ...acc, [sid]: localGrades[sid] }), {});

      if (Object.keys(draftsToSave).length > 0) {
        localStorage.setItem(draftKey, JSON.stringify(draftsToSave));
      } else {
        localStorage.removeItem(draftKey);
      }
    }
  }, [localGrades, syncStatuses, instrument, isOpen]);

  const performSave = useCallback(async (studentId: string, gradeData: typeof localGrades[string]) => {
    if (!instrument) return;

    setSyncStatuses(prev => ({ ...prev, [studentId]: 'syncing' }));

    try {
      const scoreValue = gradeData.score === '' ? null : parseFloat(gradeData.score);
      const finalScore = scoreValue !== null && !isNaN(scoreValue) ? Math.min(Math.max(scoreValue, 0), instrument.totalPoints) : null;

      const gradeToSave: Grade = {
        id: `${studentId}_${instrument.id}`, // Temporary ID for type compliance
        studentId,
        instrumentId: instrument.id,
        score: finalScore,
        criteriaScores: gradeData.criteria,
        updatedAt: new Date().toISOString()
      };

      await api.saveGrade(gradeToSave);

      // Inform parent
      onGradeUpdated(gradeToSave);

      // Track grades usage (only once per session)
      if (!hasTrackedGrades) {
        logSession('grades');
        setHasTrackedGrades(true);
      }

      // Cleanup draft from localStorage for this student
      setSyncStatuses(prev => ({ ...prev, [studentId]: 'synced' }));
    } catch (error) {
      console.error('Auto-save error:', error);
      setSyncStatuses(prev => ({ ...prev, [studentId]: 'error' }));
    }
  }, [instrument]);

  const scheduleSave = (studentId: string, gradeData: typeof localGrades[string]) => {
    if (saveTimeouts.current[studentId]) {
      clearTimeout(saveTimeouts.current[studentId]);
    }

    setSyncStatuses(prev => ({ ...prev, [studentId]: 'draft' }));

    saveTimeouts.current[studentId] = setTimeout(() => {
      performSave(studentId, gradeData);
    }, 1500); // 1.5s debounce for per-row save
  };

  useEffect(() => {
    if (isOpen && initialFocusStudentId) {
      setFocusedStudentId(initialFocusStudentId);
      setTimeout(() => {
        const el = inputRefs.current[initialFocusStudentId];
        if (el) {
          el.focus();
          el.select();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [isOpen, initialFocusStudentId]);

  const handleScoreChange = (studentId: string, value: string) => {
    const existingGrade = grades.find(g => g.studentId === studentId && g.instrumentId === instrument?.id);
    const existingScore = existingGrade?.score?.toString() ?? '';

    // Clamp to [0, totalPoints] when the value is a valid number
    const numeric = parseFloat(value);
    const finalValue = !isNaN(numeric) && instrument
      ? String(Math.min(Math.max(numeric, 0), instrument.totalPoints))
      : value;

    const hasChanged = finalValue !== existingScore;

    const newData = { ...localGrades[studentId], score: finalValue };
    setLocalGrades(prev => ({ ...prev, [studentId]: newData }));

    if (hasChanged && finalValue.trim() !== '') {
      scheduleSave(studentId, newData);
    }
  };

  const handleCriteriaChange = (studentId: string, criterionId: string, value: boolean | number | string) => {
    // Parse string inputs to number so the state stays typed as boolean | number
    const parsedValue: boolean | number = typeof value === 'string' ? parseFloat(value) : value;
    setLocalGrades(prev => {
      const studentData = { ...prev[studentId] };
      const updatedCriteria = { ...studentData.criteria, [criterionId]: parsedValue };

      let updatedScore = studentData.score;

      if (instrument?.type === 'Lista de Cotejo' && instrument.criteria) {
        // Checklist: score = (checked / total) * totalPoints
        const totalCriteriaCount = instrument.criteria.length;
        const checkedCount = Object.values(updatedCriteria).filter(v => v === true).length;
        if (totalCriteriaCount > 0) {
          const calculatedScore = (checkedCount / totalCriteriaCount) * instrument.totalPoints;
          updatedScore = (Math.round(calculatedScore * 10) / 10).toString();
        }
      } else if (instrument?.criteria && instrument.criteria.length > 0) {
        // Numeric criteria: score = sum of all criterion numeric values
        const sum = instrument.criteria.reduce((acc, c) => {
          const v = updatedCriteria[c.id];
          const raw = typeof v === 'string' ? parseFloat(v as string) : typeof v === 'number' ? v : NaN;
          // Clamp to criterion maxPoints if defined
          const clamped = c.maxPoints !== undefined && !isNaN(raw) ? Math.min(raw, c.maxPoints) : raw;
          return acc + (isNaN(clamped) ? 0 : clamped);
        }, 0);
        const clamped = Math.min(sum, instrument.totalPoints);
        updatedScore = (Math.round(clamped * 10) / 10).toString();
      }

      const newData = {
        ...studentData,
        score: updatedScore,
        criteria: updatedCriteria
      };

      const nextState = { ...prev, [studentId]: newData };
      scheduleSave(studentId, newData);
      return nextState;
    });
  }

  const handleTeamScoreChange = (teamId: string, value: string, teamStudents: Student[]) => {
    teamStudents.forEach(student => handleScoreChange(student.id, value));
  };

  const handleTeamCriteriaChange = (teamId: string, criterionId: string, value: boolean | number | string, teamStudents: Student[]) => {
    teamStudents.forEach(student => handleCriteriaChange(student.id, criterionId, value));
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextStudent = classStudents[currentIndex + 1];
      if (nextStudent) {
        const nextInput = inputRefs.current[nextStudent.id];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
          setFocusedStudentId(nextStudent.id);
        }
      } else {
        // Last student: focus 'Listo' button
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  const SyncIndicator = ({ status }: { status: SyncStatus }) => {
    switch (status) {
      case 'syncing':
        return <ArrowPathIcon className="w-4 h-4 text-indigo-500 animate-spin" />;
      case 'synced':
        return <CheckIcon className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <ExclamationIcon className="w-4 h-4 text-red-500" title="Error de sincronización" />;
      case 'draft':
        return <CloudIcon className="w-4 h-4 text-slate-400 opacity-50" title="Cámbio local pendiente" />;
      default:
        return null;
    }
  };

  const renderSimpleStudentRow = (student: Student, index: number) => (
    <div
      key={student.id}
      className={`grid grid-cols-12 items-center gap-2 p-2 rounded-lg transition-colors ${focusedStudentId === student.id ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
      onClick={() => {
        const el = inputRefs.current[student.id];
        if (el) el.focus();
      }}
    >
      <div className="col-span-1 flex justify-center">
        <SyncIndicator status={syncStatuses[student.id]} />
      </div>
      <label htmlFor={`grade-${student.id}`} className={`col-span-8 text-sm font-medium truncate cursor-pointer ${focusedStudentId === student.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
        <span className="font-bold mr-1">{student.orderNumber || '-'}.</span>
        {student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.name}
      </label>
      <input
        ref={el => { inputRefs.current[student.id] = el; }}
        id={`grade-${student.id}`} type="number" value={localGrades[student.id]?.score ?? ''}
        onChange={(e) => handleScoreChange(student.id, e.target.value)}
        onFocus={() => setFocusedStudentId(student.id)}
        onBlur={() => setFocusedStudentId(null)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        max={instrument!.totalPoints} min={0}
        placeholder="-"
        className={`col-span-3 w-full text-center border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${(() => {
            const v = parseFloat(localGrades[student.id]?.score ?? '');
            return !isNaN(v) && v > instrument!.totalPoints ? 'border-red-400 ring-1 ring-red-400' : '';
          })()
          }`}
      />
    </div>
  );

  const renderSimpleGrading = () => {
    if (gradingMode === 'team' && groupedStudents) {
      return (
        <div className="space-y-4">
          {groupedStudents.localTeams.map(({ team, students: tStudents }) => {
            const firstStudent = tStudents[0];
            if (!firstStudent) return null;
            const teamScore = localGrades[firstStudent.id]?.score ?? '';
            const statuses = tStudents.map(s => syncStatuses[s.id]);
            const teamStatus = statuses.includes('error') ? 'error' : statuses.includes('syncing') ? 'syncing' : statuses.includes('draft') ? 'draft' : 'synced';

            return (
              <div
                key={team.id}
                className="grid grid-cols-12 items-center gap-2 p-2 rounded-lg transition-colors bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <div className="col-span-1 flex justify-center">
                  <SyncIndicator status={teamStatus} />
                </div>
                <label className="col-span-8 flex items-center gap-2 text-sm font-medium truncate cursor-pointer text-slate-800 dark:text-slate-100">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color || '#6366f1' }}></div>
                  <span className="font-bold truncate">{team.name}</span>
                  <span className="text-xs font-normal text-slate-500 flex-shrink-0">({tStudents.length} est.)</span>
                </label>
                <input
                  type="number" value={teamScore}
                  onChange={(e) => handleTeamScoreChange(team.id, e.target.value, tStudents)}
                  max={instrument!.totalPoints} min={0}
                  placeholder="-"
                  className="col-span-3 w-full text-center border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            );
          })}
          
          {groupedStudents.unassigned.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Sin Equipo</h3>
              {groupedStudents.unassigned.map((student, index) => renderSimpleStudentRow(student, index))}
            </div>
          )}
        </div>
      );
    }

    return classStudents.map((student, index) => renderSimpleStudentRow(student, index));
  };


  const renderCriteriaStudentRow = (student: Student) => (
    <tr
      key={student.id}
      className={`border-t border-slate-200 dark:border-slate-700 transition-colors ${focusedStudentId === student.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
    >
      <td className="p-2 text-center w-8">
        <SyncIndicator status={syncStatuses[student.id]} />
      </td>
      <td className={`p-2 font-medium ${focusedStudentId === student.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
        <span className="font-bold mr-1">{student.orderNumber || '-'}.</span>
        {student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : student.name}
      </td>
      {instrument?.criteria?.map(c => (
        <td key={c.id} className="p-2 text-center" onFocus={() => setFocusedStudentId(student.id)}>
          {instrument.type === 'Lista de Cotejo' ? (
            <input
              type="checkbox"
              checked={!!localGrades[student.id]?.criteria[c.id]}
              onChange={e => handleCriteriaChange(student.id, c.id, e.target.checked)}
              onFocus={() => setFocusedStudentId(student.id)}
              className="h-5 w-5 bg-slate-100 dark:bg-slate-700 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
            />
          ) : (
            <input
              type="number"
              min={0}
              max={c.maxPoints !== undefined ? c.maxPoints : undefined}
              step="0.1"
              value={localGrades[student.id]?.criteria[c.id] !== undefined && localGrades[student.id]?.criteria[c.id] !== null
                ? String(localGrades[student.id].criteria[c.id])
                : ''}
              onChange={e => {
                const raw = e.target.valueAsNumber;
                const val = c.maxPoints !== undefined && !isNaN(raw) ? Math.min(raw, c.maxPoints) : raw;
                handleCriteriaChange(student.id, c.id, val);
              }}
              onFocus={() => setFocusedStudentId(student.id)}
              onBlur={() => setFocusedStudentId(null)}
              placeholder="-"
              className={`w-16 text-center border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${c.maxPoints !== undefined &&
                !isNaN(Number(localGrades[student.id]?.criteria[c.id])) &&
                Number(localGrades[student.id]?.criteria[c.id]) > c.maxPoints
                ? 'border-red-400 ring-1 ring-red-400'
                : ''
                }`}
            />
          )}
        </td>
      ))}
      <td className="p-2 text-center">
        <span className={`font-bold text-sm ${localGrades[student.id]?.score ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
          }`}>
          {localGrades[student.id]?.score || '-'}
          {localGrades[student.id]?.score && <span className="text-xs font-normal text-slate-400">/{instrument!.totalPoints}</span>}
        </span>
      </td>
    </tr>
  );

  const renderCriteriaGrading = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="font-semibold p-2 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">Status</th>
            <th className="font-semibold p-2 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">Estudiante</th>
            {instrument?.criteria?.map(c => (
              <th key={c.id} className="font-semibold p-2 text-center w-24 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800" title={c.text}>
                <div className="flex flex-col items-center">
                  <span>{c.text.split(' ').slice(0, 3).join(' ')}{c.text.split(' ').length > 3 ? '...' : ''}</span>
                  {c.maxPoints !== undefined && (
                    <span className="text-[10px] font-normal text-indigo-500 dark:text-indigo-400">/{c.maxPoints}pts</span>
                  )}
                </div>
              </th>
            ))}
            <th className="font-semibold p-2 text-center w-16 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">Total</th>
          </tr>
        </thead>
        <tbody>
          {gradingMode === 'team' && groupedStudents ? (
            <>
              {groupedStudents.localTeams.map(({ team, students: tStudents }) => {
                const firstStudent = tStudents[0];
                if (!firstStudent) return null;
                const statuses = tStudents.map(s => syncStatuses[s.id]);
                const teamStatus = statuses.includes('error') ? 'error' : statuses.includes('syncing') ? 'syncing' : statuses.includes('draft') ? 'draft' : 'synced';
                
                return (
                  <tr key={team.id} className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <td className="p-2 text-center w-8">
                      <SyncIndicator status={teamStatus} />
                    </td>
                    <td className="p-2 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color || '#6366f1' }}></div>
                      <span className="font-bold truncate">{team.name}</span>
                    </td>
                    {instrument?.criteria?.map(c => (
                      <td key={c.id} className="p-2 text-center">
                        {instrument.type === 'Lista de Cotejo' ? (
                          <input
                            type="checkbox"
                            checked={!!localGrades[firstStudent.id]?.criteria[c.id]}
                            onChange={e => handleTeamCriteriaChange(team.id, c.id, e.target.checked, tStudents)}
                            className="h-5 w-5 bg-slate-100 dark:bg-slate-700 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500"
                          />
                        ) : (
                          <input
                            type="number" min={0} max={c.maxPoints} step="0.1"
                            value={localGrades[firstStudent.id]?.criteria[c.id] !== undefined && localGrades[firstStudent.id]?.criteria[c.id] !== null ? String(localGrades[firstStudent.id].criteria[c.id]) : ''}
                            onChange={e => {
                              const raw = e.target.valueAsNumber;
                              const val = c.maxPoints !== undefined && !isNaN(raw) ? Math.min(raw, c.maxPoints) : raw;
                              handleTeamCriteriaChange(team.id, c.id, val, tStudents);
                            }}
                            placeholder="-"
                            className="w-16 text-center border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm sm:text-sm"
                          />
                        )}
                      </td>
                    ))}
                    <td className="p-2 text-center">
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {localGrades[firstStudent.id]?.score || '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {groupedStudents.unassigned.length > 0 && (
                <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                  <td colSpan={instrument!.criteria!.length + 3} className="p-2 bg-slate-100 dark:bg-slate-800">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sin Equipo</span>
                  </td>
                </tr>
              )}
              {groupedStudents.unassigned.map(student => renderCriteriaStudentRow(student))}
            </>
          ) : (
            classStudents.map(student => renderCriteriaStudentRow(student))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && instrument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-white/20 dark:border-slate-700/50 max-h-[92vh] relative z-10 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent leading-tight">{instrument.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <CloudIcon className="w-3 h-3" /> Auto-guardado
                    </p>
                    {localTeams && localTeams.length > 0 && (
                      <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-lg p-0.5">
                        <button
                          onClick={() => setGradingMode('individual')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${gradingMode === 'individual' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          <UserIcon className="w-3.5 h-3.5" /> Individual
                        </button>
                        <button
                          onClick={() => setGradingMode('team')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${gradingMode === 'team' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                          <UserGroupIcon className="w-3.5 h-3.5" /> Equipos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Cerrar modal"><XIcon /></button>
              </div>
              <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-800/30 px-4 py-3 rounded-xl">
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-medium">Puntos Máximos: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{instrument.totalPoints}</span></span>
                  <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
                  <span>{instrument.type}</span>
                </div>
              </div>
            </div>

            <div className="flex-grow min-h-0 overflow-y-auto px-6 pb-2 custom-scrollbar">
              {hasCriteria ? renderCriteriaGrading() : renderSimpleGrading()}
              {classStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <p>No hay estudiantes en esta clase.</p>
                </div>
              )}
            </div>

            <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 rounded-b-2xl">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
              >
                Listo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
