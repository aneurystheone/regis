
import React, { useState, useEffect } from 'react';
import { X, BookOpen, Calendar, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { JournalEntry, Class } from '../types';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<JournalEntry, 'id'> & { id?: string }) => void;
  entry?: JournalEntry | null;
  classes: Class[];
  selectedClassId?: string | null;
}

export const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, onSave, entry, classes, selectedClassId }) => {
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classId, setClassId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setContent(entry.content);
        setDate(entry.date.split('T')[0]);
        setClassId(entry.classId);
      } else {
        setContent('');
        setDate(new Date().toISOString().split('T')[0]);
        setClassId(selectedClassId || undefined);
      }
    }
  }, [isOpen, entry, selectedClassId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: entry?.id,
      content,
      date: new Date(date).toISOString(),
      classId: classId === 'general' ? undefined : classId
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800"
          >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {entry ? 'Editar Entrada' : 'Nueva Reflexión'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Date and Class Selector Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                   <Calendar className="w-4 h-4" /> Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                   <GraduationCap className="w-4 h-4" /> Clase
                </label>
                <select
                  value={classId || 'general'}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="general">General (Sin clase)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.grade} {c.section} - {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Area */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Reflexión del día
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué sucedió hoy? ¿Qué podrías mejorar mañana?"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500/20 min-h-[200px] resize-none"
                autoFocus
              />
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!content.trim()}
                className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              >
                {entry ? 'Guardar Cambios' : 'Registrar Reflexión'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
