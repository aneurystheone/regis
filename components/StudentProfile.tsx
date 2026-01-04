import React, { useState, useMemo, useEffect } from 'react';
import type { Student, AnecdotalRecord, Class, AttendanceRecord, AIFeatures } from '../types';
import { Avatar } from './Avatar';
// Fixed: Added DocumentTextIcon to the import list from icons
import { PlusIcon, SparklesIcon, CameraIcon, TableCellsIcon, MicrophoneIcon, XIcon, UserCircleIcon, HeartIcon, UserGroupIcon, WifiIcon, PencilIcon, CheckIcon, DocumentTextIcon, StarIcon } from './icons';
import { generateStudentSummary, transcribeAndAnalyzeAnecdote } from '../services/geminiService';
import { AudioRecorder } from './AudioRecorder';
import { AttendanceStatus } from '../types';
import { uploadFile, dataURLToBlob } from '../services/storageService';
import { authService } from '../services/authService';

interface StudentProfileProps {
  student: Student;
  anecdotes: AnecdotalRecord[];
  attendance: AttendanceRecord[];
  classes: Class[];
  onBack: () => void;
  onAddAnecdote: (anecdote: Omit<AnecdotalRecord, 'id'>) => void;
  onViewGrades: (studentId: string) => void;
  onUpdateStudent: (data: Partial<Student>) => void;
  aiFeatures: AIFeatures;
}

type ActiveTab = 'general' | 'health' | 'family' | 'connectivity';

const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-1 sm:px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors focus:outline-none ${isActive
      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/10'
      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const EditableField: React.FC<{
  label: string;
  value?: any;
  isEditing: boolean;
  name: string;
  type?: 'text' | 'tel' | 'email' | 'date' | 'number' | 'checkbox' | 'select' | 'textarea';
  options?: string[];
  onChange?: (name: string, value: any) => void;
  children?: React.ReactNode;
}> = ({ label, value, isEditing, name, type = 'text', options = [], onChange, children }) => {

  if (!isEditing) {
    let displayValue: React.ReactNode;
    if (typeof value === 'boolean') {
      displayValue = value ? 'Sí' : 'No';
    } else if (Array.isArray(value)) {
      displayValue = value.length > 0 ? value.join(', ') : <span className="italic text-slate-400 dark:text-slate-500">No disponible</span>;
    } else if (value === null || value === undefined || value === '') {
      displayValue = <span className="italic text-slate-400 dark:text-slate-500">No disponible</span>;
    } else {
      displayValue = value;
    }

    return (
      <div className="group">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-base text-slate-800 dark:text-slate-200 min-h-[1.5rem]">{children || displayValue}</div>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all";

  return (
    <div>
      <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={e => onChange?.(name, e.target.value)}
          className={inputClass}
          rows={3}
        />
      ) : type === 'select' ? (
        <select
          value={value || ''}
          onChange={e => onChange?.(name, e.target.value)}
          className={inputClass}
        >
          <option value="">Seleccionar...</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : type === 'checkbox' ? (
        <div className="flex items-center h-10">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange?.(name, e.target.checked)}
            className="h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">{value ? 'Activado' : 'Desactivado'}</span>
        </div>
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange?.(name, e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
};


const CategoryBadge: React.FC<{ category: AnecdotalRecord['category'] }> = ({ category }) => {
  const colors = {
    'Académico': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Comportamiento': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Social': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Otro': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  }
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[category]}`}>{category}</span>
}


export const StudentProfile: React.FC<StudentProfileProps> = ({ student, anecdotes, attendance, classes, onBack, onAddAnecdote, onViewGrades, onUpdateStudent, aiFeatures }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Student>>({});

  const [newNote, setNewNote] = useState('');
  const [newCategory, setNewCategory] = useState<AnecdotalRecord['category']>('Académico');
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Media state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const studentAnecdotes = useMemo(() => {
    return anecdotes
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [anecdotes, student.id]);

  const attendanceSummary = useMemo(() => {
    const summary = { absent: 0, late: 0, excused: 0 };
    attendance.forEach(record => {
      if (record.studentId === student.id) {
        if (record.status === AttendanceStatus.ABSENT) summary.absent++;
        else if (record.status === AttendanceStatus.LATE) summary.late++;
        else if (record.status === AttendanceStatus.EXCUSED) summary.excused++;
      }
    });
    return summary;
  }, [attendance, student.id]);

  const studentClass = classes.find(c => c.id === student.classId);

  // Initialize edit data
  const enterEditMode = () => {
    setEditedData({ ...student });
    setIsEditing(true);
  };

  const handleValueChange = (name: string, value: any) => {
    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditedData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Student] as any),
          [child]: value
        }
      }));
    } else {
      setEditedData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async () => {
    onUpdateStudent(editedData);
    setIsEditing(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeAudio = async () => {
    if (!audioPreview) return;

    setIsAnalyzing(true);
    try {
      const [meta, base64Data] = audioPreview.split(',');
      if (!meta || !base64Data) throw new Error("Formato de audio no válido.");

      const mimeType = meta.split(':')[1].split(';')[0];
      const result = await transcribeAndAnalyzeAnecdote(base64Data, mimeType, student.name);

      if (result) {
        setNewNote(result.transcribedNote);
        setNewCategory(result.category);
      } else {
        alert("No se pudo analizar el audio. Por favor, revise la nota manualmente.");
      }
    } catch (error) {
      console.error("Error al analizar audio:", error);
      alert("Ocurrió un error al procesar el audio.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddAnecdote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim() === '') return;

    setIsUploading(true);
    try {
      let photoUrl = undefined;
      let audioUrl = undefined;

      const uid = authService.isDemoMode() ? 'DEMO_GUEST_USER' : (authService.getCurrentUser()?.id || 'unknown');

      // Upload Photo
      if (photoFile) {
        const path = `users/${uid}/evidence/photos/${Date.now()}_${photoFile.name}`;
        photoUrl = await uploadFile(photoFile, path);
      }

      // Upload Audio
      if (audioPreview) {
        const audioBlob = dataURLToBlob(audioPreview);
        const path = `users/${uid}/evidence/audio/${Date.now()}.webm`;
        audioUrl = await uploadFile(audioBlob, path);
      }

      onAddAnecdote({
        studentId: student.id,
        date: new Date().toISOString(),
        note: newNote,
        category: newCategory,
        photoUrl: photoUrl,
        audioUrl: audioUrl,
      });

      // Reset form
      setNewNote('');
      setNewCategory('Académico');
      setPhotoPreview(null);
      setPhotoFile(null);
      setAudioPreview(null);
    } catch (error) {
      console.error("Error adding anecdote:", error);
      alert("No se pudo guardar el registro. Intente de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    setSummary('');
    const result = await generateStudentSummary(student, studentAnecdotes);
    setSummary(result);
    setIsLoadingSummary(false);
  };

  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={onBack} className="flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors group">
          <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">&larr;</span> Volver a la Lista
        </button>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex-1 md:flex-none flex items-center justify-center bg-slate-100 text-slate-600 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm">
                <XIcon className="w-5 h-5 mr-2" /> Cancelar
              </button>
              <button onClick={handleSaveProfile} className="flex-1 md:flex-none flex items-center justify-center bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md">
                <CheckIcon className="w-5 h-5 mr-2" /> Guardar Cambios
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onViewGrades(student.id)} className="flex-1 md:flex-none flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold py-2 px-4 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-200 dark:hover:bg-indigo-800/60 transition-colors shadow-sm">
                <StarIcon className="w-5 h-5 mr-2" /> Calificaciones
              </button>
              <button onClick={enterEditMode} className="flex-1 md:flex-none flex items-center justify-center bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-md">
                <PencilIcon className="w-5 h-5 mr-2" /> Editar Perfil
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
          <div className="relative group">
            <Avatar
              name={student.name}
              src={student.avatar}
              size="xl"
              className="border-4 border-indigo-100 dark:border-indigo-900 shadow-inner"
            />
            {isEditing && (
              <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <CameraIcon className="w-8 h-8 text-white" />
                <input id="avatar-upload" type="text" value={editedData.avatar} onChange={e => handleValueChange('avatar', e.target.value)} className="sr-only" placeholder="URL de foto" />
              </label>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedData.name}
                  onChange={e => handleValueChange('name', e.target.value)}
                  className="text-3xl font-black text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg w-full focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre completo"
                />
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nº Orden</label>
                    <input
                      type="number"
                      value={editedData.orderNumber}
                      onChange={e => handleValueChange('orderNumber', parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded border-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Género</label>
                    <select
                      value={editedData.gender}
                      onChange={e => handleValueChange('gender', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded border-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                  {student.orderNumber && <span className="text-indigo-500 text-3xl mr-2">#{student.orderNumber}</span>}
                  {student.name}
                </h1>
                <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                  {studentClass?.grade?.replace(' Grado', '')} {studentClass?.section} &bull; {studentClass?.name}
                </p>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">ID: {student.id}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - AI Summary & Attendance */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-indigo-500" />
              Asistencia Acumulada
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
                <p className="font-black text-3xl">{attendanceSummary.absent}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Faltas</p>
              </div>
              <div className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 p-3 rounded-xl border border-yellow-100 dark:border-yellow-900/50">
                <p className="font-black text-3xl">{attendanceSummary.late}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Tardes</p>
              </div>
              <div className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-black text-3xl">{attendanceSummary.excused}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Excusas</p>
              </div>
            </div>
          </div>

          {aiFeatures.summaryGeneration && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-xl text-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <SparklesIcon className="w-6 h-6 text-yellow-300 animate-pulse" />
                  Resumen IA
                </h3>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isLoadingSummary || studentAnecdotes.length === 0}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <SparklesIcon className={`w-5 h-5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="bg-black/20 p-4 rounded-xl min-h-[200px] text-sm leading-relaxed backdrop-blur-sm">
                {isLoadingSummary ? (
                  <div className="flex flex-col items-center justify-center h-48 space-y-3">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <p className="font-medium animate-pulse">Sintetizando anécdotas...</p>
                  </div>
                ) : summary ? (
                  <p className="whitespace-pre-wrap">{summary}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-white/60">
                    <SparklesIcon className="w-10 h-10 mb-3 opacity-30" />
                    <p>Genera un análisis constructivo basado en las observaciones registradas.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Info Tabs */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col">
          <div className="flex border-b border-slate-100 dark:border-slate-700 px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
            <TabButton label="Datos" icon={<UserCircleIcon className="w-5 h-5" />} isActive={activeTab === 'general'} onClick={() => setActiveTab('general')} />
            <TabButton label="Salud" icon={<HeartIcon className="w-5 h-5" />} isActive={activeTab === 'health'} onClick={() => setActiveTab('health')} />
            <TabButton label="Familia" icon={<UserGroupIcon className="w-5 h-5" />} isActive={activeTab === 'family'} onClick={() => setActiveTab('family')} />
            <TabButton label="Tecno" icon={<WifiIcon className="w-5 h-5" />} isActive={activeTab === 'connectivity'} onClick={() => setActiveTab('connectivity')} />
          </div>

          <div className="p-8 flex-grow">
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <EditableField label="Nombre Completo" value={isEditing ? editedData.name : student.name} name="name" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Número de Orden" value={isEditing ? editedData.orderNumber : student.orderNumber} name="orderNumber" type="number" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Género" value={isEditing ? editedData.gender : (student.gender === 'M' ? 'Masculino' : 'Femenino')} name="gender" type="select" options={['M', 'F']} isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Fecha de Nacimiento" value={isEditing ? editedData.birthDate : formatBirthDate(student.birthDate)} name="birthDate" type="date" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Correo Electrónico" value={isEditing ? editedData.email : student.email} name="email" type="email" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Teléfono" value={isEditing ? editedData.phone : student.phone} name="phone" type="tel" isEditing={isEditing} onChange={handleValueChange} />
                <div className="md:col-span-2">
                  <EditableField label="Estudiante Repitente" value={isEditing ? editedData.isRepeater : student.isRepeater} name="isRepeater" type="checkbox" isEditing={isEditing} onChange={handleValueChange} />
                </div>
              </div>
            )}
            {activeTab === 'health' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <EditableField label="Tipo de Sangre" value={isEditing ? editedData.healthInfo?.bloodType : student.healthInfo?.bloodType} name="healthInfo.bloodType" type="select" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Contacto de Emergencia" value={isEditing ? editedData.healthInfo?.emergencyContactName : student.healthInfo?.emergencyContactName} name="healthInfo.emergencyContactName" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Teléfono de Emergencia" value={isEditing ? editedData.healthInfo?.emergencyContactPhone : student.healthInfo?.emergencyContactPhone} name="healthInfo.emergencyContactPhone" type="tel" isEditing={isEditing} onChange={handleValueChange} />
                <div className="md:col-span-2 space-y-8">
                  <EditableField label="Alergias Conocidas" value={isEditing ? editedData.healthInfo?.allergies : student.healthInfo?.allergies} name="healthInfo.allergies" type="textarea" isEditing={isEditing} onChange={handleValueChange} />
                  <EditableField label="Medicamentos Actuales" value={isEditing ? editedData.healthInfo?.medications : student.healthInfo?.medications} name="healthInfo.medications" type="textarea" isEditing={isEditing} onChange={handleValueChange} />
                </div>
              </div>
            )}
            {activeTab === 'family' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <EditableField label="Nombre de la Madre" value={isEditing ? editedData.familyInfo?.motherName : student.familyInfo?.motherName} name="familyInfo.motherName" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Teléfono de la Madre" value={isEditing ? editedData.familyInfo?.motherPhone : student.familyInfo?.motherPhone} name="familyInfo.motherPhone" type="tel" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Nombre del Padre" value={isEditing ? editedData.familyInfo?.fatherName : student.familyInfo?.fatherName} name="familyInfo.fatherName" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Teléfono del Padre" value={isEditing ? editedData.familyInfo?.fatherPhone : student.familyInfo?.fatherPhone} name="familyInfo.fatherPhone" type="tel" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Tutor/a Legal" value={isEditing ? editedData.familyInfo?.guardianName : student.familyInfo?.guardianName} name="familyInfo.guardianName" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Teléfono del Tutor/a" value={isEditing ? editedData.familyInfo?.guardianPhone : student.familyInfo?.guardianPhone} name="familyInfo.guardianPhone" type="tel" isEditing={isEditing} onChange={handleValueChange} />
                <div className="md:col-span-2">
                  <EditableField label="Dirección" value={isEditing ? editedData.familyInfo?.address : student.familyInfo?.address} name="familyInfo.address" type="textarea" isEditing={isEditing} onChange={handleValueChange} />
                </div>
              </div>
            )}
            {activeTab === 'connectivity' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <EditableField label="Acceso a Internet en Casa" value={isEditing ? editedData.connectivityInfo?.hasInternet : student.connectivityInfo?.hasInternet} name="connectivityInfo.hasInternet" type="checkbox" isEditing={isEditing} onChange={handleValueChange} />
                <EditableField label="Manejo de Plataformas" value={isEditing ? editedData.connectivityInfo?.platformFamiliarity : student.connectivityInfo?.platformFamiliarity} name="connectivityInfo.platformFamiliarity" type="select" options={['Básico', 'Intermedio', 'Avanzado', 'Nulo']} isEditing={isEditing} onChange={handleValueChange} />
                <div className="md:col-span-2">
                  <EditableField label="Dispositivos con Acceso" value={isEditing ? editedData.connectivityInfo?.deviceAccess : student.connectivityInfo?.deviceAccess} name="connectivityInfo.deviceAccess" type="textarea" isEditing={isEditing} onChange={handleValueChange} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anecdotal Records */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6 text-indigo-500" />
          Bitácora de Observaciones
        </h3>

        <form onSubmit={handleAddAnecdote} className="mb-10 space-y-6 bg-slate-50 dark:bg-slate-700/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Describa la situación observada o use el micrófono..."
            className="w-full p-4 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
            rows={3}
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as AnecdotalRecord['category'])}
                className="p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option>Académico</option>
                <option>Comportamiento</option>
                <option>Social</option>
                <option>Otro</option>
              </select>

              <div className="flex items-center gap-2">
                <label htmlFor="photo-upload-profile" className="cursor-pointer p-3 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-500 hover:text-indigo-600 hover:border-indigo-500 transition-all shadow-sm">
                  <CameraIcon className="w-5 h-5" />
                  <input id="photo-upload-profile" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                <AudioRecorder onRecordingComplete={setAudioPreview} />
              </div>
            </div>

            <button type="submit" className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none" disabled={isUploading || isAnalyzing || !newNote.trim()}>
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </span>
              ) : (
                <><PlusIcon className="w-5 h-5 mr-2" /> Añadir Observación</>
              )}
            </button>
          </div>

          {(photoPreview || audioPreview) && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 flex flex-col gap-4">
              {photoPreview && (
                <div className="relative group w-fit">
                  <img src={photoPreview} alt="Evidencia" className="rounded-xl max-h-48 h-auto shadow-lg border-4 border-white dark:border-slate-800" />
                  <button type="button" onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
              {audioPreview && (
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-100 dark:border-slate-600 shadow-sm w-full max-w-xl">
                  <audio src={audioPreview} controls className="flex-grow h-8" />
                  <div className="flex gap-2">
                    {aiFeatures.audioAnalysis && (
                      <button
                        type="button"
                        onClick={handleAnalyzeAudio}
                        disabled={isAnalyzing}
                        className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors shadow-sm disabled:opacity-50"
                        title="Analizar con IA"
                      >
                        <SparklesIcon className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <button type="button" onClick={() => setAudioPreview(null)} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="space-y-6">
          {studentAnecdotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studentAnecdotes.map(anecdote => (
                <div key={anecdote.id} className="bg-slate-50 dark:bg-slate-700/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {new Date(anecdote.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <CategoryBadge category={anecdote.category} />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{anecdote.note}</p>
                  {anecdote.photoUrl && (
                    <div className="mt-4 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-600 cursor-zoom-in">
                      <img src={anecdote.photoUrl} alt="Evidencia" className="w-full h-auto object-cover max-h-60 hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  {anecdote.audioUrl && (
                    <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <audio src={anecdote.audioUrl} controls className="w-full h-8" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-700/10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <DocumentTextIcon className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No se han registrado observaciones aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};