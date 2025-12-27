

import React, { useMemo } from 'react';
import type { Class, Student, AttendanceRecord, Grade, EvaluationInstrument } from '../types';
import { AttendanceStatus } from '../types';
import { XIcon, PencilIcon, ClockIcon, UserGroupIcon, UserCircleIcon, DownloadIcon } from './icons';

interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: Class | null;
  students: Student[];
  teacherName: string;
  onViewStudents: (classId: string) => void;
  onEdit: (cls: Class) => void;
  attendance: AttendanceRecord[];
  grades: Grade[];
  instruments: EvaluationInstrument[];
}

const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className={`flex items-center p-3 rounded-lg bg-opacity-10 ${color}`}>
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-slate-700 bg-opacity-50 flex-shrink-0 shadow-sm">
            {icon}
        </div>
        <div className="ml-3">
            <p className="font-bold text-xl">{value}</p>
            <p className="text-sm font-medium opacity-90">{label}</p>
        </div>
    </div>
);

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ isOpen, onClose, cls, students, teacherName, onViewStudents, onEdit, attendance, grades, instruments }) => {

  const classStudents = useMemo(() => {
    if (!cls) return [];
    return students.filter(s => s.classId === cls.id);
  }, [cls, students]);

  const enrollment = useMemo(() => {
    const total = classStudents.length;
    const female = classStudents.filter(s => s.gender === 'F').length;
    const male = classStudents.filter(s => s.gender === 'M').length;
    return { total, female, male };
  }, [classStudents]);
  
  const handleExportCSV = () => {
    if (!cls) return;

    // Filter relevant data for the specific class
    const classInstruments = instruments
      .filter(i => i.classId === cls.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const sortedClassStudents = students
      .filter(s => s.classId === cls.id)
      .sort((a,b) => a.name.localeCompare(b.name));

    // Helper to handle potential commas in data
    const escapeCsvField = (field: any): string => {
        const str = String(field ?? ''); // handle null/undefined cases
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            // Enclose in double quotes and escape existing double quotes
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Create CSV Header row
    const headers = [
        'ID Estudiante', 'Nombre',
        'Presente', 'Ausente', 'Tarde', 'Excusa',
        ...classInstruments.map(i => i.name)
    ].map(escapeCsvField).join(',');

    // Create a data row for each student
    const rows = sortedClassStudents.map(student => {
        // Calculate attendance summary for the student
        const studentAttendance = attendance.filter(a => a.studentId === student.id);
        const summary = { present: 0, absent: 0, late: 0, excused: 0 };
        studentAttendance.forEach(record => {
            if(record.status === AttendanceStatus.PRESENT) summary.present++;
            if(record.status === AttendanceStatus.ABSENT) summary.absent++;
            if(record.status === AttendanceStatus.LATE) summary.late++;
            if(record.status === AttendanceStatus.EXCUSED) summary.excused++;
        });

        // Get grades for each instrument
        const studentGrades = classInstruments.map(inst => {
            const grade = grades.find(g => g.studentId === student.id && g.instrumentId === inst.id);
            return grade?.score ?? ''; // Use empty string for missing grades
        });

        const rowData = [
            student.id,
            student.name,
            summary.present,
            summary.absent,
            summary.late,
            summary.excused,
            ...studentGrades
        ];

        return rowData.map(escapeCsvField).join(',');
    });

    // Combine headers and rows, and trigger download
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const combinedClassName = `${cls.grade.replace(' Grado', '')}_${cls.section}_${cls.name}`;
    const sanitizedClassName = combinedClassName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `datos_${sanitizedClassName}_${today}.csv`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!isOpen || !cls) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]" role="document">
        
        {/* Modal Header */}
        <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{cls.grade.replace(' Grado', '')} {cls.section} - {cls.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{cls.schoolYear}</p>
                </div>
                <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Cerrar modal">
                    <XIcon className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 text-slate-700 dark:text-slate-300">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                <div className="flex items-center">
                    <ClockIcon className="w-5 h-5 mr-3 text-indigo-500"/>
                    <div>
                        <p className="font-semibold">Horario</p>
                        <p className="text-sm">{cls.schedule}</p>
                    </div>
                </div>
                 <div className="flex items-center">
                    <UserCircleIcon className="w-5 h-5 mr-3 text-indigo-500"/>
                    <div>
                        <p className="font-semibold">Maestro Encargado</p>
                        <p className="text-sm">{teacherName}</p>
                    </div>
                </div>
            </div>
          
            <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center"><UserGroupIcon className="w-4 h-4 mr-2"/> Matrícula</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InfoCard icon={<UserGroupIcon className="w-6 h-6 text-blue-500" />} label="Total" value={enrollment.total} color="bg-blue-500 text-blue-800 dark:text-blue-200" />
                    <InfoCard icon={<span className="text-3xl font-black text-pink-500 dark:text-pink-400">♀</span>} label="Femenino" value={enrollment.female} color="bg-pink-500 text-pink-800 dark:text-pink-200" />
                    <InfoCard icon={<span className="text-3xl font-black text-sky-500 dark:text-sky-400">♂</span>} label="Masculino" value={enrollment.male} color="bg-sky-500 text-sky-800 dark:text-sky-200" />
                </div>
            </div>
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 flex justify-end gap-3 flex-wrap p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
          >
            Cerrar
          </button>
           <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button
            type="button"
            onClick={() => onEdit(cls)}
            className="flex items-center bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onViewStudents(cls.id)}
            className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Ver Estudiantes
          </button>
        </div>
      </div>
    </div>
  );
};