import React, { useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { createPortalSession, openExternalUrl, redirectToCheckout } from '../services/stripe';
import { getCurrentUserId } from '../services/api';
import { SparklesIcon, CreditCardIcon, CheckIcon } from './icons';
import { useAlert } from '../contexts/ConfirmationContext';
import { ReferralModal } from './ReferralModal';
import { PRICING_PLANS } from '../config/pricing';
import { Gift, Zap, ShieldCheck, Star } from 'lucide-react';

export const SubscriptionManager: React.FC = () => {
    const { subscription, isPremium } = useSubscription();
    const [isLoading, setIsLoading] = useState(false);
    const [isReferralOpen, setIsReferralOpen] = useState(false);
    const alert = useAlert();

    const handleManageBilling = async () => {
        const userId = getCurrentUserId();
        if (!userId) return;

        setIsLoading(true);
        try {
            const { url } = await createPortalSession(userId);
            await openExternalUrl(url);
        } catch (error) {
            console.error('Error opening billing portal:', error);
            await alert({ title: 'Error', message: 'Error al abrir el portal de facturación. Intenta de nuevo.', type: 'danger' });
            setIsLoading(false);
        }
    };

    const handleUpgrade = async (priceId: string) => {
        const userId = getCurrentUserId();
        if (!userId) {
            await alert({ title: 'Atención', message: 'Debes iniciar sesión para mejorar tu plan', type: 'info' });
            return;
        }

        setIsLoading(true);
        try {
            await redirectToCheckout(priceId, userId);
        } catch (error) {
            console.error('Error during checkout:', error);
            await alert({ title: 'Error', message: 'Hubo un error al procesar tu pago. Por favor intenta de nuevo.', type: 'danger' });
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 px-2 sm:px-4">
            
            {/* Top Banner & Status Header */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-indigo-500/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-amber-300 border border-white/20">
                            <SparklesIcon className="w-3.5 h-3.5" />
                            {isPremium ? 'Suscripción Activa' : 'Plan Gratuito Activo'}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {isPremium ? 'Tu Plan Premium' : 'Potencia tu Aula con REGIS Premium'}
                        </h1>
                        <p className="text-sm text-indigo-200 max-w-md">
                            {isPremium
                                ? 'Tienes acceso ilimitado a IA Vicente, clases sin límite y exportación oficial de reportes.'
                                : 'Accede a IA Vicente sin restricciones y gestiona todas tus clases sin límites pedagógicos.'}
                        </p>
                    </div>

                    {/* Referrals CTA Button inside Banner */}
                    <button
                        onClick={() => setIsReferralOpen(true)}
                        className="py-3 px-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2.5 text-sm whitespace-nowrap"
                    >
                        <Gift className="w-5 h-5 text-slate-950" />
                        <span>Gana Meses Gratis</span>
                    </button>
                </div>

                {/* Expiration Info / Status */}
                {subscription.expiresAt && (
                    <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-indigo-200">
                        <span>Estado de renovación / vencimiento:</span>
                        <strong className="text-white font-mono">
                            {new Date(subscription.expiresAt).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </strong>
                    </div>
                )}
            </div>

            {/* Plans Comparison Grid - Optimized for Mobile */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Plan Gratuito Card */}
                <div className={`bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 transition-all flex flex-col justify-between ${!isPremium ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plan Gratuito</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Funciones core para aula</p>
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">$0</span>
                        </div>

                        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            <li className="flex items-center gap-2">
                                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span>Hasta <strong>10 clases activas</strong></span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span>10 extracciones de lista con IA / mes</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span>Registro offline de calificaciones y asistencia</span>
                            </li>
                        </ul>
                    </div>

                    {!isPremium && (
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 py-1.5 px-4 rounded-full">
                                ✓ Plan Actual
                            </span>
                        </div>
                    )}
                </div>

                {/* Plan Premium Card */}
                <div className={`bg-gradient-to-b from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-3xl p-6 border-2 transition-all flex flex-col justify-between ${isPremium ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-xl' : 'border-indigo-400'}`}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Plan Premium</h3>
                                    <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                                        Recomendado
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">IA Vicente & Clases Ilimitadas</p>
                            </div>
                            <div>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">$7</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">/mes</span>
                            </div>
                        </div>

                        <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                            <li className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 fill-current" />
                                <span><strong>Clases ilimitadas</strong> sin restricción</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 fill-current" />
                                <span><strong>IA Vicente ilimitada</strong> para reportes, listas y audios</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <span>Exportación oficial de reportes PDF pedagógicos</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500 flex-shrink-0 fill-current" />
                                <span>Soporte prioritario y backup continuo</span>
                            </li>
                        </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-indigo-200 dark:border-indigo-800">
                        {isPremium ? (
                            <button
                                onClick={handleManageBilling}
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-2xl shadow transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                            >
                                <CreditCardIcon className="w-4 h-4" />
                                {isLoading ? 'Cargando...' : 'Gestionar Facturación / Cancelar'}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleUpgrade(PRICING_PLANS.find(p => p.tier === 'premium')?.stripePriceId || '')}
                                disabled={isLoading}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 text-sm disabled:opacity-50"
                            >
                                {isLoading ? 'Cargando...' : 'Mejorar a Plan Premium por $7/mes'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Referrals Modal */}
            <ReferralModal
                isOpen={isReferralOpen}
                onClose={() => setIsReferralOpen(false)}
            />
        </div>
    );
};
