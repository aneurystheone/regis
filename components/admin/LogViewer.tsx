
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase-firestore';
import { api } from '../../services/api';
import { Avatar } from '../Avatar';
import { TrashIcon, ArrowPathIcon, ExclamationIcon, CheckIcon, ClockIcon, UserIcon, ServerIcon } from '../icons';
import { useConfirm } from '../../contexts/ConfirmationContext';

// Module-level in-memory cache for teacher profiles to prevent duplicate Firestore reads
const profileCache: Record<string, { name: string; email: string }> = {
    DEMO_GUEST_USER: { name: 'Invitado Demo', email: 'demo@regis.app' }
};

export const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [userProfiles, setUserProfiles] = useState<Record<string, { name: string, email: string }>>(() => ({ ...profileCache }));
    const [isLoading, setIsLoading] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    const confirm = useConfirm();

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await api.getSystemLogs(100);
            setLogs(data);

            const userIds = Array.from(new Set(data.map(l => l.userId).filter(Boolean)));
            const missingUids = userIds.filter(uid => !profileCache[uid]);

            if (missingUids.length > 0) {
                await Promise.all(missingUids.map(async (uid) => {
                    try {
                        const docSnap = await getDoc(doc(db, 'teacher_profile', uid));
                        if (docSnap.exists()) {
                            const p = docSnap.data();
                            profileCache[uid] = {
                                name: p.name || p.displayName || 'Docente',
                                email: p.email || ''
                            };
                        } else {
                            profileCache[uid] = { name: uid, email: '' };
                        }
                    } catch {
                        profileCache[uid] = { name: uid, email: '' };
                    }
                }));
            }

            setUserProfiles({ ...profileCache });
        } catch (error) {
            console.error("Error fetching system logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        const isConfirmed = await confirm({
            title: 'Borrar Logs',
            message: '¿Estás seguro de que deseas borrar todos los logs del sistema? Esta acción no se puede deshacer.',
            type: 'danger',
            confirmText: 'Borrar todo'
        });
        if (!isConfirmed) return;
        setIsClearing(true);
        await api.clearSystemLogs();
        setLogs([]);
        setIsClearing(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'N/A';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleString();
    };

    if (isLoading && logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Cargando telemetría del sistema...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ServerIcon className="w-6 h-6 text-indigo-500" />
                        Telemetría y Logs
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Monitoreo en tiempo real de errores y persistencia</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        disabled={isLoading}
                        className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95 disabled:opacity-50"
                        title="Actualizar"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={isClearing || logs.length === 0}
                        className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95 disabled:opacity-50"
                        title="Borrar todo"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl bg-white dark:bg-slate-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Evento</th>
                                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Contexto</th>
                                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Docente</th>
                                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Estado</th>
                                <th className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">Fecha/Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {logs.map((log) => {
                                const profile = userProfiles[log.userId] || {
                                    name: log.userId || 'Sin identificar',
                                    email: ''
                                };
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-4 max-w-xs">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 break-words">{log.errorMessage}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-1">{log.errorCode}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[11px] font-bold uppercase tracking-wider">{log.context}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3" title={`Docente ID: ${log.userId || 'N/A'}`}>
                                                <Avatar name={profile.name} size="sm" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                                                        {profile.name}
                                                    </span>
                                                    {profile.email ? (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {profile.email}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                            {log.userId ? log.userId.slice(-8) : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-1.5">
                                            {log.offline ? (
                                                <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs font-bold">
                                                    <ClockIcon className="w-3 h-3" /> Offline
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 text-xs font-bold">
                                                    <CheckIcon className="w-3 h-3" /> Live
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                        {formatTimestamp(log.timestamp)}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
                {logs.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <CheckIcon className="w-12 h-12 mx-auto mb-4 opacity-20 text-emerald-500" />
                        <p className="font-medium">No se han registrado errores recientemente.</p>
                        <p className="text-xs">El sistema se encuentra estable.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Placeholder icons if missing in components/icons.tsx
const DevicePhoneMobileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
);
