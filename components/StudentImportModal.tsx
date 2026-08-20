import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  FileText,
  Trash2,
  Save,
  Loader2,
  Sparkles,
  X,
  Download,
  Upload,
  Camera,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
// read-excel-file is dynamically imported inside the handler to keep initial bundle lean
import type { Student, Class, AIFeatures } from '../types';
import { extractStudentsFromDoc } from '../services/geminiService';
import { useCanUseAI, useSubscription } from '../contexts/SubscriptionContext';
import { api } from '../services/api';
import { SUBSCRIPTION_LIMITS } from '../config/limits';
import { useUsageSession } from '../services/usageService';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Omit<Student, 'id' | 'classId' | 'avatar'>[], classId: string) => void;
  classes: Class[];
  aiFeatures: AIFeatures;
  selectedClassId?: string | null;
}

type ParsedStudent = Omit<Student, 'id' | 'classId' | 'avatar'>;
type ParseResult = {
  valid: ParsedStudent[];
  invalid: { row: number; data: Record<string, string>; error: string }[];
};

const REQUIRED_HEADERS = ['name'];
const OPTIONAL_HEADERS = ['gender', 'email', 'phone', 'birthdate'];
const FREE_MONTHLY_LIMIT = SUBSCRIPTION_LIMITS.FREE.STUDENT_EXTRACTIONS_PER_MONTH; // 10

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ isOpen, onClose, onImport, classes, aiFeatures, selectedClassId }) => {
  // Premium subscription gating
  const canUseExtraction = useCanUseAI('studentExtraction');
  const { isPremium, getRemainingExtractions } = useSubscription();
  const { logSession } = useUsageSession();

  const [activeClassId, setActiveClassId] = useState<string>(selectedClassId || classes[0]?.id || '');
  const [step, setStep] = useState(0); // 0: Select, 1: Analyzing, 2: Review
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedStudents, setExtractedStudents] = useState<ParsedStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveClassId(selectedClassId || classes[0]?.id || '');
      setStep(0);
      setExtractedStudents([]);
      setError(null);
      setIsProcessing(false);
      setIsImporting(false);
      setShowMoreOptions(false);
    }
  }, [isOpen, classes, selectedClassId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let uploadedFile: File | undefined;
    let inputElement: HTMLInputElement | null = null;

    if ('files' in e.target && e.target.files) {
      uploadedFile = e.target.files[0];
      inputElement = e.target as HTMLInputElement;
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      uploadedFile = e.dataTransfer.files[0];
    }

    if (!uploadedFile) return;

    setError(null);
    setStep(1);
    setIsProcessing(true);

    try {
      const fileName = uploadedFile.name.toLowerCase();
      const isImage = uploadedFile.type.startsWith('image/');

      if (fileName.endsWith('.csv')) {
        // Handle CSV
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const students = parseCsvContent(text);
          setExtractedStudents(students);
          setIsProcessing(false);
          setStep(2);
          if (inputElement) inputElement.value = '';
        };
        reader.readAsText(uploadedFile);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
        // Dynamically import read-excel-file (~22 KB) only when actually needed
        try {
          const readXlsxFile = (await import('read-excel-file/browser')).default;
          const rows = await readXlsxFile(uploadedFile);

          // Cast to any[][] — read-excel-file returns Row[] (Cell[]) but typings may conflict
          const rawRows = rows as unknown as any[][];

          // rows[0] is the header row — skip it
          const students: ParsedStudent[] = rawRows
            .slice(1)
            .filter(row => Array.isArray(row) && row.length > 0 && (row[0] != null || row[1] != null))
            .map(row => {
              const orderNum = typeof row[0] === 'number' ? (row[0] as number) : undefined;
              const rawName = String(row[1] ?? row[0] ?? '').trim();
              if (!rawName) return null;
              const parts = rawName.split(' ');
              return {
                name: rawName,
                firstName: parts[0],
                lastName: parts.slice(1).join(' ') || '',
                orderNumber: orderNum,
                gender: 'M'
              } as ParsedStudent;
            })
            .filter((s): s is ParsedStudent => s !== null);

          setExtractedStudents(students);
          setIsProcessing(false);
          setStep(2);
          if (inputElement) inputElement.value = '';
        } catch (err: any) {
          setError(err.message || 'Error al leer el archivo Excel.');
          setIsProcessing(false);
          setStep(0);
          if (inputElement) inputElement.value = '';
        }
      } else {
        // Handle PDF/Image with AI

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;
            const mimeType = uploadedFile!.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
            
            let processed: ParsedStudent[] = [];
            
            if (isImage) {
               const { extractStudentsFromImage } = await import('../services/geminiService');
               const result = await extractStudentsFromImage(base64, mimeType);
               processed = result.map((s: any) => ({
                 name: `${s.firstName} ${s.lastName}`.trim(),
                 firstName: s.firstName,
                 lastName: s.lastName,
                 gender: 'M'
               } as ParsedStudent));
            } else {
               const { extractStudentsFromDoc } = await import('../services/geminiService');
               const result = await extractStudentsFromDoc(base64, mimeType);
               processed = result.students.map((s: any) => ({
                 name: `${s.firstName} ${s.lastName}`.trim(),
                 firstName: s.firstName,
                 lastName: s.lastName,
                 orderNumber: s.id ? parseInt(s.id, 10) : undefined,
                 gender: 'M'
               } as ParsedStudent));
            }

            if (processed.length === 0) {
              throw new Error("No se encontraron estudiantes válidos en el archivo.");
            }

            setExtractedStudents(processed);
            
            try {
              await api.trackStudentExtraction();
            } catch (e) {
              console.warn("Could not track metric", e);
            }

            setIsProcessing(false);
            setStep(2);
            if (inputElement) inputElement.value = '';
          } catch (err: any) {
            console.error("AI processing error:", err);
            setError(err.message || "Error al procesar con IA. Asegúrese de que el documento sea legible.");
            setIsProcessing(false);
            setStep(0);
            if (inputElement) inputElement.value = '';
          }
        };
        reader.readAsDataURL(uploadedFile);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar el archivo.");
      setIsProcessing(false);
      setStep(0);
      if (inputElement) inputElement.value = '';
    }
  };

  const parseCsvContent = (text: string): ParsedStudent[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    let headerLine = lines[0];
    if (headerLine.charCodeAt(0) === 0xFEFF) headerLine = headerLine.substring(1);
    const header = headerLine.split(',').map(h => h.trim().toLowerCase());

    const result: ParsedStudent[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const rowData: Record<string, string> = {};
      header.forEach((h, index) => { rowData[h] = values[index]?.trim() || ''; });

      if (rowData.name) {
        const parts = rowData.name.trim().split(' ');
        result.push({
          name: rowData.name,
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || '',
          gender: (rowData.gender?.toUpperCase() as 'M' | 'F') || 'M',
          enrollmentId: rowData.enrollmentId || rowData.id_estudiante || undefined,
          email: rowData.email || undefined,
          phone: rowData.phone || undefined,
          birthDate: rowData.birthdate || undefined,
          orderNumber: rowData.orderNumber ? parseInt(rowData.orderNumber, 10) : undefined
        });
      }
    }
    return result;
  };

  const updateStudent = (index: number, field: keyof ParsedStudent, value: any) => {
    const updated = [...extractedStudents];
    updated[index] = { ...updated[index], [field]: value };
    // If name is updated, update firstName/lastName if possible (simple heuristic)
    if (field === 'name') {
      const parts = String(value).trim().split(' ');
      updated[index].firstName = parts[0];
      updated[index].lastName = parts.slice(1).join(' ') || '';
    }
    setExtractedStudents(updated);
  };

  const removeStudent = (index: number) => {
    setExtractedStudents(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // BOM for Excel
      + "name,gender,email,phone,birthDate\n"
      + "Juan Perez,M,juan.p@example.com,809-111-2222,2014-05-15\n"
      + "Maria Rodriguez,F,maria.r@example.com,829-333-4444,2015-02-20\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_estudiantes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = async () => {
    if (extractedStudents.length > 0 && activeClassId && !isImporting) {
      setIsImporting(true);
      try {
        await onImport(extractedStudents, activeClassId);
        logSession('students');
      } catch (err) {
        console.error("Error importing students:", err);
        setError("Error al importar los estudiantes.");
        setIsImporting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
            role="dialog"
            aria-modal="true"
          >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Importar Estudiantes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
                {classes.find(c => c.id === activeClassId)?.name || 'Selecciona una clase'} • {classes.find(c => c.id === activeClassId)?.grade || '-'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >

                  <div className="text-center space-y-2">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Captura la lista</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Toma una foto de tu lista física o súbela desde tu galería.</p>
                  </div>

                  {/* Camera and Gallery Options */}
                  <div className="flex gap-4">
                    <label className="flex-1 border-2 border-dashed border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl p-6 text-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all group">
                      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
                      <Camera className="w-10 h-10 mx-auto mb-2 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                      <p className="font-semibold text-indigo-700 dark:text-indigo-300">Cámara</p>
                    </label>
                    <label className="flex-1 border-2 border-dashed border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl p-6 text-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all group">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                      <p className="font-semibold text-indigo-700 dark:text-indigo-300">Galería</p>
                    </label>
                  </div>

                  <div className="flex justify-center mt-2">
                    <button 
                      onClick={() => setShowMoreOptions(!showMoreOptions)} 
                      className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      {showMoreOptions ? 'Ocultar opciones' : 'Más opciones (Excel, CSV, PDF)'}
                    </button>
                  </div>

                  {error && step === 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-start gap-3 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400 mt-4">
                      <AlertCircle className="w-5 h-5 mt-0.5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <AnimatePresence>
                    {showMoreOptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="grid grid-cols-3 gap-4 pt-4">
                          {[
                            { label: 'Excel', icon: '📊', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
                            { label: 'CSV', icon: '📎', color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
                            { label: 'PDF', icon: '📄', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' }
                          ].map(type => (
                            <div key={type.label} className={`p-3 rounded-2xl ${type.color} text-center space-y-1 border border-transparent shadow-sm`}>
                              <span className="text-xl">{type.icon}</span>
                              <p className="text-[10px] font-bold uppercase tracking-widest">{type.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Drag and Drop Area */}
                        <label
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
                          className="block"
                        >
                          <div className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer group ${isDragging
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}>
                            <input type="file" className="hidden" accept=".xlsx,.xls,.xlsm,.pdf,.csv" onChange={handleFileUpload} />
                            <Upload className={`w-8 h-8 mx-auto mb-2 transition-transform group-hover:scale-110 ${isDragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
                              }`} />
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                              {isDragging ? '¡Suéltalo aquí!' : 'Haga clic o arrastre un documento'}
                            </p>
                          </div>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* AI Status / Limits */}
                  {!isPremium && canUseExtraction && (
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Créditos de Extracción IA</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{getRemainingExtractions()}</span>
                        <span className="text-xs text-slate-400 ml-1">/{SUBSCRIPTION_LIMITS.FREE.STUDENT_EXTRACTIONS_PER_MONTH} libres</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button onClick={handleDownloadTemplate} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium">
                      <Download className="w-4 h-4" /> Descargar plantilla CSV
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 space-y-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-200 dark:bg-indigo-900/50 blur-3xl rounded-full opacity-50 animate-pulse"></div>
                    <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-500 animate-spin relative z-10" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 dark:text-indigo-300 w-6 h-6 z-20" />
                  </div>
                  <div className="text-center space-y-2 relative z-10">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">Vicente está analizando</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">
                      Estamos extrayendo los nombres de tus estudiantes con precisión pedagógica...
                    </p>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">Valida los datos extraídos</h4>
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">{extractedStudents.length} Estudiantes</span>
                  </div>

                  <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                    {extractedStudents.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center group bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                        <input
                          type="text"
                          value={s.orderNumber || ''}
                          placeholder="#"
                          onChange={(e) => updateStudent(i, 'orderNumber', e.target.value)}
                          className="w-10 bg-white dark:bg-slate-800 border-none rounded-lg py-2 px-1 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shadow-sm"
                        />
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => updateStudent(i, 'name', e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-800 border-none rounded-lg py-2 px-4 text-sm font-medium text-slate-800 dark:text-slate-200 shadow-sm"
                        />
                        <button
                          onClick={() => removeStudent(i)}
                          className="p-2 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
                          aria-label="Eliminar de la lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setExtractedStudents([...extractedStudents, { name: '', firstName: '', lastName: '', gender: 'M' } as ParsedStudent])}
                    className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Añadir Estudiante Manualmente
                  </button>

                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-start gap-3 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400">
                      <AlertCircle className="w-5 h-5 mt-0.5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 flex gap-4">
            <button
              onClick={step === 2 ? () => setStep(0) : onClose}
              className="px-6 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex-[1]"
            >
              {step === 2 ? 'Volver' : 'Cancelar'}
            </button>
            <button
              disabled={step !== 2 || extractedStudents.length === 0 || isImporting}
              onClick={handleImportClick}
              className="px-6 py-3 rounded-2xl font-bold bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 transition-all flex-[2] flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar {extractedStudents.length > 0 ? `${extractedStudents.length} Estudiantes` : 'Lista'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
