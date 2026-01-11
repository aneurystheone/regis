
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Student, Class, AttendanceRecord, DailyNote } from '../types';
import { AttendanceStatus } from '../types';
import { ClipboardCheckIcon, XIcon, TrashIcon, UserCheckIcon, PencilSquareIcon, ClockIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, BoltIcon } from './icons';
import { ClassSelector } from './ClassSelector';
import { FastAttendance } from './FastAttendance';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
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
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ students, classes, attendance, dailyNotes, onSetAttendance, onSetDailyNotes, selectedClassId, onSelectClass, onAddStudentClick }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isFastModeOpen, setIsFastModeOpen] = useState(false);
  const activeDayRef = useRef<HTMLButtonElement>(null);
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

  const currentMonthIndex = useMemo(() => {
    if (!schoolMonths || schoolMonths.length === 0) return -1;
    const selectedMonthKey = selectedDate.substring(0, 7);
    return schoolMonths.findIndex(m => m.key === selectedMonthKey);
  }, [selectedDate, schoolMonths]);

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

  const formattedMonthYear = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  // Validate selected date when class changes
  useEffect(() => {
    if (!selectedClassId || schoolMonths.length === 0) return;

    const currentDate = new Date(selectedDate + 'T12:00:00');
    // Check if the current date is outside the valid school year range
    if (currentDate < schoolYearStart || currentDate > schoolYearEnd) {
      const now = new Date();
      // Check if today is within the new class's school year
      if (now >= schoolYearStart && now <= schoolYearEnd) {
        setSelectedDate(now.toISOString().split('T')[0]);
      } else {
        // Default to the first month of the school year (August)
        setSelectedDate(schoolMonths[0].date.toISOString().split('T')[0]);
      }
    }
  }, [selectedClassId, schoolYearStart, schoolYearEnd, schoolMonths]);

  useEffect(() => {
    if (activeMonthRef.current) {
      activeMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDate, schoolMonths]); // Scroll when date or class changes

  const isTodayInSchoolYear = useMemo(() => {
    if (!schoolYearStart || !schoolYearEnd) return false;
    const now = new Date();
    // Set hours to 0 to compare dates only
    now.setHours(0, 0, 0, 0);
    return now >= schoolYearStart && now <= schoolYearEnd;
  }, [schoolYearStart, schoolYearEnd]);

  const handleGoToToday = () => {
    if (isTodayInSchoolYear) {
      setSelectedDate(getTodayDateString());
    }
  };

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => s.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  const currentNote = useMemo(() => {
    return dailyNotes.find(n => n.classId === selectedClassId && n.date === selectedDate);
  }, [dailyNotes, selectedClassId, selectedDate]);

  const attendanceSummary = useMemo(() => {
    const summary = { total: 0, female: 0, male: 0 };

    const classStudentIds = new Set(filteredStudents.map(s => s.id));

    // Get attendance records for the day, for the current class, and only for 'Present' or 'Late' statuses.
    const presentOrLateRecords = attendance.filter(record =>
      record.date === selectedDate &&
      classStudentIds.has(record.studentId) &&
      (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE)
    );

    // Get the unique student IDs from these records
    const presentOrLateStudentIds = new Set(presentOrLateRecords.map(record => record.studentId));

    // The total is the number of unique students who are present or late.
    summary.total = presentOrLateStudentIds.size;

    // Find the full student objects for those who are present or late to get their gender.
    const presentOrLateStudents = filteredStudents.filter(s => presentOrLateStudentIds.has(s.id));

    summary.female = presentOrLateStudents.filter(s => s.gender === 'F').length;
    summary.male = presentOrLateStudents.filter(s => s.gender === 'M').length;

    return summary;
  }, [attendance, selectedDate, filteredStudents]);

  useEffect(() => {
    if (activeDayRef.current) {
      activeDayRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedDate]);

  const daysInSelectedMonth = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    const year = date.getFullYear();
    const month = date.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: numDays }, (_, i) => i + 1);
  }, [selectedDate]);

  const todayString = getTodayDateString();
  const selectedMonthDate = new Date(`${selectedDate}T12:00:00`);

  const getAttendanceStatus = (studentId: string): AttendanceStatus | undefined => {
    return attendance.find(a => a.studentId === studentId && a.date === selectedDate)?.status;
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    onSetAttendance(prevAttendance => {
      const updatedAttendance = [...prevAttendance];
      const existingRecordIndex = updatedAttendance.findIndex(a => a.studentId === studentId && a.date === selectedDate);
      if (existingRecordIndex === -1) {
        updatedAttendance.push({ studentId, date: selectedDate, status });
        return updatedAttendance;
      }
      if (updatedAttendance[existingRecordIndex].status === status) {
        updatedAttendance.splice(existingRecordIndex, 1);
        return updatedAttendance;
      }
      updatedAttendance[existingRecordIndex] = { ...updatedAttendance[existingRecordIndex], status };
      return updatedAttendance;
    });
  };

  const bulkUpdateStatus = (status: AttendanceStatus) => {
    if (filteredStudents.length === 0) return;
    onSetAttendance(prev => {
      const updatedAttendance = [...prev];
      filteredStudents.forEach(student => {
        const existingRecordIndex = updatedAttendance.findIndex(a => a.studentId === student.id && a.date === selectedDate);
        if (existingRecordIndex > -1) {
          if (updatedAttendance[existingRecordIndex].status !== status) {
            updatedAttendance[existingRecordIndex] = { ...updatedAttendance[existingRecordIndex], status };
          }
        } else {
          updatedAttendance.push({ studentId: student.id, date: selectedDate, status });
        }
      });
      return updatedAttendance;
    });
    setIsFabOpen(false);
  };

  const clearAllStatuses = () => {
    if (filteredStudents.length === 0) return;
    onSetAttendance(prev => {
      const studentIdsToClear = new Set(filteredStudents.map(s => s.id));
      return prev.filter(record => !(record.date === selectedDate && studentIdsToClear.has(record.studentId)));
    });
    setIsFabOpen(false);
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

      if (existingNoteIndex > -1) {
        updatedNotes[existingNoteIndex] = { ...updatedNotes[existingNoteIndex], note };
      } else {
        if (selectedClassId) {
          updatedNotes.push({ id: `DN${Date.now()}`, classId: selectedClassId, date: selectedDate, note });
        }
      }
      return updatedNotes;
    });
    setIsNoteModalOpen(false);
  };

  const formattedDate = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDate]);

  const isWeekend = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, [selectedDate]);

  const unmarkedStudents = useMemo(() => {
    if (isWeekend) return [];
    const markedStudentIds = new Set(
      attendance
        .filter(a => a.date === selectedDate)
        .map(a => a.studentId)
    );
    return filteredStudents.filter(s => !markedStudentIds.has(s.id));
  }, [attendance, selectedDate, filteredStudents, isWeekend]);

  const handleSaveFastAttendance = (newRecords: AttendanceRecord[]) => {
    onSetAttendance(prev => [...prev, ...newRecords]);
    setIsFastModeOpen(false);
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
        <div className="hidden md:flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Año Escolar {selectedClass?.schoolYear}
          </h3>
          <ClassSelector
            classes={classes}
            selectedClassId={selectedClassId}
            onSelectClass={onSelectClass}
            className="w-full max-w-sm"
          />
        </div>

        {/* --- MOBILE VIEW --- */}
        <div className="md:hidden space-y-4">
          <div className="flex justify-between items-center px-2">
            <button onClick={() => handleMonthChange('prev')} disabled={currentMonthIndex <= 0} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
              <ChevronLeftIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
              {formattedMonthYear}
            </h2>
            <button onClick={() => handleMonthChange('next')} disabled={currentMonthIndex >= schoolMonths.length - 1} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
              <ChevronRightIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Días de Clase</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleGoToToday} disabled={!isTodayInSchoolYear} className="font-semibold py-1 px-3 text-sm rounded-lg transition-colors shadow-sm bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">Hoy</button>
                <button onClick={() => setIsNoteModalOpen(true)} title="Añadir nota del día" className="p-2 rounded-lg transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"><PencilSquareIcon className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex items-center space-x-2 pb-2 -mx-4 px-4 overflow-x-auto no-scrollbar">
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
                  <button key={day} ref={isSelected ? activeDayRef : null} onClick={() => setSelectedDate(dayDateString)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-lg transition-colors w-16 h-20 ${isSelected ? 'bg-indigo-600 text-white shadow-md'
                        : isToday ? 'bg-white dark:bg-slate-800 ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-300'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-700'}`}>
                    <span className="text-xs uppercase font-semibold opacity-80">{capitalizedWeekday}</span>
                    <span className="text-2xl font-bold">{day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden md:block space-y-6">
          <div className="flex items-center space-x-2 pb-2 -mx-4 sm:-mx-8 px-4 sm:px-8 overflow-x-auto no-scrollbar">
            {schoolMonths.map(month => {
              const isSelected = selectedDate.startsWith(month.key);
              return (
                <button
                  key={month.key}
                  ref={isSelected ? activeMonthRef : null}
                  onClick={() => {
                    const newDate = new Date(month.date);
                    const currentDay = new Date(selectedDate + 'T12:00:00').getDate();
                    const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
                    newDate.setDate(Math.min(currentDay, daysInNewMonth));
                    setSelectedDate(newDate.toISOString().split('T')[0]);
                  }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-lg transition-colors w-28 h-24 ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border dark:border-slate-700'
                    }`}>
                  <span className="font-bold capitalize text-lg">{month.name}</span>
                  <span className={`text-sm ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{month.year}</span>
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Día</label>
                <button onClick={() => setIsNoteModalOpen(true)} title="Añadir nota del día" className="p-2 rounded-lg transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"><PencilSquareIcon className="w-5 h-5" /></button>
              </div>
              <div className="flex-grow text-center">
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-200 capitalize">{formattedDate}</span>
              </div>
              <button onClick={handleGoToToday} disabled={!isTodayInSchoolYear} className="font-semibold py-1 px-3 text-sm rounded-lg transition-colors shadow-sm bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-200 dark:disabled:hover:bg-slate-700">Hoy</button>
            </div>
            <div className="flex items-center space-x-2 pb-2 -mx-4 sm:-mx-8 px-4 sm:px-8 overflow-x-auto no-scrollbar">
              {daysInSelectedMonth.map(day => {
                const dayDate = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), day, 12);
                const dayOfWeek = dayDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) return null;
                const weekday = dayDate.toLocaleDateString('es-ES', { weekday: 'long' });
                const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                const dayDateString = dayDate.toISOString().split('T')[0];
                const isSelected = dayDateString === selectedDate;
                const isToday = dayDateString === todayString;
                return (
                  <button key={day} ref={isSelected ? activeDayRef : null} onClick={() => setSelectedDate(dayDateString)} title={capitalizedWeekday}
                    className={`flex-shrink-0 flex items-center justify-center font-semibold transition-colors text-sm h-10 ${isSelected ? 'w-10 rounded-full bg-slate-800 text-white shadow-md dark:bg-slate-200 dark:text-slate-800'
                        : isToday ? 'w-10 rounded-full bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ring-1 ring-indigo-500'
                          : 'w-10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full'
                      }`} aria-pressed={isSelected} aria-label={`Seleccionar día ${day}`}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {currentNote && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 rounded-r-lg">
            <p className="font-bold text-sm">Nota del día:</p>
            <p className="text-sm whitespace-pre-wrap">{currentNote.note}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Resumen de Asistencia</h3>
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard label="Total" value={attendanceSummary.total} color="blue" />
            <SummaryCard label="Femenino" value={attendanceSummary.female} color="pink" />
            <SummaryCard label="Masculino" value={attendanceSummary.male} color="sky" />
          </div>
        </div>

        {isWeekend ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 text-center">
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Día no Laborable</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">No se puede pasar lista en fines de semana.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Lista de Asistencia</h3>
                <p className="text-slate-500 dark:text-slate-400 capitalize">{formattedDate}</p>
              </div>
              {unmarkedStudents.length > 0 && !isWeekend && (
                <button
                  onClick={() => setIsFastModeOpen(true)}
                  className="flex items-center bg-yellow-400 text-yellow-900 font-semibold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm"
                >
                  <BoltIcon className="w-5 h-5 mr-2" />
                  Modo Rápido ({unmarkedStudents.length})
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredStudents.map((student) => {
                const status = getAttendanceStatus(student.id);
                return (
                  <div key={student.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full object-cover" src={student.avatar} alt={student.name} />
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{student.name}</p>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)} title={AttendanceStatus.PRESENT} className={getStatusButtonClasses(status, AttendanceStatus.PRESENT)} aria-label={`Marcar a ${student.name} como presente`}>P</button>
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.LATE)} title={AttendanceStatus.LATE} className={getStatusButtonClasses(status, AttendanceStatus.LATE)} aria-label={`Marcar a ${student.name} como tarde`}>T</button>
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)} title={AttendanceStatus.ABSENT} className={getStatusButtonClasses(status, AttendanceStatus.ABSENT)} aria-label={`Marcar a ${student.name} como ausente`}>A</button>
                      <button onClick={() => handleStatusChange(student.id, AttendanceStatus.EXCUSED)} title={AttendanceStatus.EXCUSED} className={getStatusButtonClasses(status, AttendanceStatus.EXCUSED)} aria-label={`Marcar a ${student.name} como con excusa`}>E</button>
                    </div>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                  <p>No hay estudiantes en esta clase.</p>
                  {selectedClassId && (
                    <button
                      onClick={() => onAddStudentClick(selectedClassId)}
                      className="mt-3 inline-flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Añadir Estudiante
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!isWeekend && (
          <>
            {isFabOpen && <div className="fixed inset-0 bg-black bg-opacity-40 z-20" onClick={() => setIsFabOpen(false)}></div>}
            <div className="fixed bottom-8 right-8 z-30 flex flex-col items-end pointer-events-none mb-16 md:mb-0">
              <div className={`flex flex-col items-end space-y-3 mb-3 transition-all duration-300 ease-in-out ${isFabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Limpiar Marcas</span>
                  <button onClick={clearAllStatuses} className="bg-slate-500 text-white p-3 rounded-full hover:bg-slate-600 shadow-lg"><TrashIcon /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Todos con Excusa</span>
                  <button onClick={() => bulkUpdateStatus(AttendanceStatus.EXCUSED)} className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 shadow-lg"><UserCheckIcon /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Todos Ausentes</span>
                  <button onClick={() => bulkUpdateStatus(AttendanceStatus.ABSENT)} className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 shadow-lg"><XIcon /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Todos Tarde</span>
                  <button onClick={() => bulkUpdateStatus(AttendanceStatus.LATE)} className="bg-yellow-500 text-white p-3 rounded-full hover:bg-yellow-600 shadow-lg"><ClockIcon /></button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold px-3 py-1 rounded-lg shadow-md">Todos Presentes</span>
                  <button onClick={() => bulkUpdateStatus(AttendanceStatus.PRESENT)} className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 shadow-lg"><ClipboardCheckIcon /></button>
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

        {isFastModeOpen && unmarkedStudents.length > 0 && (
          <FastAttendance
            students={unmarkedStudents}
            onClose={() => setIsFastModeOpen(false)}
            onSave={handleSaveFastAttendance}
            date={selectedDate}
          />
        )}
      </div>
    </div>
  );
};
