
import React, { useEffect, useState, useMemo } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { api } from '../services/api';
import { APP_VERSION } from '../types';
import { SparklesIcon, XIcon, ArrowPathIcon } from './icons';
import { Avatar } from './Avatar';

export const UpdatePrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ', r);
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false);
    const [remoteVersion, setRemoteVersion] = useState<string>('');
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Only check for remote version periodically or on mount
        const checkVersion = async () => {
            try {
                const latest = await api.getLatestVersion();
                console.log('UpdatePrompt: Version Check', {
                    APP_VERSION,
                    latest,
                    mismatch: latest !== APP_VERSION,
                    needRefresh
                });

                if (latest && latest !== APP_VERSION) {
                    setRemoteVersion(latest);
                    setHasRemoteUpdate(true);
                } else {
                    setHasRemoteUpdate(false);
                }
            } catch (err) {
                console.error("UpdatePrompt: Failed to check version", err);
            }
        };

        checkVersion();
        const interval = setInterval(checkVersion, 1000 * 60 * 15); // Check every 15 mins
        return () => clearInterval(interval);
    }, []);

    // Check if we should suppress the prompt due to session dismissal
    const isSessionDismissed = useMemo(() => {
        const dismissed = sessionStorage.getItem('regis_update_dismissed');
        // If we have a remote version, check if IT was dismissed
        if (remoteVersion && dismissed === remoteVersion) return true;
        // If we only have a SW update (needRefresh), check if "SW" was dismissed
        if (needRefresh && dismissed === 'SW_NEED_REFRESH') return true;
        return false;
    }, [remoteVersion, needRefresh]);

    const handleRefresh = () => {
        console.log('UpdatePrompt: Handling Refresh Request', { needRefresh, remoteVersion });

        if (remoteVersion) {
            sessionStorage.setItem('regis_update_dismissed', remoteVersion);
        } else if (needRefresh) {
            sessionStorage.setItem('regis_update_dismissed', 'SW_NEED_REFRESH');
        }

        if (needRefresh) {
            updateServiceWorker(true);
        } else {
            window.location.reload();
        }
    };

    const close = () => {
        if (remoteVersion) {
            sessionStorage.setItem('regis_update_dismissed', remoteVersion);
        } else {
            sessionStorage.setItem('regis_update_dismissed', 'SW_NEED_REFRESH');
        }
        setOfflineReady(false);
        setNeedRefresh(false);
        setHasRemoteUpdate(false);
        setIsDismissed(true);
    };

    if (isDismissed || isSessionDismissed || (!needRefresh && !offlineReady && !hasRemoteUpdate)) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] w-[90%] max-w-sm animate-fade-in-up">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-brand-primary/10 transition-colors" />

                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                        <Avatar name="Vicente" size="md" className="w-10 h-10 rounded-xl" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight flex items-center gap-2">
                            {needRefresh || hasRemoteUpdate ? (
                                <>
                                    <SparklesIcon className="w-4 h-4 text-brand-secondary" />
                                    ¡Nueva versión disponible!
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-4 h-4 text-emerald-500" />
                                    Regis listo para usar offline
                                </>
                            )}
                        </h4>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                            {needRefresh || hasRemoteUpdate
                                ? `Hay una actualización disponible (${remoteVersion || 'Nuevas mejoras'}). Refresca para disfrutar de las novedades.`
                                : "La aplicación se ha descargado correctamente. ¡Ahora puedes usar Regis sin conexión a internet!"}
                        </p>

                        <div className="mt-4 flex gap-2">
                            {(needRefresh || hasRemoteUpdate) ? (
                                <button
                                    onClick={handleRefresh}
                                    className="flex-1 flex items-center justify-center gap-2 bg-brand-primary text-white text-[11px] font-black py-2.5 rounded-xl hover:bg-brand-secondary transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
                                >
                                    <ArrowPathIcon className="w-3.5 h-3.5" />
                                    ACTUALIZAR AHORA
                                </button>
                            ) : (
                                <button
                                    onClick={close}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-black py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                                >
                                    ENTENDIDO
                                </button>
                            )}

                            {(needRefresh || hasRemoteUpdate) && (
                                <button
                                    onClick={close}
                                    className="px-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
                                    title="Cerrar"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
