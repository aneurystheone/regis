import React, { useMemo, useState, useEffect } from 'react';
import { CustomEvent, EvaluationInstrument, Class } from '../types';
import { CalendarIcon, ClockIcon, DocumentTextIcon } from './icons';
import { isCurrentTimeInSlot } from '../utils';

// --- Inline schedule parser (mirrors CalendarView logic) ---
const DAY_MAP: Record<string, number> = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3,
    'jueves': 4, 'viernes': 5, 'sábado': 6,
};

function parseTodaySchedule(classes: Class[]): Array<{ cls: Class; time: string }> {
    const today = new Date().getDay();
    const results: Array<{ cls: Class; time: string }> = [];
    const seen = new Set<string>();

    for (const cls of classes) {
        if (!cls.schedule || cls.schedule.toLowerCase().includes('por definir')) continue;

        const slots = cls.schedule.split(',').map(s => s.trim());
        for (const slot of slots) {
            const timeMatch = slot.match(/(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)/);
            const time = timeMatch ? timeMatch[1].trim() : '';

            const lowerSlot = slot.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
                const normalizedDay = dayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (lowerSlot.includes(normalizedDay) && dayNum === today) {
                    const key = `${cls.id}|${time}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        results.push({ cls, time });
                    }
                }
            }
        }
    }

    // Sort by time (school hours: 1-7 → PM)
    return results.sort((a, b) => {
        const toSort = (t: string) => {
            const m = t.match(/(\d{1,2}):(\d{2})/);
            if (!m) return '99:99';
            let h = parseInt(m[1]);
            if (h >= 1 && h <= 7) h += 12;
            return String(h).padStart(2, '0') + ':' + m[2];
        };
        return toSort(a.time).localeCompare(toSort(b.time));
    });
}

interface AgendaCardProps {
    customEvents: CustomEvent[];
    instruments: EvaluationInstrument[];
    classes: Class[];
    onNavigateToCalendar: () => void;
    onEventClick?: (event: CustomEvent) => void;
    onInstrumentClick?: (instrument: EvaluationInstrument) => void;
}

export const AgendaCard: React.FC<AgendaCardProps> = ({ customEvents, instruments, classes, onNavigateToCalendar, onEventClick, onInstrumentClick }) => {

    const todayClasses = useMemo(() => parseTodaySchedule(classes), [classes]);

    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setTick(prev => prev + 1);
        }, 15000);
        return () => clearInterval(timer);
    }, []);

    const upcomingEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allEvents = [
            ...customEvents.map(e => ({ type: 'event' as const, data: e, dateObj: new Date(e.date + 'T00:00:00') })),
            ...instruments.map(i => ({ type: 'instrument' as const, data: i, dateObj: new Date(i.date + 'T00:00:00') }))
        ];

        return allEvents
            .filter(item => item.dateObj >= today)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
            .slice(0, 3);
    }, [customEvents, instruments]);

    const getClassColor = (classId?: string) => {
        if (!classId) return '#6b7280';
        return classes.find(c => c.id === classId)?.color || '#6b7280';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';

        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const handleItemClick = (item: { type: 'event' | 'instrument', data: CustomEvent | EvaluationInstrument }) => {
        if (item.type === 'event' && onEventClick) {
            onEventClick(item.data as CustomEvent);
        } else if (item.type === 'instrument' && onInstrumentClick) {
            onInstrumentClick(item.data as EvaluationInstrument);
        }
    };

    const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayName = weekdayNames[new Date().getDay()];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            {/* TODAY'S SCHEDULE */}
            {todayClasses.length > 0 && (
                <div className="mb-5">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-3">
                        Clases Hoy · {todayName}
                    </h3>
                    <div className="space-y-2">
                        {todayClasses.map(({ cls, time }, idx) => {
                            const isNow = isCurrentTimeInSlot(time);
                            return (
                                <div
                                    key={`sc-${cls.id}-${idx}`}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 border
                                        ${isNow 
                                            ? 'bg-indigo-50/60 dark:bg-indigo-950/20 shadow-sm scale-[1.01]' 
                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50'
                                        }`}
                                    style={{ borderColor: isNow ? (cls.color || '#6366f1') : undefined }}
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black text-white"
                                        style={{ backgroundColor: cls.color || '#6366f1' }}
                                    >
                                        {cls.grade.replace(/[^0-9]/g, '') || cls.grade.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                                {cls.grade} {cls.section} – {cls.name}
                                            </p>
                                            {isNow && (
                                                <span 
                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase" 
                                                    style={{ 
                                                        color: cls.color || '#6366f1', 
                                                        backgroundColor: cls.color ? `${cls.color}15` : '#6366f115',
                                                        border: `1px solid ${cls.color}30` || '1px solid #6366f130'
                                                    }}
                                                >
                                                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: cls.color || '#6366f1' }}></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: cls.color || '#6366f1' }}></span>
                                                    </span>
                                                    Ahora
                                                </span>
                                            )}
                                        </div>
                                        {time && (
                                            <p className={`text-[11px] flex items-center gap-1 mt-0.5 transition-colors duration-300 ${isNow ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                <ClockIcon className="w-3 h-3" /> {time}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* UPCOMING EVENTS */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    Próximamente
                </h3>
                <button
                    onClick={onNavigateToCalendar}
                    className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-500 transition-colors"
                >
                    <CalendarIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 space-y-4">
                {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((item, idx) => {
                        const isInstrument = item.type === 'instrument';
                        const title = isInstrument ? (item.data as EvaluationInstrument).name : (item.data as CustomEvent).title;
                        const dateStr = isInstrument ? (item.data as EvaluationInstrument).date : (item.data as CustomEvent).date;
                        const timeStr = !isInstrument ? (item.data as CustomEvent).time : null;
                        const color = isInstrument ? getClassColor((item.data as EvaluationInstrument).classId) : (item.data as CustomEvent).color;

                        return (
                            <div
                                key={`${isInstrument ? 'i' : 'e'}-${(item.data as any).id}-${idx}`}
                                className="flex items-start gap-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 -mx-2 rounded-lg transition-colors"
                                onClick={() => handleItemClick(item)}
                            >
                                <div
                                    className="w-1.5 h-10 rounded-full mt-1 flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                ></div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">
                                        {title}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        <span className={`font-semibold ${formatDate(dateStr) === 'Hoy' ? 'text-emerald-500' : ''}`}>
                                            {formatDate(dateStr)}
                                        </span>
                                        {timeStr && (
                                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 rounded">
                                                <ClockIcon className="w-3 h-3" /> {timeStr}
                                            </span>
                                        )}
                                        {isInstrument && (
                                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 rounded">
                                                <DocumentTextIcon className="w-3 h-3" /> Evaluación
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-6 opacity-60">
                        <CalendarIcon className="w-12 h-12 text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-500">No hay eventos próximos</p>
                    </div>
                )}
            </div>

            <button
                onClick={onNavigateToCalendar}
                className="w-full mt-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
            >
                Ver calendario completo
            </button>
        </div>
    );
};
