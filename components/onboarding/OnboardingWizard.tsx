import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Clock,
    BookOpen,
    School,
    Target,
    Camera,
    CheckCircle2,
    Star,
    Quote,
    Loader2,
    Image as ImageIcon,
    User,
    MessageSquare,
    Smartphone,
    Download,
    X,
    Plus,
    Trash2
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { educationRegionals } from '../../constants/educationData';
import { api } from '../../services/api';
import { extractStudentsFromImage, extractScheduleFromImage } from '../../services/geminiService';
import { OnboardingData, Student } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ScheduleScanner } from './ScheduleScanner';
import { useUsageSession } from '../../services/usageService';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';
import { useAlert } from '../../contexts/ConfirmationContext';

// Normalize and deduplicate courses by name+grade+section
function deduplicateCourses(courses: Array<{ name: string; grade: string; section?: string; schedule?: string; hoursPerWeek?: number }>) {
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const seen = new Map<string, typeof courses[0]>();
    for (const c of courses) {
        const key = `${normalize(c.name)}|${normalize(c.grade)}|${normalize(c.section || '')}`;
        if (!seen.has(key)) seen.set(key, c);
    }
    return Array.from(seen.values());
}

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    userId: string;
}

const ProgressBar = ({ current, total }: { current: number; total: number }) => (
    <div className="absolute top-0 left-0 w-full h-1 bg-neutral-100 dark:bg-slate-700 z-50">
        <motion.div
            className="h-full bg-indigo-600 dark:bg-indigo-400"
            initial={{ width: 0 }}
            animate={{ width: `${(current / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "circOut" }}
        />
    </div>
);

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onClose, onComplete, userId, classes = [] }) => {
    const [step, setStep] = useState(0);
    const { logOnboardingStep } = useUsageSession();

    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);
    const { isInstalled, install, showInstallButton, isIOS } = usePWAInstall();
    const alert = useAlert();

    const [data, setData] = useState<OnboardingData>({
        experience: '',
        referral: '',
        regional: '',
        district: '',
        schoolName: '',
        level: 'secundario',
        subjects: [],
        goal: '',
        scheduleImage: null,
        extractedCourses: []
    });

    const [teacherName, setTeacherName] = useState('');
    const totalSteps = 9; // Saludo, Instalación, Entorno, Asignaturas, Imagen, Cuéntanos, Prueba, Objetivo, Cursos

    useEffect(() => {
        const loadProfile = async () => {
            const profile = await api.getTeacherProfile();
            if (profile.name && profile.name !== 'Usuario') {
                setTeacherName(profile.name);
            }
        };
        if (isOpen) loadProfile();
    }, [isOpen]);

    const updateData = (fields: Partial<OnboardingData>) => {
        setData(prev => ({ ...prev, ...fields }));
    };

    const nextStep = () => {
        const next = Math.min(step + 1, totalSteps - 1);
        setStep(next);
        logOnboardingStep(`step_${next}`, false);
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 0));


    const handleFinalize = async () => {
        setIsLoading(true);
        try {
            // 1. Save Profile Data (critical — must complete before entering)
            const currentProfile = await api.getTeacherProfile();
            await api.setTeacherProfile({
                ...currentProfile,
                name: teacherName || currentProfile.name,
                experienceYears: parseInt(data.experience) || 0,
                acquisitionChannel: data.referral,
                specialization: data.subjects.join(', '),
                regional: data.regional,
                district: data.district,
                schoolName: data.schoolName
            });

            // 2. Prepare classes (synchronous, fast)
            const rawCourses = data.extractedCourses.length > 0
                ? data.extractedCourses
                : data.subjects.map(s => ({ name: s, grade: '1ro' }));

            const uniqueCourses = deduplicateCourses(rawCourses);
            const classColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#78716c'];

            // 3. Fire class creation in background (don't block the wizard)
            const classPromises = uniqueCourses.map(course => {
                const color = classColors[Math.floor(Math.random() * classColors.length)];
                return api.addClass({
                    name: course.name,
                    grade: course.grade,
                    section: course.section || 'A',
                    schoolYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
                    level: data.level === 'primario' ? 'Nivel Primario' : 'Nivel Secundario',
                    schedule: course.schedule || 'Horario por definir',
                    color
                });
            });

            // Don't await — let classes create in background
            Promise.all(classPromises).catch(err => {
                console.error("Error creating classes in background:", err);
            });

            // 4. Trace completion
            logOnboardingStep('completed', true, {
                coursesCount: uniqueCourses.length,
                level: data.level
            });

            // 5. Close wizard immediately
            onComplete();
        } catch (error) {
            console.error("Error finalizing onboarding:", error);
            await alert({ title: 'Error', message: 'Error al guardar los datos. Verifica tu conexión e intenta de nuevo.', type: 'danger' });
        } finally {
            setIsLoading(false);
        }
    };


    if (!isOpen) return null;

    const renderStep = () => {
        switch (step) {
            case 0: return <WelcomeStep onNext={nextStep} teacherName={teacherName} />;
            case 1: return <InstallStep onNext={nextStep} onPrev={prevStep} isInstalled={isInstalled} install={install} showInstallButton={showInstallButton} isIOS={isIOS} />;
            case 2: return <EducationStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
            case 3: return <SubjectsStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
            case 4: return <ScheduleImageStep data={data} updateData={updateData} isProcessing={isProcessing} setIsProcessing={setIsProcessing} setExtractionError={setExtractionError} onNext={nextStep} onPrev={prevStep} subjects={data.subjects} />;
            case 5: return <MarketingStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
            case 6: return <SocialProofStep onNext={nextStep} onPrev={prevStep} />;
            case 7: return <GoalStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
            case 8: return <CoursesReviewStep data={data} updateData={updateData} isProcessing={isProcessing} extractionError={extractionError} onFinish={handleFinalize} isLoading={isLoading} onPrev={prevStep} onRetry={() => setStep(4)} subjects={data.subjects} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
            <div className="bg-neutral-50 dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                <ProgressBar current={step + 1} total={totalSteps} />
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors z-[60]"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// --- Step Components ---

function WelcomeStep({ onNext, teacherName }: any) {
    return (
        <div className="text-center space-y-5 py-2">
            <div className="relative inline-block">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/40">
                    <Sparkles className="text-white w-10 h-10" />
                </div>
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full border-4 border-white dark:border-slate-800"
                />
            </div>
            <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                    {teacherName ? `¡Hola, ${teacherName}!` : '¡Hola, Profe!'} Bienvenido a Regis
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Sabemos que tu tiempo es valioso. Estamos aquí para que el papeleo sea cosa del pasado y puedas enfocarte en lo que amas: enseñar.
                </p>
            </div>

            <button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-200 dark:shadow-none transition-all transform hover:scale-105 active:scale-95 group">
                Comenzar mi viaje
                <ChevronRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-6 text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4" /><span>Ahorra 5h/semana</span></div>
                <div className="flex items-center gap-2 text-sm"><BookOpen className="w-4 h-4" /><span>Registro Digital</span></div>
            </div>
        </div>
    );
}

function InstallStep({ onNext, onPrev, isInstalled, install, showInstallButton, isIOS }: any) {
    return (
        <div className="space-y-5">
            <button onClick={onPrev} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl"><Smartphone className="text-amber-600 dark:text-amber-400 w-6 h-6" /></div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lleva Regis contigo</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Para una mejor experiencia, te recomendamos instalar Regis en tu pantalla de inicio. Así podrás acceder a tu registro digital en segundos, incluso sin conexión.
                </p>

                {isInstalled ? (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl flex items-center gap-4 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-8 h-8" />
                        <div>
                            <p className="font-bold">¡App Instalada!</p>
                            <p className="text-sm opacity-80">Ya tienes la mejor experiencia configurada.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {showInstallButton && (
                            <button
                                onClick={install}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" /> Instalar Aplicación Offline
                            </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-bold">
                                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-xs">iOS</div>
                                    <span>iPhone / iPad</span>
                                </div>
                                <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <li className="flex gap-3"><span className="font-bold text-indigo-200">01</span><span>Toca <strong>Compartir</strong> (cuadrado con flecha).</span></li>
                                    <li className="flex gap-3"><span className="font-bold text-indigo-200">02</span><span>Selecciona <strong>"Añadir a Inicio"</strong>.</span></li>
                                </ol>
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-xs">AND</div>
                                    <span>Android / Chrome</span>
                                </div>
                                <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <li className="flex gap-3"><span className="font-bold text-emerald-200">01</span><span>Toca los <strong>tres puntos (⋮)</strong>.</span></li>
                                    <li className="flex gap-3"><span className="font-bold text-emerald-200">02</span><span>Selecciona <strong>"Instalar aplicación"</strong>.</span></li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <button onClick={onNext} className="w-full py-3.5 text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 transition-colors">
                {isInstalled ? 'Continuar' : 'Omitir por ahora'}
            </button>
        </div>
    );
}

function MarketingStep({ data, updateData, onNext, onPrev }: any) {
    const experiences = [
        { label: 'Recién graduado', value: '0-1' },
        { label: '1 a 5 años', value: '1-5' },
        { label: '6 a 15 años', value: '6-15' },
        { label: 'Más de 15 años', value: '15+' },
    ];
    const channels = ['Un colega me dijo', 'Grupo de WhatsApp', 'Instagram / Facebook', 'TikTok', 'Google', 'Otro'];

    return (
        <div className="space-y-5">
            <button onClick={onPrev} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl"><User className="text-indigo-600 w-5 h-5" /></div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cuéntanos sobre ti</h2>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block ml-1">¿Cuántos años llevas transformando vidas?</label>
                    <div className="flex flex-wrap gap-2">
                        {experiences.map((exp) => (
                            <button
                                key={exp.value}
                                onClick={() => updateData({ experience: exp.value })}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${data.experience === exp.value
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {exp.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block ml-1">¿Cómo te enteraste de Regis?</label>
                    <div className="flex flex-wrap gap-2">
                        {channels.map(channel => (
                            <button
                                key={channel}
                                onClick={() => updateData({ referral: channel })}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${data.referral === channel
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {channel}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <button
                disabled={!data.experience || !data.referral}
                onClick={onNext}
                className="btn-primary w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
            >
                Continuar
            </button>
        </div>
    );
}

function EducationStep({ data, updateData, onNext, onPrev }: any) {
    const selectedRegional = educationRegionals.find(r => r.id === data.regional);
    const availableDistricts = selectedRegional ? selectedRegional.districts : [];

    return (
        <div className="space-y-5">
            <button onClick={onPrev} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl"><School className="text-emerald-600 w-6 h-6" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tu entorno educativo</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Esta información aparecerá en los encabezados de tus reportes.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block ml-1">Regional</label>
                            <select
                                value={data.regional}
                                onChange={(e) => updateData({ regional: e.target.value, district: '' })}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                            >
                                <option value="">Selecciona Regional</option>
                                {educationRegionals.map(r => (
                                    <option key={r.id} value={r.id}>{r.id} - {r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block ml-1">Distrito</label>
                            <select
                                value={data.district}
                                disabled={!data.regional}
                                onChange={(e) => updateData({ district: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                            >
                                <option value="">Selecciona Distrito</option>
                                {availableDistricts.map(d => (
                                    <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block ml-1">Centro Educativo</label>
                        <input type="text" placeholder="Ej. Liceo Juan Pablo Duarte" value={data.schoolName} onChange={(e) => updateData({ schoolName: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block ml-1">Nivel Educativo</label>
                        <div className="flex gap-3">
                            {['primario', 'secundario'].map((lvl) => (
                                <button
                                    key={lvl}
                                    onClick={() => updateData({ level: lvl as any, subjects: [] })}
                                    className={`flex-1 py-3 rounded-2xl border-2 font-bold capitalize transition-all ${data.level === lvl
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'}`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <button
                disabled={!data.schoolName || !data.regional || !data.district}
                onClick={onNext}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all"
            >
                Siguiente
            </button>
        </div>
    );
}

// Subjects per level (matching AddClassModal)
const onboardingPrimarioSubjects = [
    'Lengua Española', 'Matemática', 'Ciencias Sociales', 'Ciencias de la Naturaleza',
    'Formación Integral Humana y Religiosa', 'Educación Artística', 'Educación Física', 'Inglés'
];
const onboardingSecundarioSubjects = [
    'Lengua Española', 'Matemática', 'Ciencias Sociales', 'Ciencias de la Naturaleza',
    'Biología', 'Química', 'Física', 'Formación Integral Humana y Religiosa',
    'Educación Artística', 'Educación Física', 'Inglés', 'Francés', 'Informática', 'Contabilidad', 'Mercadeo'
];

function SubjectsStep({ data, updateData, onNext, onPrev }: any) {
    const [newSubject, setNewSubject] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const availableSubjects = data.level === 'primario' ? onboardingPrimarioSubjects : onboardingSecundarioSubjects;
    const customSubjects = data.subjects.filter((s: string) => !availableSubjects.includes(s));

    const toggleSubject = (subject: string) => {
        if (data.subjects.includes(subject)) {
            updateData({ subjects: data.subjects.filter((s: string) => s !== subject) });
        } else {
            updateData({ subjects: [...data.subjects, subject] });
        }
    };

    const addCustomSubject = () => {
        if (newSubject.trim() && !data.subjects.includes(newSubject.trim())) {
            updateData({ subjects: [...data.subjects, newSubject.trim()] });
            setNewSubject('');
            setShowCustomInput(false);
        }
    };

    const removeCustomSubject = (subject: string) => {
        updateData({ subjects: data.subjects.filter((s: string) => s !== subject) });
    };

    return (
        <div className="space-y-5">
            <button onClick={onPrev} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl"><BookOpen className="text-purple-600 dark:text-purple-400 w-6 h-6" /></div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Asignaturas que impartes</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                    Selecciona las materias de <strong className="text-slate-700 dark:text-slate-300 capitalize">{data.level === 'primario' ? 'Nivel Primario' : 'Nivel Secundario'}</strong> que impartes.
                </p>

                <div className="flex flex-wrap gap-2">
                    {availableSubjects.map((subject: string) => (
                        <button
                            key={subject}
                            onClick={() => toggleSubject(subject)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${data.subjects.includes(subject)
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            {data.subjects.includes(subject) && <CheckCircle2 className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />}
                            {subject}
                        </button>
                    ))}
                </div>

                {/* Custom subjects as removable pills */}
                {customSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {customSubjects.map((subject: string) => (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                key={subject}
                                className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-purple-200 dark:border-purple-800"
                            >
                                <span className="text-sm font-bold">{subject}</span>
                                <button onClick={() => removeCustomSubject(subject)} className="hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Collapsible custom subject input */}
                {showCustomInput ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nombre de la asignatura..."
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') addCustomSubject();
                                if (e.key === 'Escape') { setShowCustomInput(false); setNewSubject(''); }
                            }}
                            autoFocus
                            className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                        <button onClick={addCustomSubject} disabled={!newSubject.trim()} className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                            Añadir
                        </button>
                        <button onClick={() => { setShowCustomInput(false); setNewSubject(''); }} className="text-slate-400 hover:text-slate-600 px-2">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                ) : (
                    <button
                        onClick={() => setShowCustomInput(true)}
                        className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Añadir otra asignatura
                    </button>
                )}
            </div>
            <button
                disabled={data.subjects.length === 0}
                onClick={onNext}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all"
            >
                Continuar ({data.subjects.length} seleccionada{data.subjects.length !== 1 ? 's' : ''})
            </button>
        </div>
    );
}

function SocialProofStep({ onNext, onPrev }: any) {
    return (
        <div className="bg-indigo-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden -mx-2">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Quote className="w-28 h-28" /></div>
            <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                </div>
                <blockquote className="text-2xl sm:text-3xl font-bold leading-tight italic">
                    "Regis cambió mi vida. Antes pasaba mis domingos llenando registros físicos, ahora lo hago en minutos desde mi celular."
                </blockquote>
                <div className="flex items-center gap-4">
                    <img src="https://ui-avatars.com/api/?name=Maria+Rodriguez&background=random" alt="Docente" className="w-12 h-12 rounded-full border-2 border-white/20" />
                    <div>
                        <p className="font-bold">María Rodríguez</p>
                        <p className="text-indigo-200 text-sm">Docente de Matemáticas, 12 años exp.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={onNext} className="flex-1 bg-white text-indigo-900 px-8 py-3.5 rounded-2xl font-black hover:bg-indigo-50 transition-all transform hover:scale-105">
                        ¡Yo también quiero eso!
                    </button>
                    <button onClick={onPrev} className="px-6 py-3.5 rounded-2xl border border-white/20 hover:bg-white/10 transition-colors text-sm font-bold">
                        Atrás
                    </button>
                </div>
            </div>
        </div>
    );
}

function GoalStep({ data, updateData, onNext, onPrev }: any) {
    const goals = [
        { id: 'time', label: 'Ahorrar tiempo en papeleo', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
        { id: 'org', label: 'Tener todo organizado en un lugar', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100' },
        { id: 'stats', label: 'Ver estadísticas de mis estudiantes', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { id: 'comm', label: 'Ayuda de Vicente con la IA', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-100' },
    ];
    return (
        <div className="space-y-5">
            <button onClick={onPrev} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¿Cuál es tu objetivo principal?</h2>
                <div className="grid grid-cols-1 gap-2">
                    {goals.map((goal) => (
                        <button
                            key={goal.id}
                            onClick={() => updateData({ goal: goal.id })}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${data.goal === goal.id
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200'}`}
                        >
                            <div className={`p-2.5 rounded-xl ${goal.bg} ${goal.color}`}><goal.icon className="w-5 h-5" /></div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{goal.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <button
                disabled={!data.goal}
                onClick={onNext}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all"
            >
                Casi terminamos
            </button>
        </div>
    );
}

function ScheduleImageStep({ data, updateData, isProcessing, setIsProcessing, setExtractionError, onNext, onPrev, subjects, userId }: any) {
    return (
        <div className="space-y-6">
            <button onClick={onPrev} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl"><Camera className="text-indigo-600 w-6 h-6" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Foto de tu horario</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Vicente lo analizará mientras continúas</p>
                    </div>
                </div>

                <ScheduleScanner
                    userId={userId}
                    onProcessingChange={setIsProcessing}
                    onImageCaptured={(url) => updateData({ scheduleImage: url })}
                    onScheduleExtracted={(courses) => {
                        if (subjects.length === 1) {
                            updateData({ extractedCourses: courses.map((c: any) => ({ ...c, name: subjects[0] })) });
                        } else {
                            updateData({ extractedCourses: courses });
                        }
                    }}
                />
            </div>

            <button
                onClick={onNext}
                disabled={isProcessing}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold transition-all disabled:opacity-50"
            >
                {data.scheduleImage ? 'Continuar' : 'Omitir por ahora'}
            </button>
        </div>
    );
}


function CoursesReviewStep({ data, updateData, isProcessing, extractionError, onFinish, isLoading, onPrev, onRetry, subjects }: any) {
    return (
        <div className="space-y-6 py-2">
            <button onClick={onPrev} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-sm font-medium">
                <ChevronLeft className="w-4 h-4" /> Volver
            </button>

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl"><CheckCircle2 className="text-emerald-600 w-6 h-6" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tus cursos</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Revisa y confirma antes de entrar</p>
                    </div>
                </div>

                {isProcessing ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto" />
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300 animate-pulse">Vicente está leyendo tu horario...</p>
                        <p className="text-sm text-slate-500">Esto tomará solo unos segundos</p>
                    </motion.div>
                ) : data.extractedCourses.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            {data.extractedCourses.length} cursos detectados:
                        </p>
                        <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                            {data.extractedCourses.map((course: any, i: number) => (
                                <div key={i} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200 font-black shrink-0">{course.grade}</span>
                                        <input
                                            type="text"
                                            value={course.section || ''}
                                            placeholder="Sec."
                                            onChange={(e) => {
                                                const updated = [...data.extractedCourses];
                                                updated[i] = { ...updated[i], section: e.target.value.toUpperCase() };
                                                updateData({ extractedCourses: updated });
                                            }}
                                            className="w-12 text-xs text-center bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-1 rounded-lg text-indigo-700 dark:text-indigo-300 font-black border-2 border-indigo-300 dark:border-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
                                        />
                                        {subjects.length > 1 ? (
                                            <select
                                                value={course.name}
                                                onChange={(e) => {
                                                    const updated = [...data.extractedCourses];
                                                    updated[i] = { ...updated[i], name: e.target.value };
                                                    updateData({ extractedCourses: updated });
                                                }}
                                                className="flex-1 text-sm font-bold bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white min-w-0"
                                            >
                                                {!subjects.includes(course.name) && (
                                                    <option value={course.name}>{course.name} (detectado)</option>
                                                )}
                                                {subjects.map((s: string) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="flex-1 font-bold text-sm truncate min-w-0">{course.name}</span>
                                        )}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {course.schedule && (
                                                <span title={course.schedule} className="text-slate-400 hover:text-indigo-500 transition-colors cursor-help p-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                </span>
                                            )}
                                            <button
                                                onClick={() => updateData({ extractedCourses: data.extractedCourses.filter((_: any, idx: number) => idx !== i) })}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                title="Eliminar curso"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {extractionError && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-2">
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">⚠️ {extractionError}</p>
                                <button onClick={onRetry} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                                    Reintentar con otra foto
                                </button>
                            </div>
                        )}
                        <div className="text-center py-6 space-y-3">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                                <BookOpen className="text-slate-400 w-8 h-8" />
                            </div>
                            <p className="font-bold text-slate-600 dark:text-slate-300">No se detectaron cursos</p>
                            <p className="text-sm text-slate-400">Se crearán basados en tus asignaturas seleccionadas</p>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={onFinish}
                disabled={isLoading || isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl text-lg font-black shadow-xl shadow-indigo-200 dark:shadow-none transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none"
            >
                {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                    <>Entrar a mi Registro <Sparkles className="w-5 h-5" /></>
                )}
            </button>
        </div>
    );
}


