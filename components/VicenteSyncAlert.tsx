
import React, { useState, useEffect } from 'react';
import { syncEvents } from '../services/api';
import { ExclamationIcon, XIcon, SparklesIcon } from './icons';
import { Avatar } from './Avatar';

export const VicenteSyncAlert: React.FC = () => {
    const [hasSyncError, setHasSyncError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = syncEvents.subscribe((error) => {
            setHasSyncError(error);
            if (error) setIsVisible(true);
        });
        return unsubscribe;
    }, []);

    if (!isVisible || !hasSyncError) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-lg animate-fade-in-up">
            <div className="bg-brand-primary text-white p-5 rounded-3xl shadow-2xl border border-brand-accent/30 flex items-start gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30">
                    <Avatar name="Vicente" size="md" className="w-10 h-10 rounded-xl" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-brand-accent text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" /> Vicente informa
                    </h4>
                    <p className="text-xs font-medium leading-relaxed opacity-90">
                        "Hola colega, he notado un problema con los permisos de la nube. Por ahora, estoy guardando todo <strong>solo en este dispositivo</strong> para que no pierdas nada. ¡Sigue trabajando con confianza!"
                    </p>
                    <div className="mt-3 flex gap-2">
                        <a
                            href="https://console.firebase.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                        >
                            REVISAR REGLAS
                        </a>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-[10px] font-black px-3 py-1.5 rounded-lg opacity-60 hover:opacity-100"
                        >
                            ENTENDIDO
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <XIcon className="w-4 h-4 opacity-50" />
                </button>
            </div>

            <div className="mt-2 bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 p-2 rounded-xl text-[9px] text-yellow-600 dark:text-yellow-400 font-bold text-center uppercase tracking-tighter">
                Nota técnica: Asegúrate de que las reglas de Firestore permitan lectura/escritura a usuarios autenticados.
            </div>
        </div>
    );
};
