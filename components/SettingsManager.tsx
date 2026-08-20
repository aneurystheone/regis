import React, { useState, Suspense } from 'react';
import { SunIcon, MoonIcon } from './icons';
import { type FontSize, type AIFeatures, type Student, type Class, APP_VERSION } from '../types';
import { RecycleBin } from './RecycleBin';
import { useAdmin } from '../hooks/useAdmin';
import { PricingPlans } from './PricingPlans';
import { SubscriptionManager } from './SubscriptionManager';
import { MONETIZATION_ENABLED } from '../config/phases';
import { useRemoteConfig } from '../hooks/useRemoteConfig';
import { useConfirm, usePrompt } from '../contexts/ConfirmationContext';

// Lazy load Admin components
const AISettings = React.lazy(() => import('./admin/AISettings'));

interface SettingsManagerProps {
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    aiFeatures: AIFeatures;
    setAiFeatures: (features: AIFeatures) => void;
    currentUserEmail?: string;
    // Recycle Bin Props
    deletedStudents: Student[];
    classes: Class[];
    onRestore: (studentId: string) => void;
    onPermanentDelete: (student: Student) => void;
    deletedClasses?: Class[];
    onRestoreClass?: (classId: string) => void;
    onPermanentDeleteClass?: (cls: Class) => void;
    onPermanentDeleteBulk?: (students: Student[]) => void;
    onPermanentDeleteClassesBulk?: (classes: Class[]) => void;
    onDeleteAccount: () => void;
    initialTab?: 'appearance' | 'subscription' | 'ai' | 'recycle_bin' | 'account';
}

const FontSizeButton: React.FC<{
    label: string;
    size: FontSize;
    currentSize: FontSize;
    onClick: (size: FontSize) => void;
}> = ({ label, size, currentSize, onClick }) => (
    <button
        onClick={() => onClick(size)}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${size === currentSize
            ? 'bg-brand-primary text-white shadow'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
            }`}
    >
        {label}
    </button>
);

export const SettingsManager: React.FC<SettingsManagerProps> = ({
    isDarkMode,
    setIsDarkMode,
    fontSize,
    setFontSize,
    aiFeatures,
    setAiFeatures,
    deletedStudents,
    classes,
    onRestore,
    onPermanentDelete,
    deletedClasses = [],
    onRestoreClass,
    onPermanentDeleteClass,
    onPermanentDeleteBulk,
    onPermanentDeleteClassesBulk,
    onDeleteAccount,
    initialTab = 'appearance'
}) => {
    const [activeTab, setActiveTab] = useState<'appearance' | 'subscription' | 'recycle_bin' | 'account'>(initialTab);
    const { isAdmin, loading: adminLoading } = useAdmin();
    const { monetizationEnabled } = useRemoteConfig();
    const isMonetizationEnabled = monetizationEnabled ?? MONETIZATION_ENABLED;
    const confirm = useConfirm();
    const prompt = usePrompt();

    return (
        <div className="p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-wrap gap-2 mb-8 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'appearance' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        Apariencia
                    </button>
                    {isMonetizationEnabled && (
                        <button
                            onClick={() => setActiveTab('subscription')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'subscription' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        >
                            Suscripción
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('recycle_bin')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'recycle_bin' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        Papelera
                    </button>
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'account' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        Cuenta
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Appearance Section */}
                    {activeTab === 'appearance' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Apariencia</h2>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Modo Oscuro</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Reduce el brillo para una visualización más cómoda.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <SunIcon className={`w-6 h-6 ${!isDarkMode ? 'text-brand-primary' : 'text-slate-400'}`} />
                                        <button
                                            onClick={() => setIsDarkMode(!isDarkMode)}
                                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary ${isDarkMode ? 'bg-brand-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            role="switch"
                                            aria-checked={isDarkMode}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}
                                            />
                                        </button>
                                        <MoonIcon className={`w-6 h-6 ${isDarkMode ? 'text-brand-primary' : 'text-slate-400'}`} />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tamaño del Texto</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Ajuste el tamaño del texto para una mejor lectura.</p>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        <FontSizeButton label="Pequeño" size="sm" currentSize={fontSize} onClick={setFontSize} />
                                        <FontSizeButton label="Normal" size="base" currentSize={fontSize} onClick={setFontSize} />
                                        <FontSizeButton label="Grande" size="lg" currentSize={fontSize} onClick={setFontSize} />
                                    </div>
                                </div>

                                {localStorage.getItem('regis_virtual_demo') === 'true' && (
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t border-rose-100 dark:border-rose-900/30 pt-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">Restablecer Datos Demo</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Borra todos los cambios locales y recarga el perfil original.</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const isConfirmed = await confirm({
                                                    title: 'Restablecer Demo',
                                                    message: '¿Estás seguro de que quieres restablecer todos los datos del demo? Se perderán todos tus cambios locales.',
                                                    type: 'danger',
                                                    confirmText: 'Restablecer',
                                                });
                                                if (isConfirmed) {
                                                    localStorage.clear();
                                                    window.location.reload();
                                                }
                                            }}
                                            className="px-6 py-2.5 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 font-bold rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-sm"
                                        >
                                            Restablecer Demo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Subscription Section */}
                    {isMonetizationEnabled && activeTab === 'subscription' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Suscripción</h2>
                            <div className="space-y-6">
                                <SubscriptionManager />
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                    <PricingPlans />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Features Section (Lazy Loaded) */}
                    {activeTab === 'ai' && isAdmin && (
                        <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">Cargando módulo de administración...</div>}>
                            <AISettings aiFeatures={aiFeatures} setAiFeatures={setAiFeatures} />
                        </Suspense>
                    )}

                    {/* Recycle Bin Section */}
                    {activeTab === 'recycle_bin' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Papelera de Reciclaje</h2>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <RecycleBin
                                    deletedStudents={deletedStudents}
                                    classes={classes}
                                    onRestore={onRestore}
                                    onPermanentDelete={onPermanentDelete}
                                    deletedClasses={deletedClasses}
                                    onRestoreClass={onRestoreClass}
                                    onPermanentDeleteClass={onPermanentDeleteClass}
                                    onPermanentDeleteBulk={onPermanentDeleteBulk}
                                    onPermanentDeleteClassesBulk={onPermanentDeleteClassesBulk}
                                />
                            </div>
                        </div>
                    )}

                    {/* Account Section */}
                    {activeTab === 'account' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Cuenta</h2>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 space-y-6">
                                <div className="border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-900/20 p-4 rounded-r-lg">
                                    <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">Zona de Peligro</h3>
                                    <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1 mb-4">
                                        Estas acciones son destructivas y no se pueden deshacer.
                                    </p>

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Eliminar Cuenta</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Elimina permanentemente tu cuenta y todos tus datos.</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const isConfirmed = await confirm({
                                                    title: 'Eliminar Cuenta',
                                                    message: '¿ESTÁS SEGURO? Esta acción eliminará permanentemente tu cuenta y TODOS tus datos. No se puede deshacer.',
                                                    type: 'danger',
                                                    confirmText: 'Continuar',
                                                });
                                                if (isConfirmed) {
                                                    const verification = await prompt({
                                                        title: 'Confirmación requerida',
                                                        message: 'Para confirmar, escribe "ELIMINAR" en mayúsculas:',
                                                        promptPlaceholder: 'ELIMINAR',
                                                        type: 'danger',
                                                        confirmText: 'Confirmar eliminación'
                                                    });
                                                    if (verification === 'ELIMINAR') {
                                                        onDeleteAccount();
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors"
                                        >
                                            Eliminar Cuenta
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    {APP_VERSION}
                </p>
            </div>
        </div >
    );
};
