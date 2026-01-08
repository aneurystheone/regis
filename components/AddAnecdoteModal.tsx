
import React, { useState, useEffect, useMemo } from 'react';
import type { Student, AnecdotalRecord } from '../types';
import { PlusIcon, XIcon, CameraIcon, SparklesIcon } from './icons';
import { AudioRecorder } from './AudioRecorder';
import { uploadFile, dataURLToBlob } from '../services/storageService';
import { authService } from '../services/authService';
import { transcribeAndAnalyzeAnecdote } from '../services/geminiService';

interface AddAnecdoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onAddAnecdote: (anecdote: Omit<AnecdotalRecord, 'id' | 'studentId'> & { studentIds: string[] }) => void;
  selectedClassId?: string | null;
}

export const AddAnecdoteModal: React.FC<AddAnecdoteModalProps> = ({ isOpen, onClose, students, onAddAnecdote, selectedClassId }) => {
  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<AnecdotalRecord['category']>('Académico');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Media state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null); // This remains Base64/Blob URL for preview
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedStudentIds([]);
      setNote('');
      setCategory('Académico');
      setSearchQuery('');
      setPhotoPreview(null);
      setPhotoFile(null);
      setAudioPreview(null);
      setIsSearchFocused(false);
      setIsUploading(false);
      setIsTranscribing(false);
    }
  }, [isOpen]);

  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  const availableStudents = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    // Allow searching through ALL students (Global Search)
    return students.filter(s =>
      !selectedStudentIds.includes(s.id) &&
      (searchQuery ? s.name.toLowerCase().includes(lowerCaseQuery) : (selectedClassId ? s.classId === selectedClassId : true))
    );
  }, [students, searchQuery, selectedStudentIds, selectedClassId]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => [...prev, studentId]);
    setSearchQuery('');
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAudioComplete = (audioDataUrl: string) => {
    setAudioPreview(audioDataUrl);
  };

  const handleTranscribe = async () => {
    if (!audioPreview) return;

    setIsTranscribing(true);
    try {
      // Extract Base64 and mimeType from dataURL
      const [header, base64Data] = audioPreview.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'audio/webm';

      const firstStudentName = selectedStudents[0]?.name || "el estudiante";
      const result = await transcribeAndAnalyzeAnecdote(base64Data, mimeType, firstStudentName);

      if (result) {
        setNote(prev => prev ? `${prev}\n\n${result.transcribedNote}` : result.transcribedNote);
        setCategory(result.category);
      }
    } catch (error) {
      console.error("Transcription failed:", error);
      alert("Error al transcribir el audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim() && selectedStudentIds.length > 0) {
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
          // AudioRecorder returns DataURL, convert to Blob
          const audioBlob = dataURLToBlob(audioPreview);
          const path = `users/${uid}/evidence/audio/${Date.now()}.webm`;
          audioUrl = await uploadFile(audioBlob, path);
        }

        onAddAnecdote({
          studentIds: selectedStudentIds,
          date: new Date().toISOString(),
          note,
          category,
          photoUrl: photoUrl,
          audioUrl: audioUrl,
        });
        onClose();
      } catch (error) {
        console.error("Upload failed:", error);
        alert("Error al subir archivos. Por favor intente de nuevo.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-2xl m-4 transform transition-all flex flex-col max-h-[90vh]" role="document">
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Añadir Incidencia / Anécdota</h2>
            <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Cerrar">
              <XIcon />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-4">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Estudiantes</label>
            <div className="flex flex-wrap items-center gap-2 p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md">
              {selectedStudents.map(student => (
                <span key={student.id} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-sm font-medium px-2 py-1 rounded-full">
                  {student.name}
                  <button type="button" onClick={() => handleRemoveStudent(student.id)} className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100">
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                placeholder="Buscar y añadir estudiantes..."
                className="flex-grow bg-transparent focus:outline-none text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 py-1"
              />
            </div>
            {isSearchFocused && availableStudents.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {availableStudents.slice(0, 10).map(student => ( // Show top 10 results
                  <li
                    key={student.id}
                    onMouseDown={() => handleSelectStudent(student.id)}
                    className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {student.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="anecdote-note" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Observación</label>
            <textarea
              id="anecdote-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition"
              rows={3} required
            />
          </div>
          {photoPreview && (
            <div className="relative group w-fit">
              <img src={photoPreview} alt="Evidencia" className="rounded-lg max-h-32 h-auto border border-slate-200 dark:border-slate-600" />
              <button type="button" onClick={() => { setPhotoPreview(null); setPhotoFile(null); }} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-all">&times;</button>
            </div>
          )}
          {audioPreview && (
            <div className="relative group w-full flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
              <audio src={audioPreview} controls className="h-8 flex-grow" />
              <button
                type="button"
                onClick={handleTranscribe}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors text-sm font-semibold disabled:opacity-50"
                disabled={isTranscribing}
                title="Transcribir audio con Vicente"
              >
                {isTranscribing ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                {isTranscribing ? 'Transcribiendo...' : 'Transcribir'}
              </button>
              <button type="button" onClick={() => setAudioPreview(null)} className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600" title="Eliminar grabación">&times;</button>
            </div>
          )}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value as AnecdotalRecord['category'])}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                <option>Académico</option><option>Comportamiento</option><option>Social</option><option>Otro</option>
              </select>
              <label htmlFor="photo-upload-modal" className="cursor-pointer p-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors">
                <CameraIcon /><input id="photo-upload-modal" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <AudioRecorder onRecordingComplete={handleAudioComplete} />
            </div>
          </div>
          <div className="flex-shrink-0 flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Cancelar</button>
            <button type="submit" className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400" disabled={selectedStudentIds.length === 0 || !note.trim() || isUploading}>
              {isUploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
              <PlusIcon className="w-5 h-5 mr-2" />
              {isUploading ? 'Subiendo...' : 'Añadir Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
