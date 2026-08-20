
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon, SendIcon, AlertTriangleIcon, ClipboardCheckIcon, MessageSquareIcon, HeartIcon, UserGroupIcon, ActivityIcon, HomeIcon, SparklesIcon, DownloadIcon } from './icons';
import type { Student } from '../types';

interface GuidanceReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    onConfirm: (data: GuidanceReferralData) => void;
}

export interface GuidanceReferralData {
    reason: 'Académico' | 'Conductual' | 'Emocional' | 'Social' | 'Salud' | 'Familiar';
    description: string;
    actionsTaken: string;
    suggestions: string;
}

const REASONS = [
    { id: 'Académico', icon: <ClipboardCheckIcon className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'Conductual', icon: <AlertTriangleIcon className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: 'Emocional', icon: <HeartIcon className="w-5 h-5" />, color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
    { id: 'Social', icon: <UserGroupIcon className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { id: 'Salud', icon: <ActivityIcon className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 'Familiar', icon: <HomeIcon className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
];

export const GuidanceReferralModal: React.FC<GuidanceReferralModalProps> = ({ isOpen, onClose, student, onConfirm }) => {
    const [data, setData] = useState<GuidanceReferralData>({
        reason: 'Académico',
        description: '',
        actionsTaken: '',
        suggestions: ''
    });

    const isFormValid = data.description.trim().length > 10;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormValid) {
            onConfirm(data);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-6 text-white">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <SendIcon className="w-6 h-6" />
                                    Referimiento a Orientación
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-indigo-100 text-sm">
                                Documentando caso para: <span className="font-bold text-white">{student.name}</span>
                            </p>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                            {/* Reason Selector */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
                                    Motivo del Referimiento
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {REASONS.map((reason) => (
                                        <button
                                            key={reason.id}
                                            type="button"
                                            onClick={() => setData({ ...data, reason: reason.id as any })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 ${data.reason === reason.id
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-xl ${reason.color}`}>
                                                {reason.icon}
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {reason.id}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1 flex items-center gap-2">
                                    <MessageSquareIcon className="w-4 h-4 text-indigo-500" />
                                    Descripción de la Situación
                                </label>
                                <textarea
                                    required
                                    value={data.description}
                                    onChange={(e) => setData({ ...data, description: e.target.value })}
                                    placeholder="Detalle los hechos observados, frecuencia y contexto..."
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-all resize-none text-slate-700 dark:text-slate-200"
                                />
                            </div>

                            {/* Actions Taken */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1 flex items-center gap-2">
                                    <ClipboardCheckIcon className="w-4 h-4 text-emerald-500" />
                                    Acciones Tomadas por el Docente
                                </label>
                                <textarea
                                    value={data.actionsTaken}
                                    onChange={(e) => setData({ ...data, actionsTaken: e.target.value })}
                                    placeholder="Entrevistas con padres, acuerdos previos, estrategias en aula..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-all resize-none text-slate-700 dark:text-slate-200"
                                />
                            </div>

                            {/* Suggestions */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1 flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                                    Sugerencias o Expectativas
                                </label>
                                <textarea
                                    value={data.suggestions}
                                    onChange={(e) => setData({ ...data, suggestions: e.target.value })}
                                    placeholder="¿Qué espera lograr con este referimiento?"
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-all resize-none text-slate-700 dark:text-slate-200"
                                />
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!isFormValid}
                                onClick={handleSubmit}
                                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all ${isFormValid
                                    ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                                    : 'bg-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                <DownloadIcon className="w-5 h-5" />
                                Generar Informe
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
