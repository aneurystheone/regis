import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Loader2, Send } from 'lucide-react';
import { api } from '../../services/api';
import { APP_VERSION } from '../../types';
import { useUsageSession } from '../../services/usageService';
import { useAlert } from '../../contexts/ConfirmationContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: { id: string; name: string; email: string };
    currentView: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, user, currentView }) => {
    const [type, setType] = useState<'bug' | 'feature' | 'general'>('bug');
    const [message, setMessage] = useState('');
    const [includeScreenshot, setIncludeScreenshot] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSubmitted, setLastSubmitted] = useState<{ type: string, message: string } | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(true);
    const alert = useAlert();

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        if (lastSubmitted && lastSubmitted.type === type && lastSubmitted.message === message.trim()) {
            await alert({ title: 'Feedback', message: 'Este mensaje ya fue enviado recientemente. ¡Gracias por tu aporte!', type: 'info' });
            return;
        }

        setIsSubmitting(true);
        let screenshotUrl: string | null = null;

        try {
            if (includeScreenshot) {
                try {
                    if (!navigator?.mediaDevices?.getDisplayMedia) {
                        throw new Error('getDisplayMedia not available in this context');
                    }
                    // Use native Screen Capture API — no dependency needed
                    const stream = await navigator.mediaDevices.getDisplayMedia({
                        video: { displaySurface: 'browser' } as MediaTrackConstraints,
                        preferCurrentTab: true,
                    } as DisplayMediaStreamOptions);
                    const video = document.createElement('video');
                    video.srcObject = stream;
                    await video.play();
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d')!.drawImage(video, 0, 0);
                    stream.getTracks().forEach(t => t.stop());
                    const blob = await new Promise<Blob>((resolve) =>
                        canvas.toBlob(b => resolve(b!), 'image/png')
                    );
                    screenshotUrl = await api.uploadFeedbackScreenshot(blob);
                } catch (screenshotError) {
                    console.warn('Screenshot generation failed:', screenshotError);
                    // Proceed without screenshot
                }
            }

            await api.addFeedback({
                userId: user.id,
                type,
                message,
                ssoMetadata: { name: user.name, email: user.email },
                appMetadata: {
                    version: APP_VERSION,
                    userAgent: navigator.userAgent,
                    currentView
                },
                screenshotUrl,
                status: 'new'
            });

            setLastSubmitted({ type, message: message.trim() });

            await alert({ title: '¡Gracias!', message: 'Muchísimas gracias por tu aporte.', type: 'info' });
            onClose();
            setMessage('');
            setType('bug');
        } catch (error) {
            console.error('Feedback error:', error);
            await alert({ title: 'Error', message: 'Error enviando feedback. Intenta de nuevo.', type: 'danger' });
        } finally {
            if (isMounted.current) {
                setIsSubmitting(false);
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
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    <motion.div
                        ref={modalRef}
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200 dark:border-slate-700"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Send className="w-5 h-5 text-indigo-500" />
                                    Buzón de sugerencias
                                </h3>
                                <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors -mr-2">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Tus ideas y reportes nos ayudan a mejorar Regis. Por favor, sé lo más detallado posible.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">

                            <div className="grid grid-cols-3 gap-3">
                                {(['bug', 'feature', 'general'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${type === t
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {t === 'bug' && '🐛 Error'}
                                        {t === 'feature' && '✨ Idea'}
                                        {t === 'general' && '💭 Otro'}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    ¿Qué nos quieres contar?
                                </label>
                                <textarea
                                    required
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={type === 'bug' ? 'Describe qué pasó y qué esperabas...' : type === 'feature' ? 'Me gustaría que...' : 'Comentario...'}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none h-32"
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center h-5">
                                    <input
                                        id="screenshot"
                                        type="checkbox"
                                        checked={includeScreenshot}
                                        onChange={(e) => setIncludeScreenshot(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <label htmlFor="screenshot" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none flex-1">
                                    <Camera className="w-4 h-4" />
                                    Incluir captura de pantalla actual
                                </label>
                                {includeScreenshot && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full font-medium">Auto</span>
                                )}
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            Enviar
                                            <Send className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
