import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { api, getCurrentUserId } from '../services/api';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAlert } from '../contexts/ConfirmationContext';
import { SparklesIcon, XIcon, CheckIcon, ShareIcon } from './icons';
import { Capacitor } from '@capacitor/core';
import { MessageCircle, QrCode, Copy, Send } from 'lucide-react';

interface ReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose }) => {
    const { subscription } = useSubscription();
    const alert = useAlert();
    const [referralCode, setReferralCode] = useState<string>('');
    const [inputCode, setInputCode] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'share' | 'qr' | 'claim'>('share');

    useEffect(() => {
        if (!isOpen) return;
        const loadCode = async () => {
            const uid = getCurrentUserId();
            if (uid) {
                const code = await api.getOrCreateReferralCode(uid);
                setReferralCode(code);
            }
        };
        loadCode();
    }, [isOpen]);

    useEffect(() => {
        if (referralCode && isOpen) {
            const shareUrl = `https://regis-app.com/signup?ref=${referralCode}`;
            QRCode.toDataURL(shareUrl, {
                width: 260,
                margin: 2,
                color: {
                    dark: '#4f46e5',
                    light: '#ffffff'
                }
            })
                .then(setQrDataUrl)
                .catch(err => console.error('Error generating QR code:', err));
        }
    }, [referralCode, isOpen]);

    if (!isOpen) return null;

    const shareMessage = `¡Hola! Te invito a probar REGIS, la app de gestión docente. Usa mi código de referencia ${referralCode} para obtener 1 mes GRATIS de Plan Premium: https://regis-app.com/signup?ref=${referralCode}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Clipboard error:', err);
        }
    };

    const handleWhatsAppShare = () => {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleNativeShare = async () => {
        try {
            const nativeShare = (Capacitor as any).Plugins?.Share;
            if (Capacitor.isNativePlatform() && nativeShare) {
                await nativeShare.share({
                    title: 'REGIS - Programa de Referencias',
                    text: shareMessage,
                    dialogTitle: 'Compartir código con un Docente'
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: 'REGIS - Programa de Referencias',
                    text: shareMessage,
                });
            } else {
                await handleCopy();
            }
        } catch (err) {
            console.error('Native share error:', err);
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
                onClose();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 text-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-indigo-500/30 flex flex-col max-h-[90vh]">
                
                {/* Header with Gradient */}
                <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 flex items-center justify-between border-b border-indigo-500/20 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                            <SparklesIcon className="w-6 h-6 text-amber-300 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Programa de Referencias</h3>
                            <p className="text-xs text-indigo-200">Gana +30 días de Plan Premium por cada referido</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-indigo-200 hover:text-white transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub Navigation Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1">
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'share'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <Send className="w-3.5 h-3.5" />
                        Compartir
                    </button>
                    <button
                        onClick={() => setActiveTab('qr')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'qr'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <QrCode className="w-3.5 h-3.5" />
                        Código QR
                    </button>
                    <button
                        onClick={() => setActiveTab('claim')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'claim'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <SparklesIcon className="w-3.5 h-3.5 text-amber-300" />
                        Canjear
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* Tab 1: Share via WhatsApp & Apps */}
                    {activeTab === 'share' && (
                        <div className="space-y-5 animate-fadeIn">
                            {/* Code Card */}
                            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 text-center">
                                <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Tu Código Único</span>
                                <div className="text-2xl font-black text-amber-300 font-mono tracking-widest my-1">
                                    {referralCode || 'Cargando...'}
                                </div>
                                <p className="text-xs text-slate-400">
                                    Comparte este código con cualquier Docente para que ambos ganen 1 mes de Plan Premium.
                                </p>
                            </div>

                            {/* Share Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={handleWhatsAppShare}
                                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 text-sm"
                                >
                                    <MessageCircle className="w-5 h-5 fill-current" />
                                    Enviar por WhatsApp
                                </button>
                                <button
                                    onClick={handleNativeShare}
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 text-sm"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                    Otras Aplicaciones
                                </button>
                            </div>

                            <button
                                onClick={handleCopy}
                                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-xs"
                            >
                                {copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copied ? '¡Copiado al Portapapeles!' : 'Copiar Enlace de Invitación'}
                            </button>
                        </div>
                    )}

                    {/* Tab 2: QR Code */}
                    {activeTab === 'qr' && (
                        <div className="space-y-4 text-center animate-fadeIn">
                            <p className="text-xs text-indigo-200 font-medium">
                                Muestra este código QR para que otro Docente lo escanee en persona con su teléfono:
                            </p>
                            
                            <div className="p-4 bg-white rounded-3xl inline-block shadow-xl border-4 border-indigo-500/20">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} alt="Código QR de Referencia" className="w-52 h-52 mx-auto" />
                                ) : (
                                    <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                                        Generando QR...
                                    </div>
                                )}
                            </div>

                            <div className="text-xs font-mono text-amber-300 bg-slate-950 py-1.5 px-3 rounded-xl inline-block border border-slate-800">
                                {referralCode}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Claim Code */}
                    {activeTab === 'claim' && (
                        <div className="space-y-4 animate-fadeIn">
                            {!subscription.referralClaimed ? (
                                <form onSubmit={handleClaimCode} className="space-y-4">
                                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                                        <label className="block text-xs uppercase tracking-wider text-indigo-300 font-bold mb-2">
                                            Ingresa el Código de Referencia
                                        </label>
                                        <input
                                            type="text"
                                            value={inputCode}
                                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                            placeholder="Ej. REGIS-DOC-8K9P00"
                                            className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono tracking-wider text-lg"
                                            maxLength={20}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !inputCode.trim()}
                                        className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl shadow-xl transition-all disabled:opacity-50 text-sm"
                                    >
                                        {isSubmitting ? 'Verificando...' : 'Obtener 30 Días Gratis'}
                                    </button>
                                </form>
                            ) : (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2">
                                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                        <CheckIcon className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-white text-base">¡Código Canjeado previamente!</h4>
                                    <p className="text-xs text-slate-300">
                                        Ya has recibido el beneficio de bienvenida de referidos en tu cuenta. ¡Invita a más colegas para seguir acumulando meses!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-300">
                    <span>Docentes referidos: <strong className="text-white text-sm">{subscription.referralsCount || 0}</strong></span>
                    <span className="text-amber-300 font-bold">+30 días por referido</span>
                </div>
            </div>
        </div>
    );
};
