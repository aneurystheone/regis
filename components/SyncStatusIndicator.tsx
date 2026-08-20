
import React, { useState, useEffect } from 'react';
import { syncEvents, SyncStatus } from '../services/api';
import { CloudIcon, CheckIcon, AlertCircleIcon, WifiOffIcon } from './icons';

export const SyncStatusIndicator: React.FC = () => {
    const [status, setStatus] = useState<SyncStatus>(syncEvents.status);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [showSynced, setShowSynced] = useState(false);

    useEffect(() => {
        const unsubscribe = syncEvents.subscribe((newStatus) => {
            setStatus(newStatus);
            if (newStatus === 'synced') {
                setLastSynced(new Date());
                setShowSynced(true);
                // Hide success message after 3 seconds
                const timer = setTimeout(() => setShowSynced(false), 3000);
                return () => clearTimeout(timer);
            }
        });

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOnline) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-[10px] font-bold border border-orange-200 dark:border-orange-800/50 animate-pulse">
                <WifiOffIcon className="w-3.5 h-3.5" />
                <span>MODO OFFLINE (SEGURO)</span>
            </div>
        );
    }

    if (status === 'syncing') {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800/50">
                <CloudIcon className="w-3.5 h-3.5 animate-bounce" />
                <span>SINCRONIZANDO...</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-800/50">
                <AlertCircleIcon className="w-3.5 h-3.5" />
                <span>ERROR DE NUBE (VÉASE VICENTE)</span>
            </div>
        );
    }

    if (showSynced) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] font-bold border border-green-200 dark:border-green-800/50 animate-fade-in">
                <CheckIcon className="w-3.5 h-3.5" />
                <span>SINCRONIZADO</span>
            </div>
        );
    }

    // Idle/Synced state (minimized)
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800/30 dark:text-gray-500 text-[10px] font-medium border border-gray-200 dark:border-gray-700/30 opacity-60 hover:opacity-100 transition-opacity cursor-default">
            <CloudIcon className="w-3.5 h-3.5" />
            <span className="uppercase tracking-tighter">Nube activa</span>
        </div>
    );
};
