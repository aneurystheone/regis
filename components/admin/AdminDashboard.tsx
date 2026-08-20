import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase-firestore';

import { UsageSession } from '../../services/usageService';
import { Avatar } from '../Avatar';
import AISettings from './AISettings';
import { CurriculumManagement } from './CurriculumManagement';
import { LogViewer } from './LogViewer';
import type { AIFeatures, UserSubscription, SubscriptionTier } from '../../types';
import { APP_VERSION } from '../../types';
import { ChartBarIcon, CogIcon, ServerIcon, ClipboardCheckIcon, UserGroupIcon, SearchIcon, ExclamationIcon, SparklesIcon } from '../icons';
import { Users, Clock, Cloud, Activity, AlertTriangle, Zap, ShieldCheck, RefreshCw, CreditCard } from 'lucide-react';
import { useAlert, useConfirm } from '../../contexts/ConfirmationContext';
import { CLOUD_FUNCTIONS_CATALOG, EXTERNAL_INTEGRATIONS, getFunctionUrl } from '../../config/endpoints';

type SystemLogMock = {
    id: string;
    type: 'PERFORMANCE_ALERT' | 'ORPHAN_WRITE_ATTEMPT';
    timestamp: Date;
    metadata?: any;
};

interface TeacherAggregation {
    userId: string;
    activeDays: number;
    flowsUsed: Set<string>;
    lastDate: string;
    assisted: boolean;
    latestSessionId: string;
    offlineCount: number;
    lastFlow: string;
    flowHistory: { date: string, flows: string[] }[];
}

interface AdminDashboardProps {
    aiFeatures?: AIFeatures;
    setAiFeatures: (features: AIFeatures) => void;
    userId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ aiFeatures, setAiFeatures, userId }) => {
    const [activeTab, setActiveTab] = useState<'metrics' | 'subscriptions' | 'ai' | 'curriculum' | 'project' | 'logs' | 'feedback'>('metrics');
    const [sessions, setSessions] = useState<UsageSession[]>([]);
    const [systemLogs, setSystemLogs] = useState<SystemLogMock[]>([]);
    const [feedbackList, setFeedbackList] = useState<any[]>([]);
    const [userProfiles, setUserProfiles] = useState<Record<string, { name: string, email: string }>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLogsLoading, setIsLogsLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
    const [selectedTeacherForHistory, setSelectedTeacherForHistory] = useState<string | null>(null);
    
    // --- Subscription Monitor State ---
    const [subscriptionsList, setSubscriptionsList] = useState<(UserSubscription & { id: string })[]>([]);
    const [isSubsLoading, setIsSubsLoading] = useState(false);
    const [subSearchTerm, setSubSearchTerm] = useState('');
    const [subFilterTier, setSubFilterTier] = useState<'all' | 'free' | 'premium'>('all');
    const [subFilterStatus, setSubFilterStatus] = useState<'all' | 'active' | 'trial' | 'expired' | 'cancelled'>('all');

    const alert = useAlert();
    const confirm = useConfirm();

    // --- Feedback State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'bug' | 'feature' | 'general'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'reviewed' | 'addressed'>('all');
    const [filterTime, setFilterTime] = useState<'all' | 'week' | 'month'>('all');

    const updateFeedbackStatus = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'addressed', e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        setFeedbackList(prev => prev.map(fb => fb.id === feedbackId ? { ...fb, status: newStatus } : fb));
        if (selectedFeedback && selectedFeedback.id === feedbackId) {
            setSelectedFeedback(prev => ({ ...prev, status: newStatus }));
        }

        try {
            await updateDoc(doc(db, 'feedback', feedbackId), { status: newStatus });
        } catch (error) {
            console.error("Error updating feedback status:", error);
        }
    };

    const filteredFeedback = useMemo(() => {
        return feedbackList.filter(fb => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                fb.message?.toLowerCase().includes(searchLower) ||
                fb.ssoMetadata?.name?.toLowerCase().includes(searchLower) ||
                fb.ssoMetadata?.email?.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;
            if (filterType !== 'all' && fb.type !== filterType) return false;

            const status = fb.status || 'new';
            if (filterStatus !== 'all' && status !== filterStatus) return false;

            if (filterTime !== 'all' && fb.createdAt?.toDate) {
                const date = fb.createdAt.toDate();
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (filterTime === 'week' && diffDays > 7) return false;
                if (filterTime === 'month' && diffDays > 30) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [feedbackList, searchTerm, filterType, filterStatus, filterTime]);

    // --- Fetch Subscriptions ---
    const fetchSubscriptions = async () => {
        setIsSubsLoading(true);
        try {
            const q = query(collection(db, 'subscriptions'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserSubscription & { id: string }));
            setSubscriptionsList(list);

            const userIds = Array.from(new Set(list.map(s => s.id)));
            await Promise.all(userIds.map(async (uid) => {
                if (userProfiles[uid]) return;
                try {
                    const docSnap = await getDoc(doc(db, 'teacher_profile', uid));
                    if (docSnap.exists()) {
                        const p = docSnap.data();
                        setUserProfiles(prev => ({ ...prev, [uid]: { name: p.name || 'Sin Nombre', email: p.email || '' } }));
                    }
                } catch {
                    // Ignore profile fetch error
                }
            }));
        } catch (e) {
            console.error("Error fetching subscriptions:", e);
        } finally {
            setIsSubsLoading(false);
        }
    };

    const handleSetUserTier = async (targetUserId: string, tier: SubscriptionTier) => {
        const isConfirmed = await confirm({
            title: tier === 'premium' ? 'Otorgar Plan Premium' : 'Cambiar a Plan Gratis',
            message: `¿Estás seguro de cambiar la suscripción de este usuario a ${tier.toUpperCase()}?`,
            type: tier === 'premium' ? 'info' : 'warning',
            confirmText: 'Confirmar'
        });

        if (!isConfirmed) return;

        try {
            const now = new Date().toISOString();
            const subData: UserSubscription = {
                tier,
                status: 'active',
                source: 'manual',
                expiresAt: null,
                createdAt: now,
                updatedAt: now
            };
            await setDoc(doc(db, 'subscriptions', targetUserId), subData, { merge: true });

            setSubscriptionsList(prev => {
                const exists = prev.some(s => s.id === targetUserId);
                if (exists) {
                    return prev.map(s => s.id === targetUserId ? { ...s, ...subData } : s);
                } else {
                    return [...prev, { id: targetUserId, ...subData }];
                }
            });

            await alert({ title: 'Éxito', message: `La suscripción se actualizó correctamente a ${tier.toUpperCase()}`, type: 'success' });
        } catch (e: any) {
            console.error("Error setting subscription tier:", e);
            await alert({ title: 'Error', message: `Error al actualizar: ${e.message || e}`, type: 'danger' });
        }
    };

    const filteredSubscriptions = useMemo(() => {
        return subscriptionsList.filter(sub => {
            const profile = userProfiles[sub.id] || { name: '', email: '' };
            const searchLower = subSearchTerm.toLowerCase();
            const matchesSearch =
                sub.id.toLowerCase().includes(searchLower) ||
                profile.name.toLowerCase().includes(searchLower) ||
                profile.email.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;
            if (subFilterTier !== 'all' && sub.tier !== subFilterTier) return false;
            if (subFilterStatus !== 'all' && sub.status !== subFilterStatus) return false;

            return true;
        });
    }, [subscriptionsList, userProfiles, subSearchTerm, subFilterTier, subFilterStatus]);

    const subStats = useMemo(() => {
        const total = subscriptionsList.length;
        const premiumActive = subscriptionsList.filter(s => s.tier === 'premium' && s.status === 'active').length;
        const freeCount = subscriptionsList.filter(s => s.tier === 'free' || !s.tier).length;
        const manualCount = subscriptionsList.filter(s => s.source === 'manual').length;
        const stripeCount = subscriptionsList.filter(s => s.source === 'stripe').length;
        const conversionRate = total > 0 ? Math.round((premiumActive / total) * 100) : 0;

        return { total, premiumActive, freeCount, manualCount, stripeCount, conversionRate };
    }, [subscriptionsList]);

    // --- Tab Data Loaders ---
    useEffect(() => {
        if (activeTab === 'metrics') {
            const fetchUsage = async () => {
                setIsLoading(true);
                setIsLogsLoading(true);
                try {
                    const q = query(collection(db, 'usage_sessions'));
                    const snapshot = await getDocs(q);
                    const data = snapshot.docs.map(d => d.data() as UsageSession);
                    setSessions(data);

                    const logsQuery = query(
                        collection(db, 'system_logs'),
                        orderBy('timestamp', 'desc'),
                        limit(4)
                    );
                    const logsSnapshot = await getDocs(logsQuery);
                    const logsData = logsSnapshot.docs.map(d => {
                        const docData = d.data();
                        return {
                            id: d.id,
                            type: docData.type,
                            timestamp: docData.timestamp?.toDate() || new Date(),
                            metadata: docData.metadata
                        } as SystemLogMock;
                    });
                    setSystemLogs(logsData);

                    const userIds = Array.from(new Set(data.map(s => s.userId)));
                    const profiles: Record<string, { name: string, email: string }> = {};

                    await Promise.all(userIds.map(async (uid) => {
                        if (uid === 'DEMO_GUEST_USER') {
                            profiles[uid] = { name: 'Invitado Demo', email: 'demo@regis.app' };
                            return;
                        }
                        try {
                            const docRef = doc(db, 'teacher_profile', uid);
                            const docSnap = await getDoc(docRef);
                            if (docSnap.exists()) {
                                const p = docSnap.data();
                                profiles[uid] = { name: p.name || 'Sin Nombre', email: p.email || '' };
                            } else {
                                profiles[uid] = { name: 'Usuario Desconocido', email: '' };
                            }
                        } catch (e) {
                            console.warn(`Could not fetch profile for ${uid}`, e);
                            profiles[uid] = { name: 'Error al cargar', email: '' };
                        }
                    }));

                    setUserProfiles(profiles);

                } catch (e) {
                    console.error("Error fetching usage stats:", e);
                } finally {
                    setIsLoading(false);
                    setIsLogsLoading(false);
                }
            };
            fetchUsage();
        } else if (activeTab === 'subscriptions') {
            fetchSubscriptions();
        } else if (activeTab === 'feedback') {
            const fetchFeedback = async () => {
                const q = query(collection(db, 'feedback'));
                const snapshot = await getDocs(q);
                setFeedbackList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            };
            fetchFeedback();
        }
    }, [activeTab]);

    const aggregatedData = useMemo<TeacherAggregation[]>(() => {
        const teacherMap = new Map<string, TeacherAggregation>();

        sessions.forEach(s => {
            const current = teacherMap.get(s.userId) || {
                userId: s.userId,
                activeDays: 0,
                flowsUsed: new Set<string>(),
                lastDate: '',
                assisted: false,
                latestSessionId: '',
                offlineCount: 0,
                lastFlow: '',
                flowHistory: [] as { date: string, flows: string[] }[]
            };

            current.activeDays += 1;
            s.flowsUsed?.forEach(f => current.flowsUsed.add(f));
            if (s.date > current.lastDate) {
                current.lastDate = s.date;
                if (s.flowsUsed && s.flowsUsed.length > 0) {
                    current.lastFlow = s.flowsUsed[s.flowsUsed.length - 1];
                }
            }
            if (s.offline) current.offlineCount += 1;

            current.flowHistory.push({
                date: s.date,
                flows: s.flowsUsed || []
            });

            teacherMap.set(s.userId, current);
        });

        return Array.from(teacherMap.values()).map(t => {
            const userSessions = sessions.filter(s => s.userId === t.userId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            const latest = userSessions[0];
            const sortedHistory = t.flowHistory.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            return {
                ...t,
                assisted: latest?.assisted || false,
                latestSessionId: latest ? `${latest.userId}_${latest.date}` : '',
                flowHistory: sortedHistory
            };
        });
    }, [sessions]);

    const totalAssisted = sessions.filter(s => s.assisted).length;
    const totalManual = sessions.length - totalAssisted;
    const totalSessions = sessions.length || 1;
    const assistedRatio = Math.round((totalAssisted / totalSessions) * 100);

    const coreFlowCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        sessions.forEach(s => {
            s.flowsUsed?.forEach(f => {
                counts[f] = (counts[f] || 0) + 1;
            });
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [sessions]);

    const wauHistory = useMemo(() => {
        const weeksMap = new Map<string, Set<string>>();
        sessions.forEach(s => {
            if (!s.date) return;
            const dateParts = s.date.split('-');
            if (dateParts.length !== 3) return;

            const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));
            const weekId = monday.toISOString().split('T')[0];

            const currentWeek = weeksMap.get(weekId) || new Set<string>();
            currentWeek.add(s.userId);
            weeksMap.set(weekId, currentWeek);
        });

        return Array.from(weeksMap.entries())
            .map(([week, users]) => ({ week, count: users.size }))
            .sort((a, b) => b.week.localeCompare(a.week))
            .slice(0, 8);
    }, [sessions]);

    const projectInfo = {
        version: APP_VERSION,
        environment: import.meta.env.MODE,
        firebaseProject: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'regis-dev-150626',
        database: "Firestore (Native)",
        storage: "Firebase Storage",
        buildTarget: import.meta.env.MODE === 'production' ? 'Pro' : 'Beta (Dev)'
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Panel de Administración</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Gestiona métricas, suscripciones, configuraciones de IA y telemetría del sistema.</p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex space-x-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-8 w-full md:w-fit overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={`flex-none shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'metrics'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        <ChartBarIcon className="w-5 h-5 mr-2" />
                        Métricas
                    </button>
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`flex-none shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'subscriptions'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        <CreditCard className="w-5 h-5 mr-2 text-indigo-500" />
                        Suscripciones
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-none shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'ai'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        <CogIcon className="w-5 h-5 mr-2" />
                        Configuración IA
                    </button>
                    <button
                        onClick={() => setActiveTab('curriculum')}
                        className={`flex-none shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'curriculum'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        <ClipboardCheckIcon className="w-5 h-5 mr-2" />
                        Currículo
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex-none shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        <ServerIcon className="w-5 h-5 mr-2" />
                        Telemetría
                    </button>
                    <button
                        onClick={() => setActiveTab('project')}
                        className={`flex-none shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'project'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        <CogIcon className="w-5 h-5 mr-2" />
                        Proyecto
                    </button>
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`flex-none shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'feedback'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        💬 Feedback
                    </button>
                </div>

                {/* Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* --- Metrics Tab --- */}
                    {activeTab === 'metrics' && (
                        <div className="space-y-8">
                            {isLoading && <div className="p-10 text-center animate-pulse text-indigo-600 font-bold text-xl">Cargando métricas de uso...</div>}

                            {!isLoading && (
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-1">Métricas Core de Uso</h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Monitoreo de adopción y uso Offline-First.</p>
                                        </div>
                                    </div>

                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm text-slate-500 font-medium uppercase tracking-wide">WAU (Usuarios Activos)</span>
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-2 mb-4">
                                                <p className="text-3xl font-black text-slate-800 dark:text-white">{wauHistory[0]?.count || 0}</p>
                                                <span className="text-xs font-bold text-slate-400">Esta semana</span>
                                                {wauHistory.length > 1 && (
                                                    <span className={`text-[10px] font-bold ml-auto ${wauHistory[0].count >= wauHistory[1].count ? 'text-emerald-500' : 'text-red-500'
                                                        }`}>
                                                        {wauHistory[0].count >= wauHistory[1].count ? '↑' : '↓'}
                                                        {Math.abs(wauHistory[0].count - wauHistory[1].count)} vs ant.
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-end gap-1 h-12 mt-auto">
                                                {wauHistory.slice().reverse().map((w, i) => {
                                                    const max = Math.max(...wauHistory.map(h => h.count), 1);
                                                    const height = Math.max((w.count / max) * 100, 5);
                                                    const isCurrent = i === wauHistory.length - 1;
                                                    return (
                                                        <div
                                                            key={w.week}
                                                            className={`flex-1 rounded-t-sm relative group transition-all duration-500 ${isCurrent ? 'bg-indigo-500 shadow-sm' : 'bg-indigo-100 dark:bg-indigo-900/40'
                                                                }`}
                                                            style={{ height: `${height}%` }}
                                                        >
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 dark:bg-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-30">
                                                                <span className="font-bold">{w.count}</span> usuarios
                                                                <div className="text-[8px] opacity-70">Sem: {w.week}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                                            <div className="flex items-center gap-2 mb-6">
                                                <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Adopción IA vs Ingreso Manual</h3>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{assistedRatio}%</p>
                                                        <p className="text-sm font-medium text-slate-500">Asistidos por Vicente (IA)</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-3xl font-black text-slate-400">{100 - assistedRatio}%</p>
                                                        <p className="text-sm font-medium text-slate-500">Entrada Manual</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-8 rounded-xl flex overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-700">
                                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${assistedRatio}%` }}></div>
                                                    <div className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-1000" style={{ width: `${100 - assistedRatio}%` }}></div>
                                                </div>
                                                <div className="flex justify-between mt-3 text-xs text-slate-400 font-medium">
                                                    <span>{totalAssisted} Sesiones IA</span>
                                                    <span>{totalManual} Sesiones Manuales</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Core Flows & Alerts */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                                            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Completitud de Flujos Core</h3>
                                                    <p className="text-xs text-slate-500">Eventos disparados por core_flow_completed</p>
                                                </div>
                                                <div className="text-xs font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-md">
                                                    Uso en días distintos: <span className="font-bold text-sm tracking-wide">{aggregatedData.length > 0 ? (aggregatedData.reduce((acc, t) => acc + t.activeDays, 0) / aggregatedData.length).toFixed(1) : '0'}</span> días/sem prom.
                                                </div>
                                            </div>
                                            <div className="p-0 overflow-x-auto flex-1 max-h-64 custom-scrollbar">
                                                <table className="w-full text-left relative">
                                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/80 backdrop-blur z-10">
                                                        <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            <th className="p-4 font-semibold">Flujo / Evento</th>
                                                            <th className="p-4 font-semibold text-center">Frecuencia</th>
                                                            <th className="p-4 font-semibold">Uso Relativo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        {coreFlowCounts.map(([flow, count]) => {
                                                            const maxFlow = coreFlowCounts[0]?.[1] || 1;
                                                            const width = (count / maxFlow) * 100;
                                                            return (
                                                                <tr key={flow} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                                    <td className="p-4">
                                                                        <span className="text-sm font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded font-mono">{flow}</span>
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 h-7 w-auto px-3 rounded-full font-bold text-xs">{count}</span>
                                                                    </td>
                                                                    <td className="p-4 w-1/3">
                                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                                            <div className="bg-indigo-400 dark:bg-indigo-500 h-full rounded-full" style={{ width: `${width}%` }}></div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {coreFlowCounts.length === 0 && (
                                                            <tr><td colSpan={3} className="p-8 text-center text-slate-400 text-sm">No hay registros de flujos core.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 p-5 flex flex-col">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                                                    <AlertTriangle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-red-700 dark:text-red-400 leading-tight">Alertas de Riesgo</h3>
                                                    <p className="text-xs text-red-500/80">Salud Técnica y Offline</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">Telemetría de sync_duration y escritura.</p>

                                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[320px]">
                                                {isLogsLoading ? (
                                                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                                        <Activity className="w-8 h-8 animate-pulse text-red-300 mb-2" />
                                                        <p className="text-xs font-medium text-slate-400">Consultando telemetría...</p>
                                                    </div>
                                                ) : systemLogs.length > 0 ? (
                                                    systemLogs.map((log) => (
                                                        <div key={log.id} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl flex items-start gap-3">
                                                            <div className="pt-0.5">
                                                                {log.type === 'PERFORMANCE_ALERT' ?
                                                                    <Clock className="w-4 h-4 text-orange-500" /> :
                                                                    <Cloud className="w-4 h-4 text-red-500" />
                                                                }
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-red-200 leading-none">
                                                                        {log.type === 'PERFORMANCE_ALERT' ? 'Sincronización Lenta (>10s)' : 'Intento de Escritura Huérfano'}
                                                                    </p>
                                                                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                                                                        {log.timestamp instanceof Date ? log.timestamp.toLocaleTimeString() : '---'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-12 opacity-50">
                                                        <Cloud className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-xs text-slate-400 font-medium">Sin alertas registradas.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Teacher Usage Table */}
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-8">
                                        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Detalle de Uso por Docente</h3>
                                            <p className="text-xs text-slate-500">Métricas individuales basadas en sesiones de uso agregadas.</p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-700/80">
                                                    <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        <th className="p-4 font-semibold">Docente</th>
                                                        <th className="p-4 font-semibold">Días Activos</th>
                                                        <th className="p-4 font-semibold">Última Actividad</th>
                                                        <th className="p-4 font-semibold">Último Flujo</th>
                                                        <th className="p-4 font-semibold">Modo de Uso</th>
                                                        <th className="p-4 font-semibold">Sinc. Offline</th>
                                                        <th className="p-4 font-semibold">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {aggregatedData.map((teacher) => {
                                                        const profile = userProfiles[teacher.userId] || { name: 'Cargando...', email: '' };
                                                        return (
                                                            <tr key={teacher.userId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar name={profile.name} size="sm" />
                                                                        <div>
                                                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{profile.name}</p>
                                                                            <p className="text-xs text-slate-500">{profile.email}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 h-7 w-7 rounded-full font-bold text-xs">
                                                                        {teacher.activeDays}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                                        {teacher.lastDate ? new Date(teacher.lastDate).toLocaleDateString() : '---'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">
                                                                    {teacher.lastFlow ? (
                                                                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                                                            {teacher.lastFlow}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400 italic">No registrado</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        {teacher.assisted ? (
                                                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded text-[10px] font-bold uppercase tracking-tight flex items-center gap-1">
                                                                                <SparklesIcon className="w-3 h-3" /> Asistido
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-tight">
                                                                                Autónomo
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <span className={`text-xs font-bold ${teacher.offlineCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                                        {teacher.offlineCount}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">
                                                                    <button
                                                                        onClick={() => setSelectedTeacherForHistory(teacher.userId)}
                                                                        className="text-[10px] font-bold px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors whitespace-nowrap"
                                                                    >
                                                                        Historial
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* --- Subscriptions Monitor Tab --- */}
                    {activeTab === 'subscriptions' && (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-1">Monitor de Suscripciones</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Control en tiempo real de cuentas Premium, accesos y estado de pago en Firestore.</p>
                                </div>
                                <button
                                    onClick={fetchSubscriptions}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-xl text-xs font-bold transition-all"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isSubsLoading ? 'animate-spin' : ''}`} />
                                    Actualizar Lista
                                </button>
                            </div>

                            {/* KPI Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Registrados</span>
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-slate-800 dark:text-white">{subStats.total}</p>
                                    <span className="text-xs text-slate-400 font-medium">Registros en colección subscriptions</span>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Suscripciones PRO</span>
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                                            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{subStats.premiumActive}</p>
                                    <span className="text-xs text-slate-400 font-medium">Planes Premium activos</span>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Plan Gratis</span>
                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                            <UserGroupIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-slate-700 dark:text-slate-200">{subStats.freeCount}</p>
                                    <span className="text-xs text-slate-400 font-medium">Docentes en nivel básico</span>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-purple-200 dark:border-purple-900/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">Conversión PRO</span>
                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                            <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{subStats.conversionRate}%</p>
                                    <span className="text-xs text-slate-400 font-medium">{subStats.stripeCount} Stripe • {subStats.manualCount} Manual</span>
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="relative w-full md:w-80">
                                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por correo, nombre o UID..."
                                        value={subSearchTerm}
                                        onChange={(e) => setSubSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    <select
                                        value={subFilterTier}
                                        onChange={(e) => setSubFilterTier(e.target.value as any)}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                                    >
                                        <option value="all">Todos los Nivel (Tier)</option>
                                        <option value="premium">✨ Premium / PRO</option>
                                        <option value="free">⚡ Gratis</option>
                                    </select>

                                    <select
                                        value={subFilterStatus}
                                        onChange={(e) => setSubFilterStatus(e.target.value as any)}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                                    >
                                        <option value="all">Todos los Estados</option>
                                        <option value="active">🟢 Activos</option>
                                        <option value="trial">🟡 En Prueba</option>
                                        <option value="cancelled">🔴 Cancelados</option>
                                        <option value="expired">⚫ Expirados</option>
                                    </select>
                                </div>
                            </div>

                            {/* Subscriptions Data Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Docentes & Suscripciones</h3>
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
                                        {filteredSubscriptions.length} registros encontrados
                                    </span>
                                </div>

                                {isSubsLoading ? (
                                    <div className="p-12 text-center text-slate-400 font-medium animate-pulse">
                                        Cargando listado de suscripciones...
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 dark:bg-slate-700/80">
                                                <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    <th className="p-4 font-semibold">Docente</th>
                                                    <th className="p-4 font-semibold">Plan</th>
                                                    <th className="p-4 font-semibold">Estado</th>
                                                    <th className="p-4 font-semibold">Origen</th>
                                                    <th className="p-4 font-semibold">Vencimiento</th>
                                                    <th className="p-4 font-semibold text-right">Acción Admin</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {filteredSubscriptions.map((sub) => {
                                                    const profile = userProfiles[sub.id] || { name: 'Cargando...', email: '' };
                                                    const isPro = sub.tier === 'premium';
                                                    return (
                                                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar name={profile.name || 'User'} size="sm" />
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{profile.name}</p>
                                                                        <p className="text-xs text-slate-500">{profile.email || 'Sin correo público'}</p>
                                                                        <p className="text-[10px] font-mono text-slate-400">{sub.id}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                {isPro ? (
                                                                    <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-xs font-bold tracking-wide shadow-sm inline-flex items-center gap-1">
                                                                        <SparklesIcon className="w-3.5 h-3.5" /> PREMIUM
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-full text-xs font-bold">
                                                                        GRATIS
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-tight ${
                                                                    sub.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                                                    sub.status === 'trial' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                                    sub.status === 'cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                                }`}>
                                                                    {sub.status || 'Gratis'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="text-xs font-mono capitalize bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                                                    {sub.source || 'sistema'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                                    {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : (isPro ? 'Indefinido / Manual' : 'N/A')}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {isPro ? (
                                                                        <button
                                                                            onClick={() => handleSetUserTier(sub.id, 'free')}
                                                                            className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                                                        >
                                                                            Bajar a Gratis
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleSetUserTier(sub.id, 'premium')}
                                                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                                                        >
                                                                            Otorgar PRO
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredSubscriptions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-12 text-center">
                                                            <p className="text-slate-400 text-sm">No se encontraron suscripciones registradas.</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- AI Settings Tab --- */}
                    {activeTab === 'ai' && (
                        <div className="max-w-4xl">
                            {aiFeatures ? (
                                <AISettings aiFeatures={aiFeatures} setAiFeatures={setAiFeatures} />
                            ) : (
                                <div className="p-10 text-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                    <CogIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium">Las funciones de IA no están disponibles o cargando...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- Curriculum Tab --- */}
                    {activeTab === 'curriculum' && (
                        <div className="max-w-4xl">
                            <CurriculumManagement />
                        </div>
                    )}

                    {/* --- Telemetry / Logs Tab --- */}
                    {activeTab === 'logs' && (
                        <LogViewer />
                    )}

                    {/* --- Project Info Tab --- */}
                    {activeTab === 'project' && (
                        <div className="max-w-4xl space-y-6">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Información del Proyecto</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Detalles técnicos de la implementación actual.</p>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Entorno & Versión</h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Versión de la App</dt>
                                                <dd className="mt-1 text-lg font-mono font-bold text-slate-800 dark:text-white">v{projectInfo.version}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Entorno (NODE_ENV)</dt>
                                                <dd className="mt-1 flex items-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${projectInfo.environment === 'production' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                        {projectInfo.environment}
                                                    </span>
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Build Target</dt>
                                                <dd className="mt-1 text-slate-800 dark:text-white font-medium">{projectInfo.buildTarget}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Infraestructura Firebase</h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Project ID</dt>
                                                <dd className="mt-1 text-slate-800 dark:text-white font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded w-fit">{projectInfo.firebaseProject}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Base de Datos</dt>
                                                <dd className="mt-1 flex items-center text-slate-800 dark:text-white">
                                                    <ServerIcon className="w-4 h-4 mr-2 text-indigo-500" />
                                                    {projectInfo.database}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Almacenamiento</dt>
                                                <dd className="mt-1 flex items-center text-slate-800 dark:text-white">
                                                    <ServerIcon className="w-4 h-4 mr-2 text-orange-500" />
                                                    {projectInfo.storage}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            {/* --- API Endpoints & Services Section --- */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-indigo-500" />
                                            Terminaciones de APIs Utilizadas (Endpoints)
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Catálogo de Cloud Functions, microservicios e integraciones externas activas.</p>
                                    </div>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs font-bold font-mono">
                                        {CLOUD_FUNCTIONS_CATALOG.length} Functions • {EXTERNAL_INTEGRATIONS.length} APIs
                                    </span>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Firebase Cloud Functions (Backend Endpoints)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {CLOUD_FUNCTIONS_CATALOG.map((fn) => (
                                                <div key={fn.id} className="p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{fn.name}</span>
                                                        <span className={`text-[10px] ${fn.typeBadgeColor} px-2 py-0.5 rounded font-bold uppercase`}>{fn.type}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-1.5">{fn.description}</p>
                                                    <code className="text-[10px] text-slate-500 font-mono block truncate bg-slate-100 dark:bg-slate-800 p-1 rounded">
                                                        {getFunctionUrl(projectInfo.firebaseProject, fn.name)}
                                                    </code>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Integraciones y SDKs Externos</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {EXTERNAL_INTEGRATIONS.map((integ) => (
                                                <div key={integ.name} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-white">{integ.name}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{integ.details}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- Feedback Tab --- */}
                    {activeTab === 'feedback' && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Feedback Recibido</h2>

                                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                    <div className="relative">
                                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar feedback..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 w-full md:w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white"
                                        />
                                    </div>

                                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value as any)}
                                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">Todos los Tipos</option>
                                            <option value="bug">🐛 Bugs</option>
                                            <option value="feature">✨ Mejoras</option>
                                            <option value="general">📝 General</option>
                                        </select>

                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value as any)}
                                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">Todos los Estados</option>
                                            <option value="new">🔴 Sin leer</option>
                                            <option value="reviewed">🟡 En proceso</option>
                                            <option value="addressed">🟢 Resuelto</option>
                                        </select>

                                        <select
                                            value={filterTime}
                                            onChange={(e) => setFilterTime(e.target.value as any)}
                                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">Todo el tiempo</option>
                                            <option value="week">📅 Última semana</option>
                                            <option value="month">📅 Último mes</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredFeedback.map((fb) => (
                                    <div key={fb.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 shadow-sm flex flex-col h-full relative cursor-pointer hover:shadow-md transition-shadow group ${fb.status === 'addressed' ? 'border-l-green-500 border-y border-r border-slate-200 dark:border-slate-700' :
                                        fb.status === 'reviewed' ? 'border-l-yellow-400 border-y border-r border-slate-200 dark:border-slate-700' :
                                            'border-l-red-500 border-y border-r border-slate-200 dark:border-slate-700'
                                        }`} onClick={() => setSelectedFeedback(fb)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase flex items-center gap-1 ${fb.type === 'bug' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                fb.type === 'feature' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                }`}>
                                                {fb.type === 'bug' && <ExclamationIcon className="w-3 h-3" />}
                                                {fb.type === 'feature' && <SparklesIcon className="w-3 h-3" />}
                                                {fb.type}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString() : 'Reciente'}</span>
                                        </div>

                                        <p className="font-semibold text-slate-800 dark:text-white mb-3 line-clamp-3 group-hover:text-indigo-600 transition-colors text-sm leading-relaxed">
                                            {fb.message}
                                        </p>

                                        <div className="mt-auto">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Avatar name={fb.ssoMetadata?.name || '?'} size="xs" />
                                                <div className="overflow-hidden">
                                                    <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">{fb.ssoMetadata?.name}</p>
                                                    <p className="truncate text-[10px] text-slate-400">{fb.appMetadata?.version} en {fb.appMetadata?.platform || 'Web'}</p>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center" onClick={e => e.stopPropagation()}>
                                                <select
                                                    value={fb.status || 'new'}
                                                    onChange={(e) => updateFeedbackStatus(fb.id, e.target.value as any)}
                                                    className={`text-xs font-bold py-1 px-2 rounded cursor-pointer border-0 ring-1 focus:ring-2 ${(fb.status === 'addressed' ? 'bg-green-50 text-green-700 ring-green-200' :
                                                        fb.status === 'reviewed' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' :
                                                            'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600')
                                                        }`}
                                                >
                                                    <option value="new">🔴 Sin leer</option>
                                                    <option value="reviewed">🟡 En proceso</option>
                                                    <option value="addressed">🟢 Resuelto</option>
                                                </select>

                                                <div className="flex gap-2">
                                                    {fb.screenshotUrl && (
                                                        <span className="text-xs text-slate-400 flex items-center" title="Tiene captura">
                                                            📷
                                                        </span>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedFeedback(fb); }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                                                        Ver detalle
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredFeedback.length === 0 && (
                                    <div className="col-span-full py-12 text-center">
                                        <ClipboardCheckIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">No se encontró feedback con estos filtros.</p>
                                        <button onClick={() => { setFilterType('all'); setFilterStatus('all'); setFilterTime('all'); setSearchTerm('') }} className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                                            Limpiar filtros
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Detail Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedFeedback(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 text-sm font-bold rounded-full uppercase flex items-center gap-2 ${selectedFeedback.type === 'bug' ? 'bg-red-100 text-red-700' :
                                            selectedFeedback.type === 'feature' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {selectedFeedback.type}
                                        </span>
                                        <span className="text-sm text-slate-500">{selectedFeedback.createdAt?.toDate ? selectedFeedback.createdAt.toDate().toLocaleString() : 'Reciente'}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white pr-8">Detalle de Feedback</h3>
                                </div>
                                <button onClick={() => setSelectedFeedback(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                                    <span className="sr-only">Cerrar</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-base leading-relaxed">
                                        {selectedFeedback.message}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Estado del Ticket:</span>
                                    <select
                                        value={selectedFeedback.status || 'new'}
                                        onChange={(e) => updateFeedbackStatus(selectedFeedback.id, e.target.value as any)}
                                        className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm px-3 py-1 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="new">🔴 Sin leer</option>
                                        <option value="reviewed">🟡 En proceso</option>
                                        <option value="addressed">🟢 Resuelto</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Usuario</h4>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={selectedFeedback.ssoMetadata?.name || 'User'} size="md" />
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedFeedback.ssoMetadata?.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedFeedback.ssoMetadata?.email}</p>
                                                <p className="text-xs text-slate-400 font-mono mt-1">{selectedFeedback.userId}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contexto Técnico</h4>
                                        <dl className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">Versión App:</dt>
                                                <dd className="font-mono text-slate-700 dark:text-slate-300">{selectedFeedback.appMetadata?.version}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">Vista:</dt>
                                                <dd className="font-mono text-slate-700 dark:text-slate-300">{selectedFeedback.appMetadata?.currentView}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500">Plataforma:</dt>
                                                <dd className="font-mono text-slate-700 dark:text-slate-300">{selectedFeedback.appMetadata?.platform || 'Web'}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>

                                {selectedFeedback.screenshotUrl && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Captura de Pantalla</h4>
                                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                                            <img src={selectedFeedback.screenshotUrl} alt="Screenshot" className="w-full h-auto object-contain max-h-[500px]" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end rounded-b-2xl">
                            <button onClick={() => setSelectedFeedback(null)} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Teacher Flow History Modal */}
            {selectedTeacherForHistory && (() => {
                const teacher = aggregatedData.find(t => t.userId === selectedTeacherForHistory);
                const profile = userProfiles[selectedTeacherForHistory] || { name: 'Docente', email: '' };

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTeacherForHistory(null)}>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <Avatar name={profile.name} size="sm" />
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Historial de Flujos</h3>
                                        <p className="text-xs text-slate-500">{profile.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTeacherForHistory(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {teacher?.flowHistory && teacher.flowHistory.length > 0 ? (
                                    teacher.flowHistory.map((session, idx) => (
                                        <div key={idx} className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-700 last:border-l-0">
                                            <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-800 shadow-sm"></div>

                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                                    {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">{session.date}</span>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {session.flows && session.flows.length > 0 ? (
                                                    session.flows.map((flow, fidx) => (
                                                        <span key={fidx} className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-1.5 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                                            {flow}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Sin flujos registrados en esta sesión</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                            <Activity className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 font-medium">No hay historial de flujos para este docente.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                <button
                                    onClick={() => setSelectedTeacherForHistory(null)}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    Cerrar historial
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};
