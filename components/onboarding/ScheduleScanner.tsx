
import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { extractScheduleFromImage } from '../../services/geminiService';

interface ScheduleScannerProps {
    onScheduleExtracted: (courses: any[]) => void;
    userId: string;
    onProcessingChange?: (isProcessing: boolean) => void;
    onImageCaptured?: (imageUrl: string | null) => void;
}

// Helper to deduplicate courses (same as in OnboardingWizard)
function deduplicateCourses(courses: Array<{ name: string; grade: string; section?: string; schedule?: string; hoursPerWeek?: number }>) {
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const seen = new Map<string, typeof courses[0]>();
    for (const c of courses) {
        const key = `${normalize(c.name)}|${normalize(c.grade)}|${normalize(c.section || '')}`;
        if (!seen.has(key)) seen.set(key, c);
    }
    return Array.from(seen.values());
}

export const ScheduleScanner: React.FC<ScheduleScannerProps> = ({
    onScheduleExtracted,
    onProcessingChange,
    onImageCaptured
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [image, setImage] = useState<string | null>(null);
    const [isInternalProcessing, setIsInternalProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setImage(previewUrl);
        if (onImageCaptured) onImageCaptured(previewUrl);

        setError(null);
        setIsInternalProcessing(true);
        if (onProcessingChange) onProcessingChange(true);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const result = await extractScheduleFromImage(base64);
                const deduped = deduplicateCourses(result.courses);
                onScheduleExtracted(deduped);
            } catch (err) {
                console.error("Error extracting schedule:", err);
                setError('No pudimos analizar tu horario. Intenta con otra foto clara.');
            } finally {
                setIsInternalProcessing(false);
                if (onProcessingChange) onProcessingChange(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {!image ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-3 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-10 text-center hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group"
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <ImageIcon className="text-slate-400 w-8 h-8" />
                    </div>
                    <p className="font-bold text-slate-700 dark:text-slate-300">Toca para tomar o subir foto</p>
                    <p className="text-sm text-slate-400 mt-2">Extraeremos tus cursos automáticamente</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-800">
                        <img src={image} alt="Horario" className="w-full h-full object-cover" />
                        {isInternalProcessing && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4 text-center">
                                <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-400" />
                                <p className="font-bold">Analizando horario...</p>
                                <p className="text-xs opacity-80 mt-1 text-slate-200">Esto puede tomar unos segundos</p>
                            </div>
                        )}
                        {!isInternalProcessing && (
                            <div className="absolute bottom-2 right-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Listo
                            </div>
                        )}
                    </div>
                    <button
                        disabled={isInternalProcessing}
                        onClick={() => {
                            setImage(null);
                            if (onImageCaptured) onImageCaptured(null);
                        }}
                        className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                        Cambiar foto
                    </button>
                </div>
            )}
        </div>
    );
};
