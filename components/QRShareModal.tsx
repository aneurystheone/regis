import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { XIcon, DownloadIcon, ShareIcon, CheckIcon } from './icons';

interface QRShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    url?: string;
    title?: string;
}

export const QRShareModal: React.FC<QRShareModalProps> = ({
    isOpen,
    onClose,
    url = 'https://regis-app.com',
    title = 'Compartir REGIS'
}) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            QRCode.toDataURL(url, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#4f46e5', // Brand primary indigo-600
                    light: '#ffffff'
                }
            })
                .then(setQrDataUrl)
                .catch(err => console.error('Error generating QR code:', err));
        }
    }, [isOpen, url]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = `regis-qr-${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        const shareData = {
            title: 'REGIS - Registro Escolar',
            text: 'Gestiona tu aula de forma inteligente con REGIS.',
            url: url
        };

        try {
            // Check if Web Share API is available and if it's a mobile/secure context
            // navigator.canShare might not be present in some browsers even if navigator.share is
            if (typeof navigator.share === 'function') {
                const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;

                if (canShare) {
                    await navigator.share(shareData);
                    return;
                }
            }

            // Fallback for browsers without Web Share or where canShare returns false
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err: any) {
            // Don't show error if user cancelled the share sheet or if it's an AbortError
            if (err.name !== 'AbortError') {
                console.error('Error sharing:', err);
                // Last resort fallback
                try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch (clipErr) {
                    console.error('Clipboard fallback failed:', clipErr);
                }
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-xs sm:max-w-sm rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <ShareIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">{title}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 sm:p-6 flex flex-col items-center">
                            <div className="relative group p-3 bg-white rounded-2xl shadow-inner border border-slate-100 dark:border-slate-800 mb-3">
                                {qrDataUrl ? (
                                    <img
                                        src={qrDataUrl}
                                        alt="QR Code"
                                        className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg animate-in fade-in duration-500"
                                    />
                                ) : (
                                    <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
                                        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none">
                                    <img src="/logo.avif" alt="" className="w-8 h-8 opacity-20" />
                                </div>
                            </div>

                            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[220px]">
                                Escanea este código para acceder rápidamente a la plataforma.
                            </p>

                            <div className="grid grid-cols-1 w-full gap-2.5">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-95"
                                >
                                    <DownloadIcon className="w-4 h-4" />
                                    Descargar QR
                                </button>

                                <button
                                    onClick={handleShare}
                                    className={`flex items-center justify-center gap-2 w-full py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 ${copied
                                        ? 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-none'
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <CheckIcon className="w-4 h-4" />
                                            ¡Enlace copiado!
                                        </>
                                    ) : (
                                        <>
                                            <ShareIcon className="w-4 h-4" />
                                            Compartir Enlace
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                regis-app.com
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
