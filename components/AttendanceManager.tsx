import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Student, Class, AttendanceRecord, DailyNote } from '../types';
import { AttendanceStatus } from '../types';
import {
  ClipboardCheckIcon, XIcon, ClockIcon, PencilSquareIcon, PlusIcon,
  BoltIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, UserCheckIcon,
  DocumentAddIcon, CalendarIcon
} from './icons';
import { BarChart3, X as LucideX, AlertTriangle } from 'lucide-react';
import { ClassSelector } from './ClassSelector';
import { FastAttendance } from './FastAttendance';
import { Avatar } from './Avatar';
import { useUsageSession } from '../services/usageService';
import { sortStudents, getNowGMT4, getTodayStringGMT4, generateUUID, filterStudentsByClass } from '../utils';
import { useAlert, useConfirm } from '../contexts/ConfirmationContext';

// --- Daily Note Modal ---
interface DailyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  initialNote?: string;
}

const DailyNoteModal: React.FC<DailyNoteModalProps> = ({ isOpen, onClose, onSave, initialNote }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote || '');
    }
  }, [isOpen, initialNote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(note);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-md" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nota del Día</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Cerrar">
            <XIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="daily-note-textarea" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nota</label>
            <textarea
              id="daily-note-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: No hubo docencia por lluvias..."
              className="w-full px-3 py-2 text-base border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={4}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Cancelar</button>
            <button type="submit" className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700">
              <PencilSquareIcon className="w-4 h-4 mr-2" />Guardar Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; color: 'blue' | 'pink' | 'sky' }> = ({ label, value, color }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100/50 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
    },
    pink: {
      bg: 'bg-pink-100/50 dark:bg-pink-500/10',
      text: 'text-pink-600 dark:text-pink-400',
    },
    sky: {
      bg: 'bg-sky-100/50 dark:bg-sky-500/10',
      text: 'text-sky-600 dark:text-sky-400',
    },
  };

  return (
    <div className={`p-4 rounded-lg text-center shadow-sm ${colorClasses[color].bg}`}>
      <p className={`text-4xl font-bold ${colorClasses[color].text}`}>{value}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
};


interface AttendanceManagerProps {
  students: Student[];
  classes: Class[];
  attendance: AttendanceRecord[];
  dailyNotes: DailyNote[];
  onSetAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  onSetDailyNotes: React.Dispatch<React.SetStateAction<DailyNote[]>>;
  selectedClassId: string | null;
  onSelectClass: (classId: string) => void;
  onAddStudentClick: (classId: string) => void;
  onImportStudentsClick: () => void;
  onNavigate?: (view: any) => void;
  initialMode?: 'normal' | 'fast';
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ students, classes, attendance, dailyNotes, onSetAttendance, onSetDailyNotes, selectedClassId, onSelectClass, onAddStudentClick, onImportStudentsClick, onNavigate, initialMode = 'normal' }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const { logSession } = useUsageSession();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'normal' | 'fast'>(initialMode);

  const [viewFilter, setViewFilter] = useState<'all' | 'absent' | 'excused'>('all');
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const alert = useAlert();
  const confirm = useConfirm();

  useEffect(() => {
    if (initialMode) setViewMode(initialMode);
  }, [initialMode]);
  const activeDayMobileRef = useRef<HTMLButtonElement>(null);
  const activeDayDesktopRef = useRef<HTMLButtonElement>(null);
  const activeMonthRef = useRef<HTMLButtonElement>(null);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const { schoolYearStart, schoolYearEnd, schoolMonths } = useMemo(() => {
    if (!selectedClass?.schoolYear) {
      const now = new Date();
      return { schoolYearStart: now, schoolYearEnd: now, schoolMonths: [] };
    }
    const [startYearStr, endYearStr] = selectedClass.schoolYear.split('-');
    const startYear = parseInt(startYearStr, 10);
    const endYear = parseInt(endYearStr, 10);

    if (isNaN(startYear) || isNaN(endYear)) {
      const now = new Date();
      return { schoolYearStart: now, schoolYearEnd: now, schoolMonths: [] };
    }

    const schoolYearStart = new Date(startYear, 7, 1); // August 1st
    const schoolYearEnd = new Date(endYear, 5, 30);   // June 30th

    const months: { date: Date; key: string; name: string; year: number }[] = [];
    for (let i = 0; i < 11; i++) {
      const monthDate = new Date(startYear, 7 + i, 1);
      months.push({
        date: monthDate,
        key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        name: monthDate.toLocaleString('es-ES', { month: 'long' }),
        year: monthDate.getFullYear(),
      });
    }
    return { schoolYearStart, schoolYearEnd, schoolMonths: months };
  }, [selectedClass]);

  const [currentMonthIndex, setCurrentMonthIndex] = useState(-1);

  // Sync selected date with month index
  useEffect(() => {
    // ... logic for index sync
    const date = new Date(selectedDate);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const index = schoolMonths.findIndex(m => m.key === dateKey);
    if (index !== -1) setCurrentMonthIndex(index);
  }, [selectedDate, schoolMonths]);


  const daysInSelectedMonth = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [selectedDate]);

  const selectedMonthDate = useMemo(() => new Date(selectedDate + 'T12:00:00'), [selectedDate]); // For grid calc

  const isWeekend = useMemo(() => {
    const date = new Date(selectedDate + 'T12:00:00'); // No TZ issues
    const day = date.getDay();
    return day === 0 || day === 6;
  }, [selectedDate]);

  const formattedDate = useMemo(() => {
    const date = new Date(selectedDate + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  const formattedMonthYear = useMemo(() => {
    const date = new Date(selectedDate + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const todayString = useMemo(() => getTodayStringGMT4(), []);
  const isTodayInSchoolYear = useMemo(() => {
    const today = new Date(todayString + 'T12:00:00');
    return today >= schoolYearStart && today <= schoolYearEnd;
  }, [todayString, schoolYearStart, schoolYearEnd]);


  const getAttendanceStatus = useCallback((studentId: string): AttendanceStatus | undefined => {
    return attendance.find(a =>
      a.studentId === studentId &&
      a.date === selectedDate &&
      (a.classId === selectedClassId || (!a.classId)) // Backward compatibility: match specific class OR legacy global records
    )?.status;
  }, [attendance, selectedDate, selectedClassId]);

  const filteredStudents = useMemo(() => {
    let list = sortStudents(filterStudentsByClass(students, selectedClassId, classes));

    // Apply View Filter
    if (viewFilter !== 'all') {
      list = list.filter(student => {
        const status = getAttendanceStatus(student.id);
        if (viewFilter === 'absent') return status === AttendanceStatus.ABSENT || status === AttendanceStatus.EXCUSED;
        return true;
      });
    }
    return list;
  }, [students, classes, selectedClassId, viewFilter, getAttendanceStatus]);

  const unmarkedStudents = useMemo(() => {
    const classStudents = filterStudentsByClass(students, selectedClassId, classes);
    return sortStudents(classStudents.filter(s => !getAttendanceStatus(s.id)));
  }, [students, classes, selectedClassId, getAttendanceStatus]);


  const attendanceSummary = useMemo(() => {
    // Logic for summary uses ALL students in class, not just filtered view
    // unless user wants summary to reflect filter? usually summary is global for the day.
    // Let's keep it global.
    const classStudents = filterStudentsByClass(students, selectedClassId, classes);

    // Let's strictly count PRESENT and LATE as "In Attendance"
    const attending = classStudents.filter(s => {
      const status = getAttendanceStatus(s.id);
      return status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE;
    });

    return {
      total: attending.length,
      male: attending.filter(s => s.gender === 'M').length,
      female: attending.filter(s => s.gender === 'F').length
    }

  }, [students, classes, selectedClassId, getAttendanceStatus]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentMonthIndex - 1 : currentMonthIndex + 1;
    if (newIndex >= 0 && newIndex < schoolMonths.length) {
      const newMonth = schoolMonths[newIndex];
      const newDate = new Date(newMonth.date);
      const currentDay = new Date(selectedDate + 'T12:00:00').getDate();
      const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      newDate.setDate(Math.min(currentDay, daysInNewMonth));
      setSelectedDate(newDate.toISOString().split('T')[0]);
    }
  };

  // Validate selected date when class changes
  useEffect(() => {
    if (!selectedClassId || schoolMonths.length === 0) return;

    const currentDate = new Date(selectedDate + 'T12:00:00');
    // Check if the current date is outside the valid school year range
    if (currentDate < schoolYearStart || currentDate > schoolYearEnd) {
      const now = getNowGMT4();
      // Check if today is within the new class's school year
      if (now >= schoolYearStart && now <= schoolYearEnd) {
        setSelectedDate(getTodayStringGMT4());
      } else {
        // Default to the first month of the school year (August)
        setSelectedDate(schoolMonths[0].date.toISOString().split('T')[0]);
      }
    }
  }, [selectedClassId, schoolYearStart, schoolYearEnd, schoolMonths, selectedDate]);

  useEffect(() => {
    if (activeMonthRef.current) {
      activeMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDate, schoolMonths]);

  const scrollToSelectedDate = useCallback(() => {
    if (activeDayMobileRef.current) {
      activeDayMobileRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    if (activeDayDesktopRef.current) {
      activeDayDesktopRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToSelectedDate();
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDate, scrollToSelectedDate]);

  const handleGoToToday = () => {
    if (isTodayInSchoolYear) {
      const today = getTodayStringGMT4();
      if (selectedDate === today) {
        scrollToSelectedDate();
      } else {
        setSelectedDate(today);
      }
    }
  };




  const currentNote = useMemo(() => {
    return dailyNotes.find(n => n.classId === selectedClassId && n.date === selectedDate);
  }, [dailyNotes, selectedClassId, selectedDate]);


  const updateAttendanceRecords = useCallback((updater: (prev: AttendanceRecord[]) => AttendanceRecord[]) => {
    onSetAttendance(updater);
  }, [onSetAttendance]);

  const toggleStudentAttendance = useCallback((studentId: string, date: string, status: AttendanceStatus) => {
    updateAttendanceRecords(prevAttendance => {
      const updatedAttendance = [...prevAttendance];
      const existingRecordIndex = updatedAttendance.findIndex(a => 
        a.studentId === studentId && a.date === date && (a.classId === selectedClassId || !a.classId)
      );
      
      if (existingRecordIndex === -1) {
        updatedAttendance.push({ id: `${selectedClassId || 'global'}_${studentId}_${date}`, studentId, date, status, classId: selectedClassId });
        return updatedAttendance;
      }
      
      if (updatedAttendance[existingRecordIndex].status === status) {
        updatedAttendance.splice(existingRecordIndex, 1);
        return updatedAttendance;
      }
      
      updatedAttendance[existingRecordIndex] = { ...updatedAttendance[existingRecordIndex], status };
      return updatedAttendance;
    });
  }, [updateAttendanceRecords, selectedClassId]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    toggleStudentAttendance(studentId, selectedDate, status);
  };

  // Cycling Bulk Action State
  const [nextBulkAction, setNextBulkAction] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);

  const handleCycleBulkAction = () => {
    if (filteredStudents.length === 0) return;

    // Apply current nextBulkAction to all filtered students
    updateAttendanceRecords(prev => {
      const updatedAttendance = [...prev];
      filteredStudents.forEach(student => {
        const existingRecordIndex = updatedAttendance.findIndex(a => a.studentId === student.id && a.date === selectedDate && (a.classId === selectedClassId || !a.classId));
        if (existingRecordIndex > -1) {
          // Overwrite existing status
          updatedAttendance[existingRecordIndex] = { ...updatedAttendance[existingRecordIndex], status: nextBulkAction, classId: selectedClassId }; // Ensure classId is set on update
        } else {
          updatedAttendance.push({ id: `${selectedClassId || 'global'}_${student.id}_${selectedDate}`, studentId: student.id, date: selectedDate, status: nextBulkAction, classId: selectedClassId });
        }
      });
      return updatedAttendance;
    });

    // Cycle the next action: P -> L -> A -> P
    const cycleOrder = [AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.ABSENT];
    const currentIndex = cycleOrder.indexOf(nextBulkAction);
    const nextIndex = (currentIndex + 1) % cycleOrder.length;
    setNextBulkAction(cycleOrder[nextIndex]);
  };

  const bulkUpdateStatus = (status: AttendanceStatus) => {
    if (filteredStudents.length === 0) return;
    updateAttendanceRecords(prev => {
      const updatedAttendance = [...prev];
      filteredStudents.forEach(student => {
        const existingRecordIndex = updatedAttendance.findIndex(a => a.studentId === student.id && a.date === selectedDate && (a.classId === selectedClassId || !a.classId));
        if (existingRecordIndex > -1) {
          if (updatedAttendance[existingRecordIndex].status !== status) {
            updatedAttendance[existingRecordIndex] = { ...updatedAttendance[existingRecordIndex], status, classId: selectedClassId };
          }
        } else {
          updatedAttendance.push({ id: `${selectedClassId || 'global'}_${student.id}_${selectedDate}`, studentId: student.id, date: selectedDate, status, classId: selectedClassId });
        }
      });
      return updatedAttendance;
    });
    setIsFabOpen(false);
  };

  const clearAllStatuses = () => {
    const classStudents = filterStudentsByClass(students, selectedClassId, classes);
    if (classStudents.length === 0) return;
    updateAttendanceRecords(prev => {
      const studentIdsToClear = new Set(classStudents.map(s => s.id));
      return prev.filter(record => !(record.date === selectedDate && studentIdsToClear.has(record.studentId)));
    });
  };

  const handleSaveNote = (note: string) => {
    onSetDailyNotes(prev => {
      const updatedNotes = [...prev];
      const existingNoteIndex = updatedNotes.findIndex(n => n.classId === selectedClassId && n.date === selectedDate);
      if (note.trim() === '') {
        if (existingNoteIndex > -1) {
          return updatedNotes.filter((_, index) => index !== existingNoteIndex);
        }
        return updatedNotes;
      }

      const noteObj = existingNoteIndex > -1 ? updatedNotes[existingNoteIndex] : { id: `DN${Date.now()}`, classId: selectedClassId!, date: selectedDate, note: '' };
      noteObj.note = note;

      if (existingNoteIndex === -1 && selectedClassId) {
        updatedNotes.push(noteObj);
      } else if (existingNoteIndex > -1) {
        updatedNotes[existingNoteIndex] = noteObj;
      }
      return updatedNotes;
    });
    setIsNoteModalOpen(false);
  };

  const handleSaveFastAttendance = (newRecords: AttendanceRecord[]) => {
    updateAttendanceRecords(prev => {
      const formattedRecords = newRecords.map(nr => ({
        ...nr,
        id: nr.id || `${selectedClassId || 'global'}_${nr.studentId}_${nr.date}`,
        classId: selectedClassId
      }));
      return [...prev, ...formattedRecords];
    });
    setViewMode('normal');
  };

  const getStatusButtonClasses = (currentStatus: AttendanceStatus | undefined, buttonStatus: AttendanceStatus) => {
    const baseClasses = 'w-9 h-9 sm:w-8 sm:h-8 rounded-full font-bold text-sm flex items-center justify-center transition-all duration-200 border-2';

    if (currentStatus !== buttonStatus) {
      return `${baseClasses} bg-transparent border-slate-300 text-slate-400 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-700`;
    }

    let selectedClasses = 'text-white shadow-md ';
    switch (buttonStatus) {
      case AttendanceStatus.PRESENT: selectedClasses += 'bg-green-500 border-green-500'; break;
      case AttendanceStatus.ABSENT: selectedClasses += 'bg-red-500 border-red-500'; break;
      case AttendanceStatus.LATE: selectedClasses += 'bg-yellow-500 border-yellow-500'; break;
      case AttendanceStatus.EXCUSED: selectedClasses += 'bg-blue-500 border-blue-500'; break;
    }
    return `${baseClasses} ${selectedClasses}`;
  };

  const handleReplicateAttendance = async () => {
    if (!selectedClass?.groupId || !selectedClass.groupId) return;

    // Find other classes in the same group
    const groupClasses = classes.filter(c => c.groupId === selectedClass.groupId && c.id !== selectedClassId);

    if (groupClasses.length === 0) {
      await alert({ title: 'Atención', message: 'No hay otras clases en este grupo para replicar.', type: 'warning' });
      return;
    }

    if (!await confirm({ title: 'Confirmar Replicación', message: `Se replicará la asistencia de ${formattedDate} a ${groupClasses.length} clases más del grupo. ¿Continuar?`, type: 'info' })) return;

    // Get current attendance for this class/date
    const currentAttendance = attendance.filter(a => a.date === selectedDate && (a.classId === selectedClassId || !a.classId));

    onSetAttendance(prev => {
      // Remove existing records for the target classes on this date to prevent duplicates/conflicts
      const cleanPrev = prev.filter(a =>
        !(a.date === selectedDate && groupClasses.some(c => c.id === a.classId))
      );

      const replicationRecords: AttendanceRecord[] = [];
      for (const targetClass of groupClasses) {
        currentAttendance.forEach(record => {
          replicationRecords.push({
            ...record,
            id: generateUUID(), // New ID
            classId: targetClass.id // Target Class
          });
        });
      }

      return [...cleanPrev, ...replicationRecords];
    });

    await alert({ title: 'Éxito', message: 'Asistencia replicada con éxito.', type: 'success' });
  };

  return (
    <div>
      <div className="md:hidden p-4 pb-0">
        <ClassSelector
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectClass={onSelectClass}
          size="default"
        />
      </div>
      <div className="p-4 sm:p-8 space-y-6">


        {/* --- MOBILE VIEW --- */}
        <div className="md:hidden space-y-4">

          {/* Unified Mobile Controller Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4">

            {/* 1. Header: Month & Today */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => handleMonthChange('prev')} disabled={currentMonthIndex <= 0} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
                <ChevronLeftIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>

              <div className="flex flex-col items-center">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize leading-tight">
                  {formattedMonthYear}
                </h2>
                <button onClick={handleGoToToday} disabled={!isTodayInSchoolYear} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 mt-0.5">
                  Ir a Hoy
                </button>
              </div>

              <button onClick={() => handleMonthChange('next')} disabled={currentMonthIndex >= schoolMonths.length - 1} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
                <ChevronRightIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* 2. Calendar Strip */}
            <div className="relative -mx-4 mb-5 group">
              {/* Left Fade */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-800 to-transparent z-10 pointer-events-none" />
              {/* Right Fade */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-800 to-transparent z-10 pointer-events-none" />

              <div className="flex items-center space-x-2 px-4 overflow-x-auto no-scrollbar py-2">
                {daysInSelectedMonth.map(day => {
                  const dayDate = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), day, 12);
                  const dayOfWeek = dayDate.getDay();
                  if (dayOfWeek === 0 || dayOfWeek === 6) return null;

                  const weekday = dayDate.toLocaleDateString('es-ES', { weekday: 'short' });
                  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1, 3);
                  const dayDateString = dayDate.toISOString().split('T')[0];
                  const isSelected = dayDateString === selectedDate;
                  const isToday = dayDateString === todayString;

                  return (
                    <button key={day} ref={isSelected ? activeDayMobileRef : null} onClick={() => setSelectedDate(dayDateString)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-lg transition-all w-14 h-16 ${isSelected ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                        : isToday ? 'bg-slate-50 dark:bg-slate-700 ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-300'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-100 dark:border-slate-600'}`}>
                      <span className="text-xs uppercase font-bold opacity-70 mb-0.5">{capitalizedWeekday}</span>
                      <span className="text-xl font-bold leading-none">{day}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Actions Grid */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
              {/* Daily Note Button */}
              <button
                onClick={() => setIsNoteModalOpen(true)}
                disabled={isWeekend}
                className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-40"
              >
                <div className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-full mb-1">
                  <PencilSquareIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 text-center uppercase tracking-wide">Nota</span>
              </button>

              {/* Fast Attendance Button */}
              <button
                onClick={() => setViewMode('fast')}
                disabled={unmarkedStudents.length === 0 || isWeekend}
                className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-40"
              >
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-1">
                  <BoltIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 text-center uppercase tracking-wide">Pasar lista</span>
              </button>

              {/* Statistics Button */}
              <button
                onClick={() => setIsStatsModalOpen(true)}
                disabled={isWeekend}
                className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-40"
              >
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full mb-1">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 text-center uppercase tracking-wide">Conteo</span>
              </button>
            </div>

          </div>

          {/* Mobile Daily Note Preview */}
          {currentNote && currentNote.note.trim() !== '' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-pink-200 dark:border-pink-900/30 p-4 mb-4 md:hidden" onClick={() => setIsNoteModalOpen(true)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                  <PencilSquareIcon className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Nota del día</h3>
                </div>
                <span className="text-xs text-slate-400">Clic para editar</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 italic">{currentNote.note}</p>
            </div>
          )}
        </div>

        {/* Mobile Student List */}
        <div className="md:hidden space-y-3 pb-24">
          {!isWeekend ? (
            filteredStudents.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                {students.length > 0 && viewFilter !== 'all' ? (
                  <>
                    <UserCheckIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No hay estudiantes ausentes</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <p>No hay estudiantes en esta clase.</p>
                    {selectedClassId && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAddStudentClick(selectedClassId)}
                          className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          <PlusIcon className="w-5 h-5 mr-2" />
                          Añadir Estudiante
                        </button>
                        <button
                          onClick={onImportStudentsClick}
                          className="flex items-center bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                        >
                          <DocumentAddIcon className="w-5 h-5 mr-2" />
                          Importar Lista
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              filteredStudents.map(student => {
                const status = getAttendanceStatus(student.id);
                return (
                  <div key={student.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-400 w-6 text-center">
                        {student.orderNumber || '#'}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {status === AttendanceStatus.PRESENT && <span className="text-green-600 font-medium">Presente</span>}
                          {status === AttendanceStatus.LATE && <span className="text-yellow-600 font-medium">Tarde</span>}
                          {status === AttendanceStatus.ABSENT && <span className="text-red-600 font-medium">Ausente</span>}
                          {status === AttendanceStatus.EXCUSED && <span className="text-blue-600 font-medium">Excusa</span>}
                          {!status && 'Sin marcar'}
                        </p>
                      </div>
                    </div>

                    {/* Mobile Status Controls (Compact) */}
                    <div className="flex gap-1">
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)} className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-colors ${status === AttendanceStatus.PRESENT ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 text-slate-400'}`}>P</button>
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.LATE)} className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-colors ${status === AttendanceStatus.LATE ? 'bg-yellow-500 border-yellow-500 text-white' : 'border-slate-200 text-slate-400'}`}>T</button>
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)} className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-colors ${status === AttendanceStatus.ABSENT ? 'bg-red-500 border-red-500 text-white' : 'border-slate-200 text-slate-400'}`}>A</button>
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.EXCUSED)} className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-colors ${status === AttendanceStatus.EXCUSED ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200 text-slate-400'}`}>E</button>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <ClockIcon className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Fin de Semana</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                No es necesario tomar asistencia hoy.
              </p>
            </div>
          )}
        </div>

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-8 h-[calc(100vh-140px)]">

          {/* MAIN CONTENT: List (Span 8) */}
          <div className="md:col-span-8 lg:col-span-8 flex flex-col h-full overflow-hidden">

            {/* Unified Parent Container */}
            <div className="flex-grow flex flex-col bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              
              {/* Shared Toolbar */}
              <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-4 justify-between bg-white dark:bg-slate-800">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Selector Día-Semana-Mes */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    <button onClick={() => setViewType('day')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewType === 'day' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Día</button>
                    <button onClick={() => setViewType('week')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewType === 'week' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Semana</button>
                    <button onClick={() => setViewType('month')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewType === 'month' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Mes</button>
                  </div>

                  {/* Dropdown Filtrar */}
                  <div className="relative">
                    <button 
                      onBlur={() => setTimeout(() => setIsFilterDropdownOpen(false), 200)}
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                    >
                      Filtrar: <span className="text-indigo-600 dark:text-indigo-400">{viewFilter === 'all' ? 'Todos' : viewFilter === 'absent' ? 'Ausentes' : 'Excusas'}</span>
                      <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${isFilterDropdownOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isFilterDropdownOpen && (
                      <div className="absolute top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50">
                        <button onMouseDown={(e) => { e.preventDefault(); setViewFilter('all'); setIsFilterDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 ${viewFilter === 'all' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-700 dark:text-slate-300'}`}>Todos</button>
                        <button onMouseDown={(e) => { e.preventDefault(); setViewFilter('absent'); setIsFilterDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 ${viewFilter === 'absent' ? 'text-orange-500 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-900/10' : 'text-slate-700 dark:text-slate-300'}`}>Ausentes</button>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Acciones */}
                  {!isWeekend && (
                    <div className="relative">
                      <button 
                        onBlur={() => setTimeout(() => setIsActionsDropdownOpen(false), 200)}
                        onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                      >
                        Acciones
                        <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform ${isActionsDropdownOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isActionsDropdownOpen && (
                        <div className="absolute top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50">
                          <button onMouseDown={(e) => { e.preventDefault(); bulkUpdateStatus(AttendanceStatus.PRESENT); setIsActionsDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] font-bold tracking-wide text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><ClipboardCheckIcon className="w-4 h-4" /> Todos Presentes</button>
                          <button onMouseDown={(e) => { e.preventDefault(); bulkUpdateStatus(AttendanceStatus.LATE); setIsActionsDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] font-bold tracking-wide text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"><ClockIcon className="w-4 h-4" /> Todos Tarde</button>
                          <button onMouseDown={(e) => { e.preventDefault(); bulkUpdateStatus(AttendanceStatus.ABSENT); setIsActionsDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] font-bold tracking-wide text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"><XIcon className="w-4 h-4" /> Todos Ausentes</button>
                          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1.5 mx-2"></div>
                          <button onMouseDown={(e) => { e.preventDefault(); clearAllStatuses(); setIsActionsDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] font-bold tracking-wide text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><TrashIcon className="w-4 h-4" /> Limpiar Marcas</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {viewType === 'day' && !isWeekend && (
                  <button
                    onClick={() => setViewMode('fast')}
                    disabled={unmarkedStudents.length === 0}
                    className={`flex items-center gap-2 px-5 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shrink-0 border ${unmarkedStudents.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 border-transparent' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'}`}
                  >
                    Pasar Lista <BoltIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-grow overflow-hidden flex flex-col bg-slate-50/20 dark:bg-slate-900/10">
                {viewType === 'day' ? (
                  <div className="flex-grow overflow-y-auto">
                    {!isWeekend ? (
                      <>
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50/30 dark:bg-slate-700/20 sticky top-0 z-10 backdrop-blur-sm shadow-sm border-b border-slate-100 dark:border-slate-700/50">
                            <tr>
                              <th className="p-4 py-3 font-bold text-sm text-slate-500 uppercase tracking-widest min-w-[240px]">Estudiante</th>
                              <th className="p-4 py-3 font-bold text-center text-sm text-slate-500 uppercase tracking-widest min-w-[140px]">Estado</th>
                            </tr>
                          </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredStudents.map((student) => {
                          const status = getAttendanceStatus(student.id);
                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group border-b border-transparent">
                              <td className="p-3">
                                <div className="flex items-center gap-3 px-2">
                                  <span className="text-xs font-black text-slate-400 w-5 text-right shrink-0">
                                    {String(student.orderNumber || '-').padStart(2, '0')}
                                  </span>
                                  <Avatar name={student.name} src={student.avatar} size="sm" className="bg-slate-100 dark:bg-slate-700 w-8 h-8 shrink-0" />
                                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                                    {student.lastName}, {student.firstName}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="inline-flex bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl gap-1 border border-slate-100 dark:border-slate-800/50">
                                  <button onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold shadow-sm transition-all ${status === AttendanceStatus.PRESENT ? 'bg-emerald-500 text-white scale-110 shadow-emerald-500/30' : 'text-slate-400 hover:text-emerald-500 hover:bg-white'}`}>
                                    P
                                  </button>
                                  <button onClick={() => handleStatusChange(student.id, AttendanceStatus.LATE)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold shadow-sm transition-all ${status === AttendanceStatus.LATE ? 'bg-amber-500 text-white scale-110 shadow-amber-500/30' : 'text-slate-400 hover:text-amber-500 hover:bg-white'}`}>
                                    T
                                  </button>
                                  <button onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold shadow-sm transition-all ${status === AttendanceStatus.ABSENT ? 'bg-rose-500 text-white scale-110 shadow-rose-500/30' : 'text-slate-400 hover:text-rose-500 hover:bg-white'}`}>
                                    A
                                  </button>
                                  <button onClick={() => handleStatusChange(student.id, AttendanceStatus.EXCUSED)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold shadow-sm transition-all ${status === AttendanceStatus.EXCUSED ? 'bg-indigo-500 text-white scale-110 shadow-indigo-500/30' : 'text-slate-400 hover:text-indigo-500 hover:bg-white'}`}>
                                    E
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <ClockIcon className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Fin de Semana</h3>
                  </div>
                )}
              </div>
            ) : viewType === 'week' ? (
              <div className="flex-grow overflow-y-auto">
                <WeeklyAttendanceView 
                  students={filteredStudents}
                  selectedDate={selectedDate}
                  attendance={attendance}
                  onToggleAttendance={toggleStudentAttendance}
                />
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto">
                <MonthlyAttendanceView 
                  students={filteredStudents}
                  selectedDate={selectedDate}
                  attendance={attendance}
                  onToggleAttendance={toggleStudentAttendance}
                />
              </div>
            )}
          </div>

          {/* Legend Footer (Shared) */}
          <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-700/50 shrink-0 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Leyenda:</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600/20 shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Presente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600/20 shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tardanza</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600/20 shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ausente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-500/20 shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Excusa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* RIGHT SIDEBAR: Calendar & Summary (Span 4) */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

            {/* Calendar Card: Horizontal Strip (Match Mobile Style) */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 p-8">
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => handleMonthChange('prev')} disabled={currentMonthIndex <= 0} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-30">
                  <ChevronLeftIcon className="w-6 h-6 text-slate-500" />
                </button>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white capitalize leading-tight">{formattedMonthYear}</h2>
                <button onClick={() => handleMonthChange('next')} disabled={currentMonthIndex >= schoolMonths.length - 1} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-30">
                  <ChevronRightIcon className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="relative -mx-4 group">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-800 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-800 to-transparent z-10 pointer-events-none" />

                <div className="flex items-center space-x-2 px-4 overflow-x-auto no-scrollbar py-2">
                  {daysInSelectedMonth.map(day => {
                    const dayDate = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), day, 12);
                    const dayOfWeek = dayDate.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) return null;

                    const weekday = dayDate.toLocaleDateString('es-ES', { weekday: 'short' });
                    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1, 4);
                    const dayDateString = dayDate.toISOString().split('T')[0];
                    const isSelected = dayDateString === selectedDate;
                    const isToday = dayDateString === todayString;

                    return (
                      <button key={day} ref={isSelected ? activeDayDesktopRef : null} onClick={() => setSelectedDate(dayDateString)}
                        className={`flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-xl transition-all w-14 h-16 ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                          : isToday ? 'bg-slate-50 dark:bg-slate-700 ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-300'
                            : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-100 dark:border-slate-600'}`}>
                        <span className="text-[10px] uppercase font-bold opacity-70 mb-1 tracking-widest">{capitalizedWeekday}</span>
                        <span className="text-lg font-black leading-none">{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button onClick={handleGoToToday} disabled={!isTodayInSchoolYear} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors disabled:opacity-30">
                  Ir a Hoy
                </button>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 p-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Resumen de Hoy</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-3 border border-indigo-100/30 dark:border-indigo-800/20 text-center flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Total</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-neutral-100 tabular-nums leading-none">{attendanceSummary.total}</span>
                </div>
                
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-3 border border-emerald-100/30 dark:border-emerald-800/20 text-center flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Hembras</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">{attendanceSummary.female}</span>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-3 border border-indigo-100/30 dark:border-indigo-800/20 text-center flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Varones</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums leading-none">{attendanceSummary.male}</span>
                </div>
              </div>
            </div>

            {/* Note Button Card (Below Summary) */}
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className={`w-full p-6 bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-between group hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 active:scale-[0.98]`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${currentNote ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                   <PencilSquareIcon className="w-5 h-5" />
                </div>
                <div className="text-left overflow-hidden">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Nota del Día</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                    {currentNote ? currentNote.note : 'Añadir Nota'}
                  </span>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Note Preview Card (Removed to avoid redundancy with the button above) */}

            <div className="mb-4" />
          </div>
        </div>


        {!isWeekend && (
          <>
            {isFabOpen && <div className="fixed inset-0 bg-black bg-opacity-40 z-20" onClick={() => setIsFabOpen(false)}></div>}
            <div className="fixed bottom-8 right-8 z-30 flex flex-col items-end pointer-events-none mb-24 md:hidden">
              <div className={`flex flex-col items-end space-y-3 mb-3 transition-all duration-300 ease-in-out ${isFabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Limpiar Marcas</span>
                  <button onClick={() => { clearAllStatuses(); setIsFabOpen(false); }} className="bg-slate-500 text-white p-3 rounded-full hover:bg-slate-600 shadow-lg"><TrashIcon /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Todos Ausentes</span>
                  <button onClick={() => { bulkUpdateStatus(AttendanceStatus.ABSENT); setIsFabOpen(false); }} className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 shadow-lg"><XIcon /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Todos Tarde</span>
                  <button onClick={() => { bulkUpdateStatus(AttendanceStatus.LATE); setIsFabOpen(false); }} className="bg-yellow-500 text-white p-3 rounded-full hover:bg-yellow-600 shadow-lg"><ClockIcon /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Todos Presentes</span>
                  <button onClick={() => { bulkUpdateStatus(AttendanceStatus.PRESENT); setIsFabOpen(false); }} className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 shadow-lg"><ClipboardCheckIcon /></button>
                </div>
              </div>
              <button onClick={() => setIsFabOpen(!isFabOpen)} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110 focus:outline-none pointer-events-auto" aria-haspopup="true" aria-expanded={isFabOpen}>
                <PlusIcon className={`w-8 h-8 transition-transform duration-300 ${isFabOpen ? 'rotate-45' : ''}`} />
              </button>
            </div>
          </>
        )}

        <DailyNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          onSave={handleSaveNote}
          initialNote={currentNote?.note}
        />

        {isStatsModalOpen && (() => {
          // Compute absent students + consecutive absence streak
          const classStudents = sortStudents(filterStudentsByClass(students, selectedClassId, classes));
          const absentToday = classStudents.filter(s => {
            const status = getAttendanceStatus(s.id);
            return status === AttendanceStatus.ABSENT;
          });

          const getConsecutiveAbsences = (studentId: string): number => {
            // Get all attendance for this student+class, sorted desc by date
            const studentAtt = attendance
              .filter(a => a.studentId === studentId && (a.classId === selectedClassId || !a.classId) && a.date <= selectedDate)
              .sort((a, b) => b.date.localeCompare(a.date));
            let streak = 0;
            for (const rec of studentAtt) {
              if (rec.status === AttendanceStatus.ABSENT) streak++;
              else break;
            }
            return streak;
          };

          const totalStudents = classStudents.length;
          const presentCount = classStudents.filter(s => { const st = getAttendanceStatus(s.id); return st === AttendanceStatus.PRESENT; }).length;
          const lateCount = classStudents.filter(s => { const st = getAttendanceStatus(s.id); return st === AttendanceStatus.LATE; }).length;
          const absentCount = absentToday.length;
          const excusedCount = classStudents.filter(s => { const st = getAttendanceStatus(s.id); return st === AttendanceStatus.EXCUSED; }).length;
          const unmarkedCount = classStudents.filter(s => !getAttendanceStatus(s.id)).length;

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center" onClick={() => setIsStatsModalOpen(false)}>
              <div
                className="bg-white dark:bg-slate-800 rounded-t-[28px] sm:rounded-[28px] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-fade-in-up"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 pb-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Conteo del Día</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">{formattedDate}</p>
                  </div>
                  <button onClick={() => setIsStatsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                    <LucideX className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto px-5 pb-6 space-y-4">
                  {/* Summary: Total Presentes + Femenino/Masculino */}
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/20">
                    <span className="text-sm font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Total Presentes</span>
                    <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{attendanceSummary.total}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20">
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">Femenino</span>
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{attendanceSummary.female}</span>
                    </div>
                    <div className="flex flex-col p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/20">
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400 mb-1">Masculino</span>
                      <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{attendanceSummary.male}</span>
                    </div>
                  </div>

                  {/* Absent Students List */}
                  {absentToday.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Ausentes hoy</h3>
                      </div>
                      <div className="space-y-2">
                        {absentToday.map(student => {
                          const streak = getConsecutiveAbsences(student.id);
                          return (
                            <div key={student.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 dark:bg-red-900/5 border border-red-100 dark:border-red-900/20">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden">
                                  <Avatar src={student.avatar} name={student.name} size="sm" className="w-full h-full" />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{student.name}</span>
                              </div>
                              {streak > 1 && (
                              <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-100/50 dark:border-red-900/30">
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">Racha de Ausencia:</span>
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{streak}</span>
                              </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {viewMode === 'fast' && unmarkedStudents.length > 0 && (
          <FastAttendance
            students={unmarkedStudents}
            onClose={() => setViewMode('normal')}
            onSave={handleSaveFastAttendance}
            date={selectedDate}
          />
        )}
      </div>
    </div >
  );
};

// --- Sub-components for Weekly/Monthly Views ---

// Child Components for Weekly and Monthly Views

const WeeklyAttendanceView: React.FC<{
  students: Student[];
  selectedDate: string;
  attendance: AttendanceRecord[];
  onToggleAttendance: (studentId: string, date: string, status: AttendanceStatus) => void;
}> = ({ students, selectedDate, attendance, onToggleAttendance }) => {
  const getWeekDays = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(date.setDate(diff));
    
    return [0, 1, 2, 3, 4].map(id => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + id);
      return d.toISOString().split('T')[0];
    });
  };

  const weekDays = getWeekDays(selectedDate);
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

  const getStatusForDate = (studentId: string, date: string) => {
    const record = attendance.find(a => a.studentId === studentId && a.date === date);
    return record?.status;
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="overflow-x-auto h-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/30">
              <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50 min-w-[240px]">Estudiante</th>
              {weekDays.map((date, i) => (
                <th key={date} className="px-4 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-100 dark:border-slate-700/50 min-w-[100px]">
                  <div className={date === selectedDate ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                    {dayNames[i]}
                    <span className="block text-lg mt-0.5">{date.split('-')[2]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {students.map(student => (
              <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 border-r border-slate-50 dark:border-slate-700/30">
                  <div className="flex items-center gap-3 px-2">
                    <span className="text-xs font-black text-slate-400 w-5 text-right shrink-0">
                      {String(student.orderNumber || '-').padStart(2, '0')}
                    </span>
                    <Avatar name={student.name} src={student.avatar} size="sm" className="bg-slate-100 dark:bg-slate-700 w-8 h-8 shrink-0" />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                      {student.lastName}, {student.firstName}
                    </span>
                  </div>
                </td>
                {weekDays.map(date => {
                  const status = getStatusForDate(student.id, date);
                  return (
                    <td key={date} className="px-2 py-3 text-center">
                      <div className="flex justify-center">
                         <button
                           onClick={() => {
                             const nextStatusMap: Record<string, AttendanceStatus> = {
                               [AttendanceStatus.PRESENT]: AttendanceStatus.LATE,
                               [AttendanceStatus.LATE]: AttendanceStatus.ABSENT,
                               [AttendanceStatus.ABSENT]: AttendanceStatus.EXCUSED,
                               [AttendanceStatus.EXCUSED]: AttendanceStatus.PRESENT,
                             };
                             onToggleAttendance(student.id, date, status ? nextStatusMap[status] : AttendanceStatus.PRESENT);
                           }}
                           className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${
                             status === AttendanceStatus.PRESENT ? 'bg-green-500 text-white shadow-sm' :
                             status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white shadow-sm' :
                             status === AttendanceStatus.ABSENT ? 'bg-red-500 text-white shadow-sm' :
                             status === AttendanceStatus.EXCUSED ? 'bg-blue-500 text-white shadow-sm' :
                             'bg-slate-100 dark:bg-slate-900 text-slate-300'
                           }`}
                         >
                           {status === AttendanceStatus.PRESENT ? 'P' :
                            status === AttendanceStatus.LATE ? 'T' :
                            status === AttendanceStatus.ABSENT ? 'A' :
                            status === AttendanceStatus.EXCUSED ? 'E' : '-'}
                         </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-auto p-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50 text-xs font-bold text-slate-400 uppercase text-center">
        Tip: Haz clic en los cuadros para rotar el estado de asistencia.
      </div>
    </div>
  );
};

const MonthlyAttendanceView: React.FC<{
  students: Student[];
  selectedDate: string;
  attendance: AttendanceRecord[];
  onToggleAttendance: (studentId: string, date: string, status: AttendanceStatus) => void;
}> = ({ students, selectedDate, attendance, onToggleAttendance }) => {
  const getMonthDays = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i, 12);
        if (d.getDay() !== 0 && d.getDay() !== 6) { // Skip weekends
            days.push(d.toISOString().split('T')[0]);
        }
    }
    return days;
  };

  const monthDays = getMonthDays(selectedDate);

  const getStatusForDate = (studentId: string, date: string) => {
    const record = attendance.find(a => a.studentId === studentId && a.date === date);
    return record?.status;
  };

  const getMonthlyStats = (studentId: string) => {
      const studentRecords = attendance.filter(a => a.studentId === studentId && monthDays.includes(a.date));
      return {
          absences: studentRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
          lates: studentRecords.filter(r => r.status === AttendanceStatus.LATE).length
      };
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="overflow-x-auto h-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/30">
              <th className="px-4 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700/50 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 min-w-[280px] w-[280px]">Estudiante</th>
              {monthDays.map(date => (
                <th key={date} className="px-1 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-100 dark:border-slate-700/50 min-w-[36px]">
                   <span className={date === selectedDate ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                    {date.split('-')[2]}
                   </span>
                </th>
              ))}
              <th className="px-4 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest text-center border-b border-slate-100 dark:border-slate-700/50 min-w-[80px]">Resumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {students.map(student => {
              const stats = getMonthlyStats(student.id);
              return (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-4 py-2.5 border-r border-slate-50 dark:border-slate-700/30 sticky left-0 bg-white dark:bg-slate-800 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3 w-full pr-2">
                      <span className="text-xs font-black text-slate-400 w-5 text-right shrink-0">
                        {String(student.orderNumber || '-').padStart(2, '0')}
                      </span>
                      <Avatar name={student.name} src={student.avatar} size="sm" className="bg-slate-100 dark:bg-slate-700 w-8 h-8 shrink-0" />
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                        {student.lastName}, {student.firstName}
                      </span>
                    </div>
                  </td>
                  {monthDays.map(date => {
                    const status = getStatusForDate(student.id, date);
                    return (
                      <td key={date} className="px-0.5 py-2 text-center">
                        <button
                          onClick={() => {
                            const nextStatusMap: Record<string, AttendanceStatus> = {
                              [AttendanceStatus.PRESENT]: AttendanceStatus.LATE,
                              [AttendanceStatus.LATE]: AttendanceStatus.ABSENT,
                              [AttendanceStatus.ABSENT]: AttendanceStatus.EXCUSED,
                              [AttendanceStatus.EXCUSED]: AttendanceStatus.PRESENT,
                            };
                            onToggleAttendance(student.id, date, status ? nextStatusMap[status] : AttendanceStatus.PRESENT);
                          }}
                          className={`w-5 h-5 mx-auto rounded flex items-center justify-center text-[9px] font-bold transition-all ${
                            status === AttendanceStatus.PRESENT ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/30' :
                            status === AttendanceStatus.LATE ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/30' :
                            status === AttendanceStatus.ABSENT ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30' :
                            status === AttendanceStatus.EXCUSED ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30' :
                            'bg-slate-50 dark:bg-slate-900/50 text-slate-200 dark:text-slate-700'
                          }`}
                        >
                           {status === AttendanceStatus.PRESENT ? 'P' :
                            status === AttendanceStatus.LATE ? 'T' :
                            status === AttendanceStatus.ABSENT ? 'A' :
                            status === AttendanceStatus.EXCUSED ? 'E' : '·'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center border-l border-slate-50 dark:border-slate-700/30">
                    <div className="flex flex-col gap-0.5">
                      {stats.absences > 0 && <span className="text-[10px] font-bold text-red-500">A: {stats.absences}</span>}
                      {stats.lates > 0 && <span className="text-[10px] font-bold text-yellow-500">T: {stats.lates}</span>}
                      {stats.absences === 0 && stats.lates === 0 && <span className="text-[10px] font-bold text-green-500">100%</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
