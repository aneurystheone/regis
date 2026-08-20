
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    MapPin,
    School,
    Calendar,
    ChevronRight,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Hash
} from 'lucide-react';
import { educationRegionals, getSchoolsForDistrict, calculateDeterministicSchoolId } from '../../constants/educationData';
import { TeacherProfileData, Class } from '../../types';
import { ScheduleScanner } from './ScheduleScanner';
import { api, getCurrentUserId } from '../../services/api';
import { generateId } from '@/utils';

interface SetupWizardProps {
    onClose: () => void;
    onComplete: () => void;
    profile: TeacherProfileData | null;
    onUpdateProfile: (updated: TeacherProfileData) => void;
    classes: Class[];
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
    onClose,
    onComplete,
    profile,
    onUpdateProfile,
    classes
}) => {
    const [step, setStep] = useState<'profile' | 'schedule'>(
        !profile?.schoolName || !profile?.regional ? 'profile' : 'schedule'
    );
    const [isSaving, setIsSaving] = useState(false);
    const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
    const [data, setData] = useState({
        regional: profile?.regional || '',
        district: profile?.district || '',
        schoolName: profile?.schoolName || '',
        schoolCode: profile?.schoolCode || '',
        referralCode: '',
    });

    const selectedRegional = educationRegionals.find(r => r.id === data.regional);
    const availableDistricts = selectedRegional ? selectedRegional.districts : [];

    const availableSchools = useMemo(() => {
        return data.district ? getSchoolsForDistrict(data.district) : [];
    }, [data.district]);

    const filteredSchools = useMemo(() => {
        if (!data.schoolName.trim()) return availableSchools;
        return availableSchools.filter(s =>
            s.name.toLowerCase().includes(data.schoolName.toLowerCase())
        );
    }, [availableSchools, data.schoolName]);

    const handleSaveProfile = async () => {
        if (profile) {
            const schoolId = calculateDeterministicSchoolId(data.district, data.schoolName, data.schoolCode);
            onUpdateProfile({
                ...profile,
                regional: data.regional,
                district: data.district,
                schoolName: data.schoolName,
                schoolCode: data.schoolCode,
                schoolId: schoolId
            });

            if (data.referralCode.trim()) {
                try {
                    await api.claimReferralCode(data.referralCode);
                } catch (err) {
                    console.warn('Referral claim in wizard note:', err);
                }
            }

            setStep('schedule');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/10">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            Completar Configuración <Sparkles className="w-5 h-5 text-indigo-500" />
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Solo unos pasos más para estar listo</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {step === 'profile' ? (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                                        <MapPin className="w-5 h-5" />
                                        <h3 className="font-bold">Datos de tu Centro</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">Regional</label>
                                            <select
                                                value={data.regional}
                                                onChange={(e) => setData({ ...data, regional: e.target.value, district: '' })}
                                                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-sm"
                                            >
                                                <option value="">Selecciona Regional</option>
                                                {educationRegionals.map(r => (
                                                    <option key={r.id} value={r.id}>{r.id} - {r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">Distrito</label>
                                            <select
                                                value={data.district}
                                                disabled={!data.regional}
                                                onChange={(e) => setData({ ...data, district: e.target.value })}
                                                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-bold text-sm disabled:opacity-50"
                                            >
                                                <option value="">Selecciona Distrito</option>
                                                {availableDistricts.map(d => (
                                                    <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">Centro Educativo</label>
                                        <div className="relative">
                                            <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Nombre de tu liceo o escuela"
                                                value={data.schoolName}
                                                onFocus={() => setShowSchoolDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowSchoolDropdown(false), 200)}
                                                onChange={(e) => setData({ ...data, schoolName: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-bold placeholder:text-slate-400"
                                            />
                                        </div>

                                        {/* Dropdown search suggestions */}
                                        {showSchoolDropdown && filteredSchools.length > 0 && (
                                            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-50 py-2">
                                                {filteredSchools.map((s, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setData({ ...data, schoolName: s.name, schoolCode: s.code })}
                                                        className="px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer font-bold text-sm text-slate-700 dark:text-slate-200 transition-colors flex justify-between items-center"
                                                    >
                                                        <span>{s.name}</span>
                                                        <span className="text-xs text-indigo-500 font-mono">Cod: {s.code}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block ml-1">Código de Centro</label>
                                        <div className="relative">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Código oficial (Ej. 1502001)"
                                                value={data.schoolCode}
                                                onChange={(e) => setData({ ...data, schoolCode: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-bold placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-indigo-500 uppercase tracking-widest block ml-1">Código de Referencia (Opcional)</label>
                                        <div className="relative">
                                            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                            <input
                                                type="text"
                                                placeholder="Ej. REGIS-DOC-8K9P00"
                                                value={data.referralCode}
                                                onChange={(e) => setData({ ...data, referralCode: e.target.value.toUpperCase() })}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 focus:ring-2 focus:ring-indigo-500 outline-none font-bold placeholder:text-indigo-400/50 uppercase tracking-wider text-indigo-900 dark:text-indigo-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={!data.schoolName || !data.regional || !data.district}
                                    onClick={handleSaveProfile}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    Siguiente <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="schedule"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4 text-center">
                                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto">
                                        <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Escanea tu Horario</h3>
                                    <p className="text-sm text-slate-500">Esto configurará tus clases automáticamente.</p>

                                    <div className="pt-4">
                                        <ScheduleScanner
                                            onScheduleExtracted={async (newClasses) => {
                                                setIsSaving(true);
                                                try {
                                                    const classColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#78716c'];
                                                    const currentYear = new Date().getFullYear();
                                                    const schoolYear = `${currentYear}-${currentYear + 1}`;
                                                    const classPromises = newClasses.map(async (c, index) => {
                                                        const newId = generateId('CLS');
                                                        const color = classColors[index % classColors.length];
                                                        return api.addClass({
                                                            name: c.name || 'Nueva Clase',
                                                            grade: c.grade || '1ro',
                                                            section: c.section || 'A',
                                                            level: 'Nivel Secundario',
                                                            color,
                                                            schoolYear,
                                                            schedule: c.schedule || 'Horario por definir',
                                                            id: newId,
                                                            userId: profile?.userId || getCurrentUserId() || '',
                                                            schemaVersion: 2,
                                                            createdAt: new Date().toISOString(),
                                                            updatedAt: new Date().toISOString()
                                                        } as Class);
                                                    });

                                                    // Await all promises to ensure local caching (IndexedDB/LocalStorage) succeeds
                                                    await Promise.all(classPromises);
                                                } catch (err) {
                                                    console.error("Error al guardar clases extraer:", err);
                                                } finally {
                                                    setIsSaving(false);
                                                    onComplete();
                                                }
                                            }}
                                            userId={profile?.userId || getCurrentUserId() || ''}
                                        />
                                    </div>

                                    <button
                                        onClick={onComplete}
                                        disabled={isSaving}
                                        className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Guardando clases...' : 'Omitir por ahora y terminar'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Steps indicator */}
                <div className="px-8 pb-8 flex items-center justify-center gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'profile' ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 'schedule' ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
                </div>
            </motion.div>
        </div>
    );
};
