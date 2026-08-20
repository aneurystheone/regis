import { useState, useEffect } from 'react';
import { api, syncEvents, type SyncStatus } from '../services/api';

export const useGradeSyncStatus = () => {
    const [status, setStatus] = useState<SyncStatus>(syncEvents.status);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        // Subscribe to global sync events from api.ts
        const unsubscribeSync = syncEvents.subscribe((newStatus) => {
            setStatus(newStatus);
        });

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribeSync();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const label = isOffline ? 'Sin conexión' :
        status === 'syncing' ? 'Guardando...' :
            status === 'synced' ? 'Guardado' :
                status === 'error' ? 'Error' : 'Listo';

    const iconState = isOffline ? 'offline' : status;

    return { status, isOffline, label, iconState };
};

/**
 * Global hook to warn users if they try to close the tab while syncing.
 * Best used in the root App component.
 */
export const useUnsavedChangesWarning = () => {
    useEffect(() => {
        let currentStatus: SyncStatus = syncEvents.status;

        const unsubscribe = syncEvents.subscribe((status) => {
            currentStatus = status;
        });

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (currentStatus === 'syncing' || currentStatus === 'error') {
                const message = "Tienes cambios pendientes de subir a la nube. Si sales ahora, se guardarán localmente pero no estarán en otros dispositivos.";
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
};
