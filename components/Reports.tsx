
import React, { useState, useMemo, useEffect } from 'react';
import type { Student, Class, AttendanceRecord, AnecdotalRecord, EvaluationInstrument, Grade, FundamentalCompetency, Competency, RecoveryGrade, CompetencyGroup, EvaluationPeriod, AIFeatures, TeacherProfileData } from '../types';
import { AttendanceStatus } from '../types';
import { DownloadIcon, SparklesIcon, AcademicCapIcon, StarIcon, DocumentTextIcon, SendIcon, PlusIcon, DocumentAddIcon, SearchIcon } from './icons';
import { generateStudentSummary } from '../services/geminiService';
import { api } from '../services/api';
import { ClassSelector } from './ClassSelector';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUsageSession } from '../services/usageService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { sortStudents, filterStudentsByClass, calculateAge } from '../utils';
import { GuidanceReferralModal, GuidanceReferralData } from './GuidanceReferralModal';

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

import QRCode from 'qrcode';

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
  onAddStudentClick: (classId: string) => void;
  onImportStudentsClick: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  aiFeatures: AIFeatures;
  onReportGenerated?: () => void;
}

export const Reports: React.FC<ReportsProps> = ({ students, classes, attendance, anecdotes, instruments, grades, recoveryGrades, teacherName, fundamentalCompetencies, competencies, selectedClassId, onSelectClass, aiFeatures, addToast, onAddStudentClick, onImportStudentsClick, onReportGenerated }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isLoading, setIsLoading] = useState(false);
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);
  const { logSession } = useUsageSession();
  const { isPremium } = useSubscription(); // Use hook
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [configuringReport, setConfiguringReport] = useState<string | null>(null);
  const [selectedPeriodForReport, setSelectedPeriodForReport] = useState<EvaluationPeriod | 'all'>('all');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const p = await api.getTeacherProfile();
      setProfile(p);
    };
    fetchProfile();
  }, []);

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
    return sortStudents(filterStudentsByClass(students, selectedClassId, classes));
  }, [students, classes, selectedClassId]);

  useEffect(() => {
    setSelectedStudentId('all');
  }, [selectedClassId]);

  const handleGeneratePDF = async (reportType: 'studentSummary' | 'classGradebook' | 'classAttendance' | 'classCompetencies' | 'gradeSheet' | 'monthlyAttendance' | 'annualAttendance' | 'classCompetencyAverages' | 'guidanceReferral', extraData?: any) => {
    setIsLoading(true);
    logSession('reports');

    // Helper to draw standard official header
    const drawOfficialHeader = async (doc: any, title: string, subTitle: string = "") => {
      if (!isPremium) {
        await drawBrandedHeader(doc, title, subTitle);
        return;
      }
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

      // Info Box (Adjusted Y position if title wraps)
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.rect(14, 32, pageWidth - 28, 22);

      drawReportMetadata(doc, teacherName, selectedClass, profile);
    };

    const loadImage = (url: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(new Error('Canvas context not available'));
          }
        };
        img.onerror = reject;
      });
    };

    const drawBrandedHeader = async (doc: any, title: string, subTitle: string = "") => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Brand Colors
      const brandPrimary = [31, 58, 95]; // #1F3A5F
      const brandSecondary = [77, 163, 255]; // #4DA3FF

      // 1. Watermark (Subtle Background)
      doc.saveGraphicsState();
      doc.setFontSize(50);
      doc.setTextColor(240, 240, 250); // Very light blue/gray
      doc.setFont("helvetica", "bold");
      doc.setGState(new doc.GState({ opacity: 0.05 }));

      // Repeated Watermark Pattern
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          doc.text("Regis", (pageWidth / 3) * i + 20, (pageHeight / 3) * j + 40, { angle: 45 });
        }
      }
      doc.restoreGraphicsState();

      // 2. Logo (Top Left)
      try {
        const logoData = await loadImage('/logo.avif');
        doc.addImage(logoData, 'PNG', 14, 10, 12, 12);

        doc.setFontSize(20);
        doc.setTextColor(...brandPrimary);
        doc.setFont("helvetica", "bold");
        doc.text("Regis", 28, 19);

        doc.setFontSize(8);
        doc.setTextColor(...brandSecondary);
        doc.text("www.regis-app.com", 28, 23);
        doc.link(28, 20, 30, 4, { url: 'https://www.regis-app.com' });

      } catch (err) {
        console.warn("Logo load failed, using text fallback", err);
        doc.setFontSize(24);
        doc.setTextColor(...brandPrimary);
        doc.setFont("helvetica", "bold");
        doc.text("Regis", 14, 20);

        doc.setFontSize(8);
        doc.setTextColor(...brandSecondary);
        doc.text("www.regis-app.com", 14, 24);
        doc.link(14, 21, 30, 4, { url: 'https://www.regis-app.com' });
        // The current control flow already provides a fallback by drawing text.
        // Adding 'return;' here would prevent the QR code and other header elements from being drawn,
        // which is likely not the desired behavior for a branded header.
        // The existing fallback ensures the header still has branding information.
      }

      // 3. QR Code (Top Right)
      try {
        // Generate QR code for the specific link
        const qrData = await QRCode.toDataURL('https://www.regis-app.com');
        doc.addImage(qrData, 'PNG', pageWidth - 25, 8, 16, 16); // Slightly bigger

        doc.setFontSize(6);
        doc.setTextColor(100);
        doc.text("Descubre más", pageWidth - 17, 26, { align: "center" });
      } catch (err) {
        console.error("Error generating QR", err);
      }

      // 4. Report Title (Center with wrap to avoid logo/QR)
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");

      const maxTitleWidth = pageWidth - 90; // Leave 45 units on each side
      const titleLines = doc.splitTextToSize(title.toUpperCase(), maxTitleWidth);

      if (titleLines.length > 2) {
        doc.setFontSize(12);
      } else if (titleLines.length > 1) {
        doc.setFontSize(14);
      } else {
        doc.setFontSize(16);
      }

      const updatedTitleLines = doc.splitTextToSize(title.toUpperCase(), maxTitleWidth);
      doc.text(updatedTitleLines, pageWidth / 2, 18, { align: "center" });

      if (subTitle) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        const subtitleYOffset = 18 + (updatedTitleLines.length * 5);
        doc.text(subTitle, pageWidth / 2, subtitleYOffset, { align: "center" });
      }

      // 5. Metadata Box (Styled with Brand Colors)
      doc.setDrawColor(...brandPrimary);
      doc.setLineWidth(0.5);
      doc.setFillColor(250, 252, 255); // Very light blue tint
      doc.rect(14, 30, pageWidth - 28, 24, 'FD'); // Fill and Draw - 2 row box

      // Reuse metadata drawing logic
      drawReportMetadata(doc, teacherName, selectedClass, profile);
    };

    const drawReportMetadata = (doc: any, tName: string, cls: any, profile?: any) => {
      // Brand colors for labels on free version
      const labelColor = isPremium ? [0, 0, 0] : [31, 58, 95]; // Black for premium, brand blue for free

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...labelColor);
      doc.setDrawColor(...(isPremium ? [0, 0, 0] : [31, 58, 95]));

      // Row 1: Regional, Distrito, Centro Educativo, Año Escolar
      doc.text("Regional:", 18, 40);
      if (profile?.regional) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text(profile.regional, 35, 40);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...labelColor);
      } else {
        doc.line(35, 40, 55, 40);
      }

      doc.text("Distrito:", 58, 40);
      if (profile?.district) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text(profile.district, 73, 40);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...labelColor);
      } else {
        doc.line(73, 40, 93, 40);
      }

      doc.text("Centro:", 96, 40);
      if (profile?.schoolName) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);

        // Truncate school name if too long
        let sName = profile.schoolName;
        if (sName.length > 25) {
          sName = sName.substring(0, 25) + '...';
        }
        doc.text(sName, 110, 40);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...labelColor);
      } else {
        doc.line(110, 40, 165, 40);
      }

      doc.text("Año:", 168, 40);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.text(cls?.schoolYear || "", 178, 40);

      // Row 2: Maestro/a, Asignatura, Grado y Sección (juntos)
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...labelColor);
      doc.text("Maestro/a:", 18, 49);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.text(tName, 40, 49);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...labelColor);
      doc.text("Asignatura:", 96, 49);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.text(cls?.name || "", 118, 49);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...labelColor);
      doc.text("Grado/Sección:", 155, 49);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.text(`${cls?.grade || ""} - ${cls?.section || ""}`, 183, 49);
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

    const generateDetailedGradeSheetPDF = async (doc: any, classInfo: Class) => {
      const { groups: competencyGroups, groupNames, isPrimario, mfa } = getGroupConfig(classInfo.level || 'Nivel Primario');

      await drawOfficialHeader(doc, "REGISTRO DE CALIFICACIONES");

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

      // Brand colors for free version
      const brandPrimary: [number, number, number] = [31, 58, 95];
      const brandLight: [number, number, number] = [240, 248, 255];

      autoTable(doc, {
        head: [head[0], subHead] as any,
        body: tableData,
        startY: 60,
        styles: {
          fontSize: 5,
          cellPadding: 0.6,
          lineColor: isPremium ? [150, 150, 150] : brandPrimary,
          lineWidth: 0.05,
        },
        headStyles: isPremium ? {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineWidth: 0.05,
          lineColor: [150, 150, 150]
        } : {
          fillColor: brandLight,
          textColor: brandPrimary,
          fontStyle: 'bold'
        },
        alternateRowStyles: isPremium ? {} : {
          fillColor: brandLight
        },
        columnStyles: {
          0: { cellWidth: 35 }
        }
      });
      addFooter(doc);
      doc.save(`Boletin_${classInfo.name}.pdf`);
    };

    const generateAnnualAttendancePDF = async (doc: any, classInfo: Class) => {
      await drawOfficialHeader(doc, `REGISTRO DE ASISTENCIA ANUAL`); // Now async due to QR code

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

      // Brand colors for free version
      const brandPrimary: [number, number, number] = [31, 58, 95];
      const brandLight: [number, number, number] = [240, 248, 255];

      autoTable(doc, {
        head: head as any,
        body: tableData,
        startY: 60,
        styles: {
          fontSize: 7,
          cellPadding: 1,
          valign: 'middle',
          halign: 'center',
          textColor: [0, 0, 0],
          lineColor: isPremium ? [150, 150, 150] : brandPrimary,
          lineWidth: 0.1
        },
        columnStyles: { 0: { halign: 'left', cellWidth: 50 } },
        headStyles: isPremium ? {} : {
          fillColor: brandLight,
          textColor: brandPrimary,
          fontStyle: 'bold'
        },
        alternateRowStyles: isPremium ? {} : {
          fillColor: brandLight
        },
        theme: 'grid'
      });
      addFooter(doc);
      doc.save(`Asistencia_Anual_${classInfo.name}.pdf`);
    };

    const generateGuidanceReferralPDF = async (doc: any, student: Student, referralData: GuidanceReferralData) => {
      await drawOfficialHeader(doc, "REFERIMIENTO A LA UNIDAD DE ORIENTACIÓN Y PSICOLOGÍA");

      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 65;

      // Student Section
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(245, 247, 250);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.text("I. DATOS DEL ESTUDIANTE", 18, yPos + 5.5);
      yPos += 12;

      doc.setFont("helvetica", "normal");
      doc.text(`Nombre: ${student.name}`, 18, yPos);
      doc.text(`Edad: ${calculateAge(student.birthDate) || 'N/A'} años`, 120, yPos);
      yPos += 7;
      doc.text(`Grado/Sección: ${selectedClass?.grade || ""} - ${selectedClass?.section || ""}`, 18, yPos);
      doc.text(`No. Orden: ${student.orderNumber || 'N/A'}`, 120, yPos);
      yPos += 12;

      // Referral Details
      doc.setFont("helvetica", "bold");
      doc.setFillColor(245, 247, 250);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.text("II. MOTIVO DEL REFERIMIENTO", 18, yPos + 5.5);
      yPos += 12;

      doc.setFont("helvetica", "bold");
      doc.text("Categoría:", 18, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(referralData.reason, 45, yPos);
      yPos += 10;

      doc.setFont("helvetica", "bold");
      doc.text("Descripción de la situación:", 18, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      const splitDesc = doc.splitTextToSize(referralData.description, pageWidth - 36);
      doc.text(splitDesc, 18, yPos);
      yPos += (splitDesc.length * 5) + 8;

      doc.setFont("helvetica", "bold");
      doc.text("Acciones tomadas por el docente:", 18, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      const splitActions = doc.splitTextToSize(referralData.actionsTaken || "Ninguna documentada", pageWidth - 36);
      doc.text(splitActions, 18, yPos);
      yPos += (splitActions.length * 5) + 8;

      doc.setFont("helvetica", "bold");
      doc.text("Sugerencias o expectativas:", 18, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      const splitSuggestions = doc.splitTextToSize(referralData.suggestions || "Ninguna documentada", pageWidth - 36);
      doc.text(splitSuggestions, 18, yPos);
      yPos += (splitSuggestions.length * 5) + 25;

      // Signatures
      doc.line(18, yPos, 88, yPos);
      doc.line(pageWidth - 88, yPos, pageWidth - 18, yPos);
      yPos += 5;
      doc.setFontSize(9);
      doc.text("Firma del Docente", 53, yPos, { align: "center" });
      doc.text("Unidad de Orientación", pageWidth - 53, yPos, { align: "center" });

      addFooter(doc);
      doc.save(`Referimiento_${student.name.replace(/\s+/g, '_')}.pdf`);
    };

    const generateStudentSummaryPDF = async (doc: any, student: Student) => {
      await drawOfficialHeader(doc, `INFORME INDIVIDUAL`);
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

      // Brand colors for free version
      const brandPrimary: [number, number, number] = [31, 58, 95];
      const brandLight: [number, number, number] = [240, 248, 255];

      autoTable(doc, {
        startY: yPos,
        head: [['Presente', 'Ausente', 'Tarde', 'Excusa']],
        body: [[present, absent, late, excused]],
        theme: 'grid',
        headStyles: isPremium
          ? { fillColor: [220, 220, 220], textColor: 0 }
          : { fillColor: brandLight, textColor: brandPrimary, fontStyle: 'bold' },
        styles: {
          halign: 'center',
          lineColor: isPremium ? [150, 150, 150] : brandPrimary
        },
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
        headStyles: isPremium
          ? { fillColor: [220, 220, 220], textColor: 0 }
          : { fillColor: brandLight, textColor: brandPrimary, fontStyle: 'bold' },
        styles: {
          lineColor: isPremium ? [150, 150, 150] : brandPrimary
        },
        alternateRowStyles: isPremium ? {} : {
          fillColor: brandLight
        },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 30 } },
        margin: { left: 18, right: 18 }
      });

      addFooter(doc);
      doc.save(`Informe_${student.name}.pdf`);
    };

    // Fallback / Generic generators reused with new header
    const generateClassGradebookPDF = async (doc: any, classInfo: Class, periodFilter: EvaluationPeriod | 'all') => {
      await drawOfficialHeader(doc, "LISTADO DE CALIFICACIONES (INSTRUMENTOS)");
      const instrumentsInClass = instruments
        .filter(i => i.classId === classInfo.id && (periodFilter === 'all' || i.period === periodFilter))
        .sort((a, b) => a.date.localeCompare(b.date));
      const headers = ['Estudiante', ...instrumentsInClass.map(i => i.name.substring(0, 8))];
      const data = availableStudents.map((student, idx) => {
        const row = [`${student.orderNumber || idx + 1}. ${student.name}`];
        instrumentsInClass.forEach(inst => {
          const grade = grades.find(g => g.studentId === student.id && g.instrumentId === inst.id);
          row.push(grade?.score?.toString() || '-');
        });
        return row;
      });
      // Brand colors for free version
      const brandPrimary: [number, number, number] = [31, 58, 95];
      const brandLight: [number, number, number] = [240, 248, 255];

      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 60,
        styles: {
          fontSize: 8,
          cellPadding: 1,
          lineColor: isPremium ? [150, 150, 150] : brandPrimary,
          lineWidth: 0.1
        },
        headStyles: isPremium
          ? { fontSize: 7, fontStyle: 'bold', fillColor: [50, 50, 50] }
          : { fontSize: 7, fontStyle: 'bold', fillColor: brandLight, textColor: brandPrimary },
        alternateRowStyles: isPremium ? {} : {
          fillColor: brandLight
        }
      });
      addFooter(doc);
      doc.save(`Calificaciones_Instrumentos_${classInfo.name}.pdf`);
    };

    const generateMonthlyAttendancePDF = async (doc: any, classInfo: Class) => {
      const [year, month] = selectedMonth.split('-');
      const monthIndex = parseInt(month) - 1;
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const monthName = new Date(parseInt(year), monthIndex).toLocaleString('es-ES', { month: 'long' }).toUpperCase();

      await drawOfficialHeader(doc, `CONTROL DE ASISTENCIA: ${monthName} ${year}`);

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
        headerRow1.push({
          content: week.name,
          colSpan: week.days.length,
          styles: {
            halign: 'center',
            fillColor: isPremium ? [240, 240, 240] : [240, 248, 255], // Light AliceBlue for free
            textColor: isPremium ? [0, 0, 0] : [31, 58, 95], // Dark blue for free
            fontStyle: 'bold'
          }
        });
        week.days.forEach(day => {
          headerRow2.push({ content: dayNames[day.dayOfWeek], styles: { halign: 'center', fontSize: 6 } });
          headerRow3.push({ content: day.date.toString(), styles: { halign: 'center', fontSize: 6 } });
        });
      });

      // Summary Headers
      headerRow1.push({
        content: 'Resumen',
        colSpan: 4,
        styles: {
          halign: 'center',
          valign: 'middle',
          fillColor: isPremium ? [240, 240, 240] : [240, 248, 255], // Light AliceBlue for free
          textColor: isPremium ? [0, 0, 0] : [31, 58, 95], // Dark blue for free
          fontStyle: 'bold'
        }
      });
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
              case AttendanceStatus.PRESENT: val = 'P'; stats.P++; break;
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

      // Brand colors for free version styling
      const brandPrimary: [number, number, number] = [31, 58, 95]; // #1F3A5F
      const brandSecondary: [number, number, number] = [77, 163, 255]; // #4DA3FF
      const brandLight: [number, number, number] = [240, 248, 255]; // AliceBlue

      autoTable(doc, {
        head: [headerRow1, headerRow2, headerRow3] as any,
        body: bodyData,
        startY: 60,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1,
          lineWidth: 0.1,
          lineColor: isPremium ? [150, 150, 150] : brandPrimary,
          textColor: [0, 0, 0]
        },
        headStyles: isPremium ? {} : {
          fillColor: brandPrimary,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: isPremium ? {} : {
          fillColor: brandLight
        }
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
          if (classInfo) await generateClassGradebookPDF(new jsPDF({ orientation: 'landscape' }), classInfo, selectedPeriodForReport);
          break;
        case 'gradeSheet':
          if (classInfo) await generateDetailedGradeSheetPDF(new jsPDF({ orientation: 'landscape' }), classInfo);
          break;
        case 'monthlyAttendance':
          if (classInfo) await generateMonthlyAttendancePDF(new jsPDF({ orientation: 'landscape' }), classInfo);
          break;
        case 'annualAttendance':
          if (classInfo) await generateAnnualAttendancePDF(new jsPDF({ orientation: 'landscape' }), classInfo);
          break;
        case 'guidanceReferral':
          const studentReferral = availableStudents.find(s => s.id === selectedStudentId);
          if (studentReferral) {
            await generateGuidanceReferralPDF(new jsPDF(), studentReferral, extraData);
          }
          break;
        case 'classCompetencies':
          // Reuse logic with new header
          if (classInfo) {
            const d = new jsPDF();
            await drawOfficialHeader(d, "REPORTE DE COMPETENCIAS");
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
      if (onReportGenerated) onReportGenerated();
      addToast('Reporte descargado correctamente.', 'success');
    } catch (error) {
      console.error("Report generation failed:", error);
      addToast('Error al generar el reporte.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Mobile Class Selector */}
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
          <div>
            {availableStudents.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-lg font-medium">No hay estudiantes en esta clase.</p>
                  {selectedClassId && (
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                      <button
                        onClick={() => onAddStudentClick(selectedClassId)}
                        className="flex items-center justify-center bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Añadir Estudiante
                      </button>
                      <button
                        onClick={onImportStudentsClick}
                        className="flex items-center justify-center bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold py-2.5 px-6 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                      >
                        <DocumentAddIcon className="w-5 h-5 mr-2" />
                        Importar Lista
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Documentos Oficiales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleGeneratePDF('gradeSheet')}
                    disabled={isLoading || !selectedClassId}
                    className="flex flex-col items-center justify-center text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100 dark:border-indigo-800"
                  >
                    <StarIcon className="w-10 h-10 text-indigo-600 mb-3" />
                    <p className="font-bold text-indigo-900 dark:text-indigo-200 text-lg">Boletín de Calificaciones</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Registro oficial con P1-P4, RP y Promedios.</p>
                  </button>

                  <button
                    onClick={() => handleGeneratePDF('annualAttendance')}
                    disabled={isLoading || !selectedClassId}
                    className="flex flex-col items-center justify-center text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-red-100 dark:border-red-800"
                  >
                    <DownloadIcon className="w-10 h-10 text-red-600 mb-3" />
                    <p className="font-bold text-red-900 dark:text-red-200 text-lg">Registro Anual de Asistencia</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">Resumen de ausencias y tardanzas por mes.</p>
                  </button>

                  <button
                    onClick={() => {
                      setConfiguringReport('monthlyAttendance');
                      setIsConfigModalOpen(true);
                    }}
                    disabled={isLoading || !selectedClassId}
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
                      onClick={() => {
                        setConfiguringReport('studentSummary');
                        setSelectedStudentId(availableStudents.length > 0 ? availableStudents[0].id : 'all');
                        setIsConfigModalOpen(true);
                      }}
                      disabled={isLoading || !selectedClassId}
                      className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SparklesIcon className="w-8 h-8 text-yellow-500 mb-2" />
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Informe Individual (IA)</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Análisis cualitativo del estudiante.</p>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setConfiguringReport('classGradebook');
                      setSelectedPeriodForReport('all');
                      setIsConfigModalOpen(true);
                    }}
                    disabled={isLoading || !selectedClassId}
                    className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DocumentTextIcon className="w-8 h-8 text-slate-500 mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Listado de Instrumentos</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Notas crudas de cada actividad.</p>
                  </button>

                  <button
                    onClick={() => handleGeneratePDF('classCompetencies')}
                    disabled={isLoading || !selectedClassId}
                    className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AcademicCapIcon className="w-8 h-8 text-green-500 mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Matriz de Competencias</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Detalle curricular de la clase.</p>
                  </button>

                  <button
                    onClick={() => {
                      setConfiguringReport('guidanceReferral');
                      setSelectedStudentId(availableStudents.length > 0 ? availableStudents[0].id : 'all');
                      setIsConfigModalOpen(true);
                    }}
                    disabled={isLoading || !selectedClassId}
                    className="flex flex-col items-center justify-center text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100 dark:border-indigo-800"
                  >
                    <SendIcon className="w-8 h-8 text-indigo-500 mb-2" />
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Referimiento a Orientación</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">Generar formulario oficial.</p>
                  </button>
                </div>
              </>
            )}
            {isLoading && <p className="text-center mt-6 text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">Generando documento oficial, por favor espere...</p>}
          </div>
        </div>
      </div>
      {/* Modals */}
      {selectedStudentId !== 'all' && availableStudents.find(s => s.id === selectedStudentId) && (
        <GuidanceReferralModal
          isOpen={isGuidanceModalOpen}
          onClose={() => setIsGuidanceModalOpen(false)}
          student={availableStudents.find(s => s.id === selectedStudentId)!}
          onConfirm={(data) => {
            setIsGuidanceModalOpen(false);
            handleGeneratePDF('guidanceReferral', data);
          }}
        />
      )}

      {/* Report Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                Configurar Reporte
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 bg-slate-100 dark:bg-slate-700/50 py-1.5 px-3 rounded-lg inline-block">
                Sección: {(() => {
                  const c = classes.find(c => c.id === selectedClassId);
                  return c ? `${c.grade.replace(' Grado', '')} ${c.section} - ${c.name}` : 'No seleccionada';
                })()}
              </p>

              {configuringReport === 'monthlyAttendance' && (
                <div className="mb-6">
                  <label htmlFor="modal-month-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Seleccionar Mes
                  </label>
                  <input
                    id="modal-month-select"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    min={schoolYearMinMonth}
                    max={schoolYearMaxMonth}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white"
                  />
                  <p className="text-sm text-slate-500 mt-2">Seleccione el mes para el reporte de asistencia mensual.</p>
                </div>
              )}

              {(configuringReport === 'studentSummary' || configuringReport === 'guidanceReferral') && (
                <div className="mb-6">
                  <label htmlFor="modal-student-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Seleccionar Estudiante
                  </label>
                  <select
                    id="modal-student-select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white"
                  >
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <p className="text-sm text-slate-500 mt-2">
                    {configuringReport === 'studentSummary' ? 'Seleccione al estudiante para el informe individual generado por IA.' : 'Seleccione al estudiante para realizar el referimiento.'}
                  </p>
                </div>
              )}

              {configuringReport === 'classGradebook' && (
                <div className="mb-6">
                  <label htmlFor="modal-period-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Seleccionar Período
                  </label>
                  <select
                    id="modal-period-select"
                    value={selectedPeriodForReport}
                    onChange={(e) => setSelectedPeriodForReport(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white"
                  >
                    <option value="all">Todos los Períodos</option>
                    <option value="P1">Período 1</option>
                    <option value="P2">Período 2</option>
                    <option value="P3">Período 3</option>
                    <option value="P4">Período 4</option>
                  </select>
                  <p className="text-sm text-slate-500 mt-2">Seleccione de qué período desea generar el listado de calificaciones de instrumentos.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (configuringReport === 'guidanceReferral') {
                      setIsConfigModalOpen(false);
                      setIsGuidanceModalOpen(true);
                    } else {
                      await handleGeneratePDF(configuringReport as any);
                      setIsConfigModalOpen(false);
                    }
                  }}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center min-w-[130px]"
                >
                  {isLoading ? 'Descargando...' : 'Continuar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
