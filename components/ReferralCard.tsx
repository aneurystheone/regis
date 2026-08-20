import React, { useState, useEffect } from 'react';
import { api, getCurrentUserId } from '../services/api';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAlert } from '../contexts/ConfirmationContext';
import { SparklesIcon } from './icons';
import { Capacitor } from '@capacitor/core';

export const ReferralCard: React.FC = () => {
    const { subscription } = useSubscription();
    const alert = useAlert();
    const [referralCode, setReferralCode] = useState<string>('');
    const [inputCode, setInputCode] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        const loadCode = async () => {
            const uid = getCurrentUserId();
            if (uid) {
                const code = await api.getOrCreateReferralCode(uid);
                setReferralCode(code);
            }
        };
        loadCode();
    }, []);

    const handleShare = async () => {
        const shareMessage = `¡Hola! Te invito a probar REGIS, la app de gestión docente. Usa mi código de referencia ${referralCode} para obtener 1 mes gratis de Plan Premium.`;
        
        try {
            const nativeShare = (Capacitor as any).Plugins?.Share;
            if (Capacitor.isNativePlatform() && nativeShare) {
                await nativeShare.share({
                    title: 'REGIS - Recomienda a un Docente',
                    text: shareMessage,
                    dialogTitle: 'Compartir código de referencia'
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: 'REGIS - Recomienda a un Docente',
                    text: shareMessage,
                });
            } else {
                await navigator.clipboard.writeText(shareMessage);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            }
        } catch (err) {
            // Fallback to clipboard if share was cancelled or unavailable
            try {
                await navigator.clipboard.writeText(shareMessage);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            } catch (clipErr) {
                console.error('Share/Copy error:', clipErr);
            }
        }
    };

    const handleClaimCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputCode.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await api.claimReferralCode(inputCode);
            if (result.success) {
                await alert({ title: '¡Felicidades!', message: result.message, type: 'info' });
                setInputCode('');
            } else {
                await alert({ title: 'Atención', message: result.message, type: 'danger' });
            }
        } catch (error: any) {
            await alert({ title: 'Error', message: error?.message || 'No se pudo canjear el código.', type: 'danger' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/30 relative overflow-hidden my-6">
            {/* Background Accent Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                        <SparklesIcon className="w-6 h-6 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">Programa de Referencias</h3>
                        <p className="text-sm text-indigo-200">
                            Invita a otros Docentes y gana 1 mes gratis de Plan Premium por cada referido.
                        </p>
                    </div>
                </div>

                {/* Section 1: Own Referral Code */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">Tu Código de Referencia</span>
                        <div className="text-2xl font-black tracking-widest text-amber-300 mt-0.5">
                            {referralCode || 'Cargando...'}
                        </div>
                    </div>
                    <button
                        onClick={handleShare}
                        disabled={!referralCode}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>{copied ? '¡Copiado al Portapapeles!' : 'Compartir Código'}</span>
                    </button>
                </div>

                {/* Section 2: Claim Code Form (If not already claimed) */}
                {!subscription.referralClaimed ? (
                    <form onSubmit={handleClaimCode} className="pt-2 border-t border-white/10">
                        <label className="block text-xs uppercase tracking-wider text-indigo-200 font-semibold mb-2">
                            ¿Tienes un código de referencia de otro Docente?
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                placeholder="Ej. REGIS-DOC-8K9P00"
                                className="flex-1 bg-slate-900/60 border border-indigo-400/30 rounded-xl px-4 py-2.5 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono tracking-wider"
                                maxLength={20}
                            />
                            <button
                                type="submit"
                                disabled={isSubmitting || !inputCode.trim()}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Canjeando...' : 'Canjear Código'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-3 text-emerald-200 text-sm text-center font-medium">
                        ✓ Ya has canjeado un código de referencia anteriormente. ¡Sigue invitando colegas para ganar más meses!
                    </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-indigo-300 pt-2">
                    <span>Docentes referidos: <strong className="text-white text-sm">{subscription.referralsCount || 0}</strong></span>
                    <span>Beneficio: <strong className="text-amber-300 text-sm">+30 días de Plan Premium</strong></span>
                </div>
            </div>
        </div>
    );
};
