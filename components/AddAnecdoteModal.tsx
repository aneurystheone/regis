import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, X, Sparkles, Image, ShieldAlert, BadgeCheck, BookOpen, Volume2, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Student, AnecdotalRecord, Class } from '../types';
import { AudioRecorder } from './AudioRecorder';
import { AudioVisualizer } from './AudioVisualizer';
import { uploadFileWithOfflineFallback, dataURLToBlob } from '../services/storageService';
import { captureImageWithNativeFallback } from '../services/cameraService';
import { authService } from '../services/authService';
import { transcribeAndAnalyzeAnecdote, type AudioTranscriptionResult } from '../services/geminiService';
import { useAlert } from '../contexts/ConfirmationContext';

interface AddAnecdoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onAddAnecdote: (anecdote: Omit<AnecdotalRecord, 'id' | 'studentId'> & { studentIds: string[] }) => void;
  selectedClassId?: string | null;
  classes: Class[];
  deletedStudents: Student[];
}

export const AddAnecdoteModal: React.FC<AddAnecdoteModalProps> = ({ isOpen, onClose, students, onAddAnecdote, selectedClassId, classes, deletedStudents }) => {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<AnecdotalRecord['category']>('Académico');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Media state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null); // This remains Base64/Blob URL for preview
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionWarning, setTranscriptionWarning] = useState<{ rawAudio: string } | null>(null);
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  // Pre-warmed microphone stream — stored in state so AudioRecorder re-renders when ready
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const alert = useAlert();

  // Pre-warm mic hardware when modal opens (eliminates 4-5s silent start)
  useEffect(() => {
    if (!isOpen) return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      console.warn('Mic pre-warm skipped: mediaDevices.getUserMedia is not available in this context (e.g. HTTP non-secure connection).');
      return;
    }

    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
        } else {
          setMicStream(stream);
        }
      })
      .catch(err => {
        console.warn('Mic pre-warm failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Release mic stream on close
      setMicStream(prev => {
        prev?.getTracks().forEach(t => t.stop());
        return null;
      });
      setSelectedStudentIds([]);
      setNote('');
      setCategory('Académico');
      setSearchQuery('');
      setPhotoPreview(null);
      setPhotoFile(null);
      setAudioPreview(null);
      setIsRecordingAudio(false);
      setIsSearchFocused(false);
      setIsUploading(false);
      setIsTranscribing(false);
      setTranscriptionWarning(null);
      setShowImageSourcePicker(false);
    }
  }, [isOpen]);

  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  const availableStudents = useMemo(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    // Allow searching through ALL students (Global Search) except deleted ones
    return students.filter(s =>
      !deletedStudents.some(ds => ds.id === s.id) &&
      !selectedStudentIds.includes(s.id) &&
      classes.some(c => c.id === s.classId) &&
      (searchQuery ? s.name.toLowerCase().includes(lowerCaseQuery) : (selectedClassId ? s.classId === selectedClassId : true))
    );
  }, [students, searchQuery, selectedStudentIds, selectedClassId, deletedStudents, classes]);

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

  const handleSelectImageSource = async (source: 'camera' | 'gallery') => {
    setShowImageSourcePicker(false);
    const nativeResult = await captureImageWithNativeFallback(source);
    if (nativeResult) {
      setPhotoFile(nativeResult.file);
      setPhotoPreview(nativeResult.previewUrl);
    } else {
      if (source === 'camera') {
        cameraInputRef.current?.click();
      } else {
        galleryInputRef.current?.click();
      }
    }
  };

  const handleAudioComplete = (audioDataUrl: string) => {
    setAudioPreview(audioDataUrl);
    setTranscriptionWarning(null); // clear previous warning on new recording

    // Auto-fill observation if empty
    setNote(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return "Anécdota de audio";
      if (!trimmed.includes("Anécdota de audio")) return `${trimmed}\n\n[Anécdota de audio]`;
      return prev;
    });
  };

  const handleTranscribe = async () => {
    if (!audioPreview) return;

    setIsTranscribing(true);
    setTranscriptionWarning(null);
    try {
      const [header, base64Data] = audioPreview.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'audio/webm';

      const firstStudentName = selectedStudents[0]?.name || "el estudiante";
      const result = await transcribeAndAnalyzeAnecdote(base64Data, mimeType, firstStudentName);

      if (!result) {
        // Hard error (API failure, no key, etc.)
        setTranscriptionWarning({ rawAudio: 'Vicente no pudo conectarse. Verifica tu conexión o API Key.' });
        return;
      }

      if (result.confidence === 'low') {
        // Audio unintelligible: show warning, do NOT fill textarea
        setTranscriptionWarning({ rawAudio: result.rawAudio });
        setCategory(result.category);
        return;
      }

      // confidence === 'high': fill textarea normally
      setTranscriptionWarning(null);
      setNote(prev => prev ? `${prev}\n\n${result.transcribedNote}` : result.transcribedNote);
      setCategory(result.category);
    } catch (error) {
      console.error("Transcription failed:", error);
      setTranscriptionWarning({ rawAudio: 'Error inesperado al procesar el audio.' });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleReRecord = () => {
    setAudioPreview(null);
    setTranscriptionWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    console.log("Vicente Debug: Modal Submit started for students:", selectedStudentIds);
    if (note.trim() && selectedStudentIds.length > 0) {
      setIsUploading(true);
      try {
        let photoUrl = undefined;
        let audioUrl = undefined;

        const uid = authService.isDemoMode() ? 'DEMO_GUEST_USER' : (authService.getCurrentUser()?.id || 'unknown');

        // Upload Photo
        if (photoFile) {
          const path = `users/${uid}/evidence/photos/${Date.now()}_${photoFile.name}`;
          photoUrl = await uploadFileWithOfflineFallback(photoFile, path);
        }

        // Upload Audio
        if (audioPreview) {
          // AudioRecorder returns DataURL, convert to Blob
          const audioBlob = dataURLToBlob(audioPreview);
          const path = `users/${uid}/evidence/audio/${Date.now()}.webm`;
          audioUrl = await uploadFileWithOfflineFallback(audioBlob, path);
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
      } catch (error: any) {
        console.error("Upload failed:", error);
        await alert({ title: 'Error', message: `Error al guardar: ${error.message || error}`, type: 'danger' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center px-4" aria-modal="true" role="dialog">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-neutral-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden relative z-10 border border-white/20 dark:border-slate-800/50"
            role="document"
          >
            <div className="flex-shrink-0 p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Añadir Anécdota</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-grow overflow-y-auto no-scrollbar">
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Estudiantes Implicados
                </label>
                <div className="flex flex-wrap items-center gap-2 p-3 border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                  {selectedStudents.map(student => {
                    const studentClass = classes.find(c => c.id === student.classId);
                    const classInfo = studentClass ? ` - ${studentClass.grade} ${studentClass.section}` : '';
                    return (
                      <span key={student.id} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        {student.name} <span className="text-indigo-400 dark:text-indigo-500 font-normal">{classInfo}</span>
                        <button type="button" onClick={() => handleRemoveStudent(student.id)} className="ml-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder={selectedStudents.length === 0 ? "Buscar y añadir estudiantes..." : "Añadir más..."}
                    className="flex-grow bg-transparent focus:outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-1 min-w-[150px]"
                  />
                </div>
                {isSearchFocused && availableStudents.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden"
                  >
                    <div className="max-h-56 overflow-y-auto no-scrollbar">
                      {availableStudents.slice(0, 10).map(student => {
                        const studentClass = classes.find(c => c.id === student.classId);
                        const classInfo = studentClass ? `${studentClass.grade} ${studentClass.section}` : '';
                        return (
                          <li
                            key={student.id}
                            onMouseDown={() => handleSelectStudent(student.id)}
                            className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors"
                          >
                            <span className="font-semibold">{student.name}</span>
                            <span className="text-xs text-slate-400">{classInfo}</span>
                          </li>
                        );
                      })}
                    </div>
                  </motion.ul>
                )}
              </div>

              {/* Categorization & Visualizers */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl max-w-full overflow-x-auto custom-scrollbar">
                  {['Académico', 'Comportamiento', 'Social', 'Otro'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat as any)}
                      className={`px-2.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shrink-0 transition-all ${category === cat
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {isRecordingAudio && <AudioVisualizer isRecording={true} />}
              </div>

              {/* Observation Area */}
              <div className="relative">
                <label htmlFor="anecdote-note" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Observación
                </label>
                <div className="flex flex-col border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                  <textarea
                    id="anecdote-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Describe lo sucedido o graba un audio..."
                    className="w-full p-4 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none min-h-[120px] resize-y"
                    required
                  />

                  {/* Media Action Bar */}
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/50 relative z-30 rounded-b-2xl">
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {/* Optional character count or status if needed, otherwise empty */}
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm relative">
                      {/* Backdrop overlay for closing picker when clicking outside */}
                      {showImageSourcePicker && (
                        <div
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowImageSourcePicker(false);
                          }}
                        />
                      )}

                      {/* Choice Picker Popover */}
                      <AnimatePresence>
                        {showImageSourcePicker && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-30 flex flex-col gap-1 min-w-[140px]"
                          >
                            <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 mb-1">
                              Añadir imagen
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectImageSource('camera')}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left w-full cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-indigo-500" />
                              <span>Cámara</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectImageSource('gallery')}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left w-full cursor-pointer"
                            >
                              <Image className="w-4 h-4 text-indigo-500" />
                              <span>Galería</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        type="button"
                        onClick={() => setShowImageSourcePicker(!showImageSourcePicker)}
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/40 cursor-pointer transition-all active:scale-95"
                        title="Añadir imagen"
                      >
                        <Camera className="w-5 h-5" />
                      </button>

                      {/* Hidden Inputs */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />

                      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
                      <AudioRecorder
                        onRecordingComplete={handleAudioComplete}
                        onRecordingStateChange={setIsRecordingAudio}
                        prewarmedStream={micStream}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Previews attached below the input */}
              <AnimatePresence>
                {(photoPreview || audioPreview) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-4 pt-2"
                  >
                    {audioPreview && (
                      <div className="flex-grow flex flex-col gap-2">
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <audio src={audioPreview} controls className="h-10 flex-grow invert-0 dark:invert-[0.9] dark:hue-rotate-180" />

                          <button
                            type="button"
                            onClick={handleTranscribe}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors text-xs font-bold disabled:opacity-50"
                            disabled={isTranscribing}
                          >
                            {isTranscribing ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            <span className="hidden sm:inline">{isTranscribing ? 'Procesando...' : 'IA'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleReRecord}
                            className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                            title="Eliminar audio"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Transcription Warning Banner */}
                        <AnimatePresence>
                          {transcriptionWarning && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="flex flex-col gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl"
                            >
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                    Vicente no pudo entender bien el audio
                                  </p>
                                  {transcriptionWarning.rawAudio && transcriptionWarning.rawAudio !== '' && (
                                    <p className="text-xs text-amber-600 dark:text-amber-300 mt-1 italic">
                                      Lo que percibí: &ldquo;{transcriptionWarning.rawAudio}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleReRecord}
                                className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 rounded-xl transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Grabar de nuevo
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {photoPreview && (
                      <div className="relative group w-fit flex-shrink-0">
                        <img src={photoPreview} alt="Evidencia" className="rounded-2xl h-24 object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                        <button
                          type="button"
                          onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                          className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 dark:text-slate-400 shadow-md rounded-full p-1 opacity-0 group-hover:opacity-100 border border-slate-200 dark:border-slate-700 transition-all scale-95 group-hover:scale-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
                  disabled={selectedStudentIds.length === 0 || !note.trim() || isUploading}
                >
                  {isUploading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isUploading ? 'Guardando...' : 'Añadir Registro'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
