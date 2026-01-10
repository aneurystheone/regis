
import React, { useState, useMemo, useEffect } from 'react';
import type { Student, Class, AttendanceRecord, AnecdotalRecord, EvaluationInstrument, Grade, FundamentalCompetency, Competency, RecoveryGrade, CompetencyGroup, EvaluationPeriod, AIFeatures } from '../types';
import { AttendanceStatus } from '../types';
import { DownloadIcon, SparklesIcon, AcademicCapIcon, StarIcon, DocumentTextIcon } from './icons';
import { generateStudentSummary } from '../services/geminiService';
import { ClassSelector } from './ClassSelector';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const secundarioGroups: CompetencyGroup[] = ['G1', 'G2', 'G3', 'G4'];
const secundarioGroupNames: Record<CompetencyGroup, string> = {
  G1: "Comunicativa",
  G2: "Pensamiento Lógico",
  G3: "Ética y Ciudadana",
  G4: "Científica y Amb."
};

const primarioGroups: CompetencyGroup[] = ['G1', 'G2', 'G3'];
const primarioGroupNames: Record<CompetencyGroup, string> = {
  G1: "Comunicativa",
  G2: "Pensamiento Lógico",
  G3: "Ética y Ciudadana",
  G4: ""
};

const getGroupConfig = (level: string) => {
  const isPrimario = level?.toLowerCase().includes('primari');
  return {
    groups: isPrimario ? primarioGroups : secundarioGroups,
    groupNames: isPrimario ? primarioGroupNames : secundarioGroupNames,
    isPrimario,
    mfa: isPrimario ? 65 : 70
  };
};

interface ReportsProps {
  students: Student[];
  classes: Class[];
  attendance: AttendanceRecord[];
  anecdotes: AnecdotalRecord[];
  instruments: EvaluationInstrument[];
  grades: Grade[];
  recoveryGrades: RecoveryGrade[];
  teacherName: string;
  fundamentalCompetencies: FundamentalCompetency[];
  competencies: Competency[];
  selectedClassId: string | null;
  onSelectClass: (classId: string) => void;
  aiFeatures: AIFeatures;
}

export const Reports: React.FC<ReportsProps> = ({ students, classes, attendance, anecdotes, instruments, grades, recoveryGrades, teacherName, fundamentalCompetencies, competencies, selectedClassId, onSelectClass, aiFeatures }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoading, setIsLoading] = useState(false);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const { schoolYearMinMonth, schoolYearMaxMonth } = useMemo(() => {
    if (!selectedClass?.schoolYear) {
      return { schoolYearMinMonth: undefined, schoolYearMaxMonth: undefined };
    }
    const [startYearStr, endYearStr] = selectedClass.schoolYear.split('-');
    const startYear = parseInt(startYearStr, 10);
    const endYear = parseInt(endYearStr, 10);

    if (isNaN(startYear) || isNaN(endYear)) {
      return { schoolYearMinMonth: undefined, schoolYearMaxMonth: undefined };
    }

    const schoolYearMinMonth = `${startYear}-08`;
    const schoolYearMaxMonth = `${endYear}-06`;

    return { schoolYearMinMonth, schoolYearMaxMonth };
  }, [selectedClass]);

  // Validate selected month when class changes
  useEffect(() => {
    if (schoolYearMinMonth && schoolYearMaxMonth) {
      if (selectedMonth < schoolYearMinMonth || selectedMonth > schoolYearMaxMonth) {
        const now = new Date();
        const currentMonthStr = now.toISOString().slice(0, 7);
        if (currentMonthStr >= schoolYearMinMonth && currentMonthStr <= schoolYearMaxMonth) {
          setSelectedMonth(currentMonthStr);
        } else {
          setSelectedMonth(schoolYearMinMonth);
        }
      }
    }
  }, [selectedClassId, schoolYearMinMonth, schoolYearMaxMonth]);

  const availableStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(s => s.classId === selectedClassId).sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999) || a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  useEffect(() => {
    setSelectedStudentId('all');
  }, [selectedClassId]);

  const handleGeneratePDF = async (reportType: 'studentSummary' | 'classGradebook' | 'classAttendance' | 'classCompetencies' | 'gradeSheet' | 'monthlyAttendance' | 'annualAttendance' | 'classCompetencyAverages') => {
    setIsLoading(true);

    // Helper to draw standard official header
    const drawOfficialHeader = (doc: any, title: string, subTitle: string = "") => {
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title Block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("MINISTERIO DE EDUCACIÓN", pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text(title.toUpperCase(), pageWidth / 2, 22, { align: "center" });

      if (subTitle) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(subTitle, pageWidth / 2, 28, { align: "center" });
      }

      // Info Box
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.rect(14, 32, pageWidth - 28, 22);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      // Row 1
      doc.text("Regional:", 18, 38);
      doc.line(35, 38, 60, 38); // line for Regional

      doc.text("Distrito:", 65, 38);
      doc.line(80, 38, 105, 38); // line for Distrito

      doc.text("Centro Educativo:", 110, 38);
      doc.text("__________________________________________", 140, 38);

      // Row 2
      doc.text("Maestro/a:", 18, 46);
      doc.setFont("helvetica", "normal");
      doc.text(teacherName, 40, 46);

      doc.setFont("helvetica", "bold");
      doc.text("Asignatura:", 110, 46);
      doc.setFont("helvetica", "normal");
      doc.text(selectedClass?.name || "", 130, 46);

      // Row 3
      doc.setFont("helvetica", "bold");
      doc.text("Grado:", 18, 52);
      doc.setFont("helvetica", "normal");
      doc.text(selectedClass?.grade || "", 32, 52);

      doc.setFont("helvetica", "bold");
      doc.text("Sección:", 65, 52);
      doc.setFont("helvetica", "normal");
      doc.text(selectedClass?.section || "", 80, 52);

      doc.setFont("helvetica", "bold");
      doc.text("Año Escolar:", 110, 52);
      doc.setFont("helvetica", "normal");
      doc.text(selectedClass?.schoolYear || "", 132, 52);
    };

    const evaluationPeriods: EvaluationPeriod[] = ['P1', 'P2', 'P3', 'P4'];

    const addFooter = (doc: any) => {
      const pageCount = doc.internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: "right" });
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, pageHeight - 10);
      }
    };

    const generateDetailedGradeSheetPDF = (doc: any, classInfo: Class) => {
      const { groups: competencyGroups, groupNames, isPrimario, mfa } = getGroupConfig(classInfo.level || 'Nivel Primario');

      drawOfficialHeader(doc, "REGISTRO DE CALIFICACIONES");

      // Complex Table Header Structure
      const head: any[][] = [
        [
          { content: 'Datos Estudiante', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        ]
      ];

      const subHead: any[] = [];

      // Build Header Levels: Individual Periods
      competencyGroups.forEach(g => {
        head[0].push({
          content: groupNames[g],
          colSpan: 8, // P1, RP1, P2, RP2, P3, RP3, P4, RP4
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] }
        });

        // Subheaders for periods and recoveries
        evaluationPeriods.forEach(p => {
          subHead.push({ content: p, styles: { halign: 'center', fontSize: 6 } });
          subHead.push({ content: `RP${p.slice(1)}`, styles: { halign: 'center', fontSize: 5, textColor: [100, 100, 100] } });
        });
      });

      // Trailing CP columns
      head[0].push({
        content: 'Promedios (CP)',
        colSpan: competencyGroups.length,
        styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] }
      });
      competencyGroups.forEach(g => {
        subHead.push({ content: `CP${g.slice(1)}`, styles: { halign: 'center', fontSize: 6, fontStyle: 'bold' } });
      });

      head[0].push({ content: 'C.F.', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [200, 200, 200] } }); // Final Grade

      const tableData = availableStudents.map((student, index) => {
        const row: (string | number | { content: string, styles: any })[] = [
          `${student.orderNumber || index + 1}. ${student.name}`
        ];

        const studentCPs: number[] = [];

        competencyGroups.forEach(group => {
          const groupCompetencyIds = competencies.filter(c => {
            const fc = fundamentalCompetencies.find(f => f.id === c.fundamentalId);
            if (isPrimario && fc?.group === 'G4') return group === 'G2'; // Merge G4 into G2 for Primario
            return fc?.group === group && c.classId === classInfo.id;
          }).map(c => c.id);

          const periodScoresByGroup: (number | null)[] = [];

          evaluationPeriods.forEach(period => {
            const periodInstruments = instruments.filter(i => i.classId === classInfo.id && i.period === period && i.competencyIds.some(id => groupCompetencyIds.includes(id)));
            const relevantGrades = grades.filter(g => g.studentId === student.id && periodInstruments.some(i => i.id === g.instrumentId) && g.score !== null);

            const recovery = recoveryGrades.find(r => r.studentId === student.id && r.period === period && r.competencyGroup === group);

            let rawScore: number | null = null;
            if (relevantGrades.length > 0) {
              const total = relevantGrades.reduce((acc, curr) => acc + (curr.score || 0), 0);
              const totalPossible = relevantGrades.reduce((acc, curr) => {
                const inst = instruments.find(i => i.id === curr.instrumentId);
                return acc + (inst?.totalPoints || 0);
              }, 0);
              rawScore = totalPossible > 0 ? Math.round((total / totalPossible) * 100) : null;
            }

            // MFA Logic: if raw < mfa, use recovery if available
            let effectiveScore = rawScore;
            if (recovery && (rawScore === null || rawScore < mfa)) {
              effectiveScore = recovery.score;
            }

            row.push(rawScore !== null ? rawScore.toString() : '-');
            row.push(recovery ? recovery.score.toString() : '-');

            periodScoresByGroup.push(effectiveScore);
          });

          // Calculate CP for this group
          const validScores = periodScoresByGroup.filter(s => s !== null) as number[];
          if (validScores.length === evaluationPeriods.length) {
            const cp = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
            studentCPs.push(cp);
          } else {
            // Partially complete? We could still show average or '-'
            const cp = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
            if (cp !== null) studentCPs.push(cp);
          }
        });

        // Push CP values to row
        studentCPs.forEach(cp => {
          row.push({ content: cp.toString(), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } });
        });
        // Pad if some groups have no scores
        for (let i = studentCPs.length; i < competencyGroups.length; i++) {
          row.push('-');
        }

        // Calculate CF (Calificación Final)
        const finalAvg = studentCPs.length === competencyGroups.length ? Math.round(studentCPs.reduce((a, b) => a + b, 0) / studentCPs.length) : null;
        row.push({
          content: finalAvg !== null ? finalAvg.toString() : '-',
          styles: {
            fontStyle: 'bold',
            fillColor: [230, 230, 230],
            textColor: finalAvg !== null && finalAvg < mfa ? [200, 0, 0] : [0, 0, 0]
          }
        });

        return row;
      });

      autoTable(doc, {
        head: [head[0], subHead],
        body: tableData,
        startY: 60,
        styles: {
          fontSize: 5, // Slightly smaller to be safe
          cellPadding: 0.6,
          lineColor: [150, 150, 150],
          lineWidth: 0.05,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineWidth: 0.05,
          lineColor: [150, 150, 150]
        },
        columnStyles: {
          0: { cellWidth: 35 } // Student Name width
        }
      });
      addFooter(doc);
      doc.save(`Boletin_${classInfo.name}.pdf`);
    };

    const generateAnnualAttendancePDF = (doc: any, classInfo: Class) => {
      drawOfficialHeader(doc, `REGISTRO DE ASISTENCIA ANUAL`);

      const months = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

      const head = [[
        { content: 'Estudiante', rowSpan: 2, styles: { valign: 'middle' } },
        ...months.map(m => ({ content: m, colSpan: 2, styles: { halign: 'center' } })),
        { content: 'Total', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }
      ]];

      const subHead = [];
      months.forEach(() => {
        subHead.push('A'); // Absent
        subHead.push('T'); // Tarde
      });
      subHead.push('A');
      subHead.push('T');
      head.push(subHead);

      const tableData = availableStudents.map((student, index) => {
        const row: (string | number)[] = [`${student.orderNumber || index + 1}. ${student.name}`];
        let totalAbsences = 0;
        let totalLates = 0;

        months.forEach((_, idx) => {
          const monthIndex = (idx + 7) % 12; // 0-11 (Jan-Dec conversion for school year starting August)

          // Filter attendance for this student and month
          const monthStats = attendance.reduce((stats, record) => {
            if (record.studentId === student.id) {
              const d = new Date(record.date + 'T12:00:00');
              if (d.getMonth() === monthIndex) {
                if (record.status === AttendanceStatus.ABSENT) stats.absent++;
                if (record.status === AttendanceStatus.LATE) stats.late++;
              }
            }
            return stats;
          }, { absent: 0, late: 0 });

          row.push(monthStats.absent || '-');
          row.push(monthStats.late || '-');

          totalAbsences += monthStats.absent;
          totalLates += monthStats.late;
        });

        row.push(totalAbsences);
        row.push(totalLates);
        return row;
      });

      autoTable(doc, {
        head: head,
        body: tableData,
        startY: 60,
        styles: { fontSize: 7, cellPadding: 1, valign: 'middle', halign: 'center' },
        columnStyles: { 0: { halign: 'left', cellWidth: 50 } },
        theme: 'grid'
      });
      addFooter(doc);
      doc.save(`Asistencia_Anual_${classInfo.name}.pdf`);
    };

    const generateStudentSummaryPDF = async (doc: any, student: Student) => {
      drawOfficialHeader(doc, `INFORME INDIVIDUAL`);
      doc.setFontSize(12);
      doc.text(`Estudiante: ${student.name}`, 18, 60);

      let yPos = 70;

      // AI Summary
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumen de Progreso (IA)", 18, yPos);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      let summaryText = "";
      if (aiFeatures.summaryGeneration) {
        summaryText = await generateStudentSummary(student, anecdotes.filter(a => a.studentId === student.id));
      } else {
        summaryText = "La función de resumen generado por IA (Vicente) está desactivada en los ajustes. Puede activarla para obtener un análisis automático del progreso del estudiante.";
      }

      const splitSummary = doc.splitTextToSize(summaryText, 175);
      doc.text(splitSummary, 18, yPos + 7);

      yPos += 7 + (splitSummary.length * 5) + 10;

      // Attendance Summary
      doc.setFont("helvetica", "bold");
      doc.text("Resumen de Asistencia", 18, yPos);
      yPos += 7;

      const studentAttendance = attendance.filter(a => a.studentId === student.id);
      const present = studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absent = studentAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const late = studentAttendance.filter(a => a.status === AttendanceStatus.LATE).length;
      const excused = studentAttendance.filter(a => a.status === AttendanceStatus.EXCUSED).length;

      autoTable(doc, {
        startY: yPos,
        head: [['Presente', 'Ausente', 'Tarde', 'Excusa']],
        body: [[present, absent, late, excused]],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: 0 },
        styles: { halign: 'center' },
        margin: { left: 18, right: 18 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Anecdotes
      doc.setFont("helvetica", "bold");
      doc.text("Incidencias / Anécdotas", 18, yPos);
      yPos += 7;

      const studentAnecdotes = anecdotes.filter(a => a.studentId === student.id).slice(0, 10);
      const anecdoteData = studentAnecdotes.map(a => [new Date(a.date).toLocaleDateString(), a.category, a.note]);

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Categoría', 'Observación']],
        body: anecdoteData,
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: 0 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 30 } },
        margin: { left: 18, right: 18 }
      });

      addFooter(doc);
      doc.save(`Informe_${student.name}.pdf`);
    };

    // Fallback / Generic generators reused with new header
    const generateClassGradebookPDF = (doc: any, classInfo: Class) => {
      drawOfficialHeader(doc, "LISTADO DE CALIFICACIONES (INSTRUMENTOS)");
      const instrumentsInClass = instruments.filter(i => i.classId === classInfo.id).sort((a, b) => a.date.localeCompare(b.date));
      const headers = ['Estudiante', ...instrumentsInClass.map(i => i.name.substring(0, 8))];
      const data = availableStudents.map((student, idx) => {
        const row = [`${student.orderNumber || idx + 1}. ${student.name}`];
        instrumentsInClass.forEach(inst => {
          const grade = grades.find(g => g.studentId === student.id && g.instrumentId === inst.id);
          row.push(grade?.score?.toString() || '-');
        });
        return row;
      });
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 60,
        styles: { fontSize: 8, cellPadding: 1 },
        headStyles: { fontSize: 7, fontStyle: 'bold', fillColor: [50, 50, 50] }
      });
      addFooter(doc);
      doc.save(`Calificaciones_Instrumentos_${classInfo.name}.pdf`);
    };

    const generateMonthlyAttendancePDF = (doc: any, classInfo: Class) => {
      const [year, month] = selectedMonth.split('-');
      const monthIndex = parseInt(month) - 1;
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const monthName = new Date(parseInt(year), monthIndex).toLocaleString('es-ES', { month: 'long' }).toUpperCase();

      drawOfficialHeader(doc, `CONTROL DE ASISTENCIA: ${monthName} ${year}`);

      // Calculate weeks logic (same as before but wrapped in new layout)
      // ... (Logic reused from previous code, simplified for brevity in this diff, assume same logic)
      interface DayInfo { date: number; dayOfWeek: number; fullDate: string }
      interface WeekInfo { name: string; days: DayInfo[] }
      const weeks: WeekInfo[] = [];
      let currentWeekDays: DayInfo[] = [];
      const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(parseInt(year), monthIndex, d);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        if (dayOfWeek === 1 && currentWeekDays.length > 0) {
          weeks.push({ name: `${weeks.length + 1}ª Semana`, days: currentWeekDays });
          currentWeekDays = [];
        }
        currentWeekDays.push({
          date: d,
          dayOfWeek: dayOfWeek,
          fullDate: `${selectedMonth}-${d.toString().padStart(2, '0')}`
        });
      }
      if (currentWeekDays.length > 0) weeks.push({ name: `${weeks.length + 1}ª Semana`, days: currentWeekDays });

      const headerRow1: any[] = [{ content: 'Nº / Nombre', rowSpan: 3, styles: { valign: 'middle', halign: 'left', fontStyle: 'bold', fontSize: 8, cellWidth: 50 } }];
      const headerRow2: any[] = [];
      const headerRow3: any[] = [];

      weeks.forEach(week => {
        headerRow1.push({ content: week.name, colSpan: week.days.length, styles: { halign: 'center', fillColor: [240, 240, 240] } });
        week.days.forEach(day => {
          headerRow2.push({ content: dayNames[day.dayOfWeek], styles: { halign: 'center', fontSize: 6 } });
          headerRow3.push({ content: day.date.toString(), styles: { halign: 'center', fontSize: 6 } });
        });
      });

      // Summary Headers
      headerRow1.push({ content: 'Resumen', colSpan: 4, styles: { halign: 'center', valign: 'middle' } });
      ['P', 'T', 'A', 'E'].forEach(h => {
        headerRow2.push({ content: h, styles: { halign: 'center', fontSize: 7 } });
        headerRow3.push({ content: '', styles: {} });
      });

      const allWorkDays = weeks.flatMap(w => w.days);
      const bodyData = availableStudents.map((student, index) => {
        const row: any[] = [`${student.orderNumber || index + 1}. ${student.name}`];
        let stats = { P: 0, T: 0, A: 0, E: 0 };
        allWorkDays.forEach(day => {
          const record = attendance.find(a => a.studentId === student.id && a.date === day.fullDate);
          let val = '';
          if (record) {
            switch (record.status) {
              case AttendanceStatus.PRESENT: val = '•'; stats.P++; break;
              case AttendanceStatus.LATE: val = 'T'; stats.T++; break;
              case AttendanceStatus.ABSENT: val = 'A'; stats.A++; break;
              case AttendanceStatus.EXCUSED: val = 'E'; stats.E++; break;
            }
          }
          row.push(val);
        });
        row.push(stats.P, stats.T, stats.A, stats.E);
        return row;
      });

      autoTable(doc, {
        head: [headerRow1, headerRow2, headerRow3],
        body: bodyData,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [150, 150, 150] }
      });
      addFooter(doc);
      doc.save(`Asistencia_Mensual_${monthName}_${classInfo.name}.pdf`);
    };

    try {
      const classInfo = classes.find(c => c.id === selectedClassId);
      switch (reportType) {
        case 'studentSummary':
          const student = students.find(s => s.id === selectedStudentId);
          if (student) await generateStudentSummaryPDF(new jsPDF(), student);
          break;
        case 'classGradebook':
          if (classInfo) generateClassGradebookPDF(new jsPDF({ orientation: 'landscape' }), classInfo);
          break;
        case 'gradeSheet':
          if (classInfo) generateDetailedGradeSheetPDF(new jsPDF({ orientation: 'landscape' }), classInfo);
          break;
        case 'monthlyAttendance':
          if (classInfo) generateMonthlyAttendancePDF(new jsPDF({ orientation: 'landscape' }), classInfo);
          break;
        case 'annualAttendance':
          if (classInfo) generateAnnualAttendancePDF(new jsPDF({ orientation: 'landscape' }), classInfo);
          break;
        case 'classCompetencies':
          // Reuse logic with new header
          if (classInfo) {
            const d = new jsPDF();
            drawOfficialHeader(d, "REPORTE DE COMPETENCIAS");
            const classCompetencies = competencies.filter(c => c.classId === classInfo.id);
            const data = classCompetencies.map(c => {
              const fundamental = fundamentalCompetencies.find(f => f.id === c.fundamentalId);
              return [c.code, c.name, fundamental?.name || '', c.description];
            });
            autoTable(d, {
              head: [['Código', 'Competencia Específica', 'Competencia Fundamental', 'Descripción']],
              body: data, startY: 60, styles: { fontSize: 8 }
            });
            addFooter(d);
            d.save(`Competencias_${classInfo.name}.pdf`);
          }
          break;
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Ocurrió un error al generar el PDF. Por favor, revise la consola.");
    }
    setIsLoading(false);
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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Generador de Reportes Oficiales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
            <div className="hidden md:block md:col-span-1">
              <ClassSelector
                classes={classes}
                selectedClassId={selectedClassId}
                onSelectClass={onSelectClass}
                label="Clase Seleccionada"
                className="w-full"
                size="default"
              />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="report-student-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Seleccionar Estudiante</label>
              <select
                id="report-student-select" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}
                className="block w-full pl-3 pr-10 py-2.5 text-sm sm:text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm border focus:border-indigo-500 transition-all"
              >
                <option value="all">-- Reportes de Clase Completa --</option>
                {availableStudents.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label htmlFor="report-month-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Seleccionar Mes (Para Asistencia)</label>
              <input
                id="report-month-select" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                min={schoolYearMinMonth}
                max={schoolYearMaxMonth}
                className="block w-full pl-3 pr-4 py-2.5 text-sm sm:text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm border focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Documentos Oficiales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => handleGeneratePDF('gradeSheet')}
                disabled={isLoading || selectedStudentId !== 'all' || !selectedClassId}
                className="flex flex-col items-center justify-center text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100 dark:border-indigo-800"
              >
                <StarIcon className="w-10 h-10 text-indigo-600 mb-3" />
                <p className="font-bold text-indigo-900 dark:text-indigo-200 text-lg">Boletín de Calificaciones</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Registro oficial con P1-P4, RP y Promedios.</p>
              </button>

              <button
                onClick={() => handleGeneratePDF('annualAttendance')}
                disabled={isLoading || selectedStudentId !== 'all' || !selectedClassId}
                className="flex flex-col items-center justify-center text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-red-100 dark:border-red-800"
              >
                <DownloadIcon className="w-10 h-10 text-red-600 mb-3" />
                <p className="font-bold text-red-900 dark:text-red-200 text-lg">Registro Anual de Asistencia</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Resumen de ausencias y tardanzas por mes.</p>
              </button>

              <button
                onClick={() => handleGeneratePDF('monthlyAttendance')}
                disabled={isLoading || selectedStudentId !== 'all' || !selectedClassId || !selectedMonth}
                className="flex flex-col items-center justify-center text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-blue-100 dark:border-blue-800"
              >
                <DocumentTextIcon className="w-10 h-10 text-blue-600 mb-3" />
                <p className="font-bold text-blue-900 dark:text-blue-200 text-lg">Control Mensual</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Hoja de asistencia diaria del mes seleccionado.</p>
              </button>
            </div>

            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 mt-8">Reportes Complementarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiFeatures.summaryGeneration && (
                <button
                  onClick={() => handleGeneratePDF('studentSummary')}
                  disabled={isLoading || selectedStudentId === 'all' || !selectedClassId}
                  className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SparklesIcon className="w-8 h-8 text-yellow-500 mb-2" />
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Informe Individual (IA)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Análisis cualitativo del estudiante.</p>
                </button>
              )}

              <button
                onClick={() => handleGeneratePDF('classGradebook')}
                disabled={isLoading || selectedStudentId !== 'all' || !selectedClassId}
                className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentTextIcon className="w-8 h-8 text-slate-500 mb-2" />
                <p className="font-semibold text-slate-800 dark:text-slate-100">Listado de Instrumentos</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Notas crudas de cada actividad.</p>
              </button>

              <button
                onClick={() => handleGeneratePDF('classCompetencies')}
                disabled={isLoading || selectedStudentId !== 'all' || !selectedClassId}
                className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AcademicCapIcon className="w-8 h-8 text-green-500 mb-2" />
                <p className="font-semibold text-slate-800 dark:text-slate-100">Matriz de Competencias</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Detalle curricular de la clase.</p>
              </button>
            </div>
            {isLoading && <p className="text-center mt-6 text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">Generando documento oficial, por favor espere...</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
