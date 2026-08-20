
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Class, EvaluationInstrument, CustomEvent } from '../types';
import { DocumentTextIcon, XIcon, PlusIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const eventColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#78716c'];

// --- Schedule Parser ---
const DAY_MAP: Record<string, number> = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3,
    'jueves': 4, 'viernes': 5, 'sábado': 6,
};

function parseScheduleString(schedule: string): Array<{ dayOfWeek: number; time: string }> {
    if (!schedule || schedule.toLowerCase().includes('por definir') || schedule.trim() === '') return [];
    const results: Array<{ dayOfWeek: number; time: string }> = [];
    const seen = new Set<string>();

    // Split by comma to get individual slots
    const slots = schedule.split(',').map(s => s.trim());
    for (const slot of slots) {
        // Try to match patterns like "Lunes 7:00-8:00" or "Lunes y Miércoles 9:00-10:00"
        const timeMatch = slot.match(/(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)/);
        const time = timeMatch ? timeMatch[1].trim() : '';

        // Extract day names from the slot
        const lowerSlot = slot.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
            const normalizedDay = dayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (lowerSlot.includes(normalizedDay)) {
                const key = `${dayNum}|${time}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ dayOfWeek: dayNum, time });
                }
            }
        }
    }
    return results;
}

// Extract a sortable time string (HH:MM) from an event for chronological ordering
// School hours are 8:00 AM - 4:00 PM, so hours 1-7 are PM (13:00-19:00)
function toSchool24h(h: number): number {
    return h >= 1 && h <= 7 ? h + 12 : h;
}

function getEventSortTime(event: CalendarEventItem): string {
    if (event.type === 'schedule') {
        const m = event.data.time.match(/(\d{1,2}):(\d{2})/);
        if (m) {
            const h24 = toSchool24h(parseInt(m[1]));
            return String(h24).padStart(2, '0') + ':' + m[2];
        }
        return '99:99';
    }
    if (event.type === 'custom' && event.data.time) {
        return event.data.time.padStart(5, '0');
    }
    return '99:99'; // instruments and events without time go last
}

interface ScheduleEventData {
    className: string;
    classId: string;
    grade: string;
    section: string;
    time: string;
    color: string;
}

// --- Event Form Modal (Component within CalendarView) ---
interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: Omit<CustomEvent, 'id'>) => void;
    onUpdate: (eventId: string, eventData: Omit<CustomEvent, 'id'>) => void;
    onDelete: (eventId: string) => void;
    eventToEdit: (CustomEvent & { type: 'custom' }) | null;
    selectedDate: string;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, onUpdate, onDelete, eventToEdit, selectedDate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState('');
    const [color, setColor] = useState(eventColors[0]);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setTitle(eventToEdit.title);
                setDescription(eventToEdit.description || '');
                setTime(eventToEdit.time || '');
                setColor(eventToEdit.color);
            } else {
                setTitle('');
                setDescription('');
                setTime('');
                setColor(eventColors[Math.floor(Math.random() * eventColors.length)]);
            }
        }
    }, [isOpen, eventToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const eventData = {
            date: eventToEdit ? eventToEdit.date : selectedDate,
            title,
            description,
            time,
            color,
        };

        if (eventToEdit) {
            onUpdate(eventToEdit.id, eventData);
        } else {
            onSave(eventData);
        }
        onClose();
    };

    const handleDelete = () => {
        if (eventToEdit) {
            onDelete(eventToEdit.id);
            setIsDeleteConfirmOpen(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm" aria-modal="true" role="dialog">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg m-4" role="document">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{eventToEdit ? 'Editar Evento' : 'Añadir Evento'}</h2>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"><XIcon /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="event-title" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Título</label>
                            <input id="event-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="event-time" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Hora (Opcional)</label>
                            <input id="event-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="event-description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Descripción (Opcional)</label>
                            <textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {eventColors.map(c => (
                                    <button key={c} type="button" onClick={() => setColor(c)} style={{ backgroundColor: c }} className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-800' : ''}`} />
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <div>
                                {eventToEdit && (
                                    <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} className="flex items-center text-red-600 hover:text-red-800 font-semibold py-2 px-4 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">
                                        <TrashIcon className="w-4 h-4 mr-2" />Eliminar
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Cancelar</button>
                                <button type="submit" className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700">
                                    <PlusIcon className="w-5 h-5 mr-2" />{eventToEdit ? 'Guardar Cambios' : 'Añadir Evento'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            {eventToEdit && (
                <ConfirmDeleteModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={handleDelete}
                    title="Eliminar Evento"
                    message={`¿Está seguro de que desea eliminar el evento "${eventToEdit.title}"?`}
                />
            )}
        </>
    );
};


// --- Main Calendar Component ---
interface CalendarViewProps {
    classes: Class[];
    instruments: EvaluationInstrument[];
    customEvents: CustomEvent[];
    onAddEvent: (eventData: Omit<CustomEvent, 'id'>) => void;
    onUpdateEvent: (eventId: string, eventData: Omit<CustomEvent, 'id'>) => void;
    onDeleteEvent: (eventId: string) => void;
    onInstrumentClick?: (instrumentId: string) => void;
}

type CalendarEventItem = (
    | { type: 'instrument'; data: EvaluationInstrument }
    | { type: 'custom'; data: CustomEvent }
    | { type: 'schedule'; data: ScheduleEventData }
);

export const CalendarView: React.FC<CalendarViewProps> = ({ classes, instruments, customEvents, onAddEvent, onUpdateEvent, onDeleteEvent, onInstrumentClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMobileDate, setSelectedMobileDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<(CustomEvent & { type: 'custom' }) | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [showSchedule, setShowSchedule] = useState(() => {
        const saved = localStorage.getItem('regis-calendar-showSchedule');
        return saved !== null ? saved === 'true' : true;
    });

    const toggleSchedule = () => {
        setShowSchedule(prev => {
            const next = !prev;
            localStorage.setItem('regis-calendar-showSchedule', String(next));
            return next;
        });
    };

    // Pre-parse all class schedules
    const parsedSchedules = useMemo(() => {
        return classes.map(cls => ({
            cls,
            slots: parseScheduleString(cls.schedule),
        })).filter(x => x.slots.length > 0);
    }, [classes]);

    const selectedDayRef = useRef<HTMLButtonElement>(null);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);

    const eventsByDate = useMemo(() => {
        const eventsMap = new Map<string, CalendarEventItem[]>();

        // Inject schedule events for visible month
        if (showSchedule) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const daysInMonthVal = new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= daysInMonthVal; d++) {
                const date = new Date(year, month, d);
                const dow = date.getDay();
                const dateStr = date.toISOString().split('T')[0];
                for (const { cls, slots } of parsedSchedules) {
                    for (const slot of slots) {
                        if (slot.dayOfWeek === dow) {
                            if (!eventsMap.has(dateStr)) eventsMap.set(dateStr, []);
                            eventsMap.get(dateStr)!.push({
                                type: 'schedule',
                                data: {
                                    className: cls.name,
                                    classId: cls.id,
                                    grade: cls.grade,
                                    section: cls.section,
                                    time: slot.time,
                                    color: cls.color,
                                },
                            });
                        }
                    }
                }
            }
        }

        instruments.forEach(i => {
            const dateStr = i.date;
            if (!eventsMap.has(dateStr)) eventsMap.set(dateStr, []);
            eventsMap.get(dateStr)!.push({ type: 'instrument', data: i });
        });
        customEvents.forEach(e => {
            const dateStr = e.date;
            if (!eventsMap.has(dateStr)) eventsMap.set(dateStr, []);
            eventsMap.get(dateStr)!.push({ type: 'custom', data: e });
        });
        // Sort each day's events chronologically
        for (const [, events] of eventsMap) {
            events.sort((a, b) => getEventSortTime(a).localeCompare(getEventSortTime(b)));
        }

        return eventsMap;
    }, [instruments, customEvents, showSchedule, parsedSchedules, currentDate]);

    const daysInMonth = useMemo(() => {
        const days: (Date | null)[] = [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthStartDay = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon
        const daysInMonthValue = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < monthStartDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonthValue; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    useEffect(() => {
        const today = new Date();
        if (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth()) {
            setSelectedMobileDate(today);
        } else {
            setSelectedMobileDate(firstDayOfMonth);
        }
    }, [currentDate, firstDayOfMonth]);

    useEffect(() => {
        if (selectedDayRef.current) {
            selectedDayRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [selectedMobileDate]);


    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const openAddModal = (date: Date) => {
        setSelectedDate(date.toISOString().split('T')[0]);
        setEventToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (event: CustomEvent) => {
        setSelectedDate(event.date);
        setEventToEdit({ ...event, type: 'custom' });
        setIsModalOpen(true);
    };

    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const getClassColor = (classId: string) => {
        return classes.find(c => c.id === classId)?.color || '#78716c';
    }

    const daysForMobileSelector = useMemo(() => {
        const days: Date[] = [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonthValue = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonthValue; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    const selectedDayEvents = useMemo(() => {
        const dateStr = selectedMobileDate.toISOString().split('T')[0];
        return eventsByDate.get(dateStr) || [];
    }, [selectedMobileDate, eventsByDate]);

    return (
        <div className="p-4 sm:p-8">
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-md">
                {/* Header: Month Navigation */}
                <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <ChevronLeftIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
                        {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={toggleSchedule}
                            title={showSchedule ? 'Ocultar horarios de clases' : 'Mostrar horarios de clases'}
                            className={`p-2 rounded-full transition-colors ${showSchedule
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                                <circle cx="16" cy="16" r="2" />
                                <path d="M16 14v1" />
                                <path d="M17.4 17l-.7-.4" />
                            </svg>
                        </button>
                        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                            <ChevronRightIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Desktop Calendar Grid */}
                <div className="hidden md:block">
                    <div className="grid grid-cols-7 gap-1 text-center font-semibold text-slate-600 dark:text-slate-300 text-sm">
                        {weekdays.map(day => <div key={day} className="py-2">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {daysInMonth.map((day, index) => {
                            if (!day) return <div key={`empty-${index}`} className="border border-slate-200 dark:border-slate-700/50 rounded-lg min-h-[120px]"></div>;

                            const dateStr = day.toISOString().split('T')[0];
                            const dayEvents = eventsByDate.get(dateStr) || [];
                            const isToday = new Date().toDateString() === day.toDateString();

                            return (
                                <div key={dateStr} className={`relative border border-slate-200 dark:border-slate-700/50 rounded-lg min-h-[120px] p-2 flex flex-col ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{day.getDate()}</span>
                                        <button onClick={() => openAddModal(day)} className="text-slate-400 hover:text-indigo-500 rounded-full w-6 h-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600">
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-1 space-y-1 overflow-y-auto flex-grow no-scrollbar">
                                        {dayEvents.map((event, i) => {
                                            if (event.type === 'schedule') {
                                                return (
                                                    <div key={`s-${i}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] opacity-80" style={{ backgroundColor: event.data.color + '22', borderLeft: `2px solid ${event.data.color}` }}>
                                                        <span className="font-black shrink-0" style={{ color: event.data.color }}>{event.data.grade}{event.data.section ? ` ${event.data.section}` : ''}</span>
                                                        <span className="truncate text-slate-600 dark:text-slate-300">- {event.data.className}</span>
                                                    </div>
                                                );
                                            }
                                            const eventColor = event.type === 'custom' ? event.data.color : getClassColor(event.data.classId);
                                            return (
                                                <div key={i} onClick={() => {
                                                    if (event.type === 'custom') openEditModal(event.data);
                                                    if (event.type === 'instrument' && onInstrumentClick) onInstrumentClick(event.data.id);
                                                }}
                                                    className={`p-1.5 rounded text-xs text-white ${event.type === 'custom' || event.type === 'instrument' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                                    style={{ backgroundColor: eventColor }}>
                                                    <p className="font-bold truncate">{event.type === 'instrument' ? event.data.name : event.data.title}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Calendar List View */}
                <div className="md:hidden">
                    {/* Day Selector Strip */}
                    <div className="flex items-center space-x-2 pb-2 -mx-4 px-4 overflow-x-auto no-scrollbar">
                        {daysForMobileSelector.map(day => {
                            const isSelected = day.toDateString() === selectedMobileDate.toDateString();
                            const isToday = day.toDateString() === new Date().toDateString();

                            return (
                                <button
                                    key={day.toISOString()}
                                    ref={isSelected ? selectedDayRef : null}
                                    onClick={() => setSelectedMobileDate(day)}
                                    className={`flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-lg transition-colors w-16 h-20 ${isSelected
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : isToday
                                            ? 'bg-white dark:bg-slate-800 ring-2 ring-indigo-500 text-indigo-600 dark:text-indigo-300'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="text-xs uppercase font-semibold opacity-80">{weekdays[day.getDay()]}</span>
                                    <span className="text-2xl font-bold">{day.getDate()}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Event List for Selected Day */}
                    <div className="mt-4 min-h-[300px]">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">
                            Eventos para el {selectedMobileDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                        </h3>
                        {selectedDayEvents.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDayEvents.map((event, i) => {
                                    if (event.type === 'schedule') {
                                        return (
                                            <div key={`s-${i}`} className="flex items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 shadow-sm border-l-4" style={{ borderLeftColor: event.data.color }}>
                                                <div className="flex-shrink-0 mr-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: event.data.color + '22' }}>
                                                        <span className="text-xs font-black" style={{ color: event.data.color }}>{event.data.grade}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{event.data.grade}{event.data.section ? ` ${event.data.section}` : ''} - {event.data.className}</p>
                                                    {event.data.time && (
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{event.data.time}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    const eventColor = event.type === 'custom' ? event.data.color : getClassColor(event.data.classId);
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                if (event.type === 'custom') openEditModal(event.data);
                                                if (event.type === 'instrument' && onInstrumentClick) onInstrumentClick(event.data.id);
                                            }}
                                            className={`flex items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 shadow-sm border-l-4 ${event.type === 'custom' || event.type === 'instrument' ? 'cursor-pointer' : ''}`}
                                            style={{ borderLeftColor: eventColor }}
                                        >
                                            <div className="flex-shrink-0 mr-3">
                                                {event.type === 'custom' ? <PencilIcon className="w-5 h-5 text-slate-500" /> : <DocumentTextIcon className="w-5 h-5 text-slate-500" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-100">{event.type === 'instrument' ? event.data.name : event.data.title}</p>
                                                {event.type === 'custom' && event.data.time && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{event.data.time}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-slate-500 dark:text-slate-400">No hay eventos para este día.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FAB for Mobile */}
            <button
                onClick={() => openAddModal(selectedMobileDate)}
                className="md:hidden fixed bottom-32 right-4 sm:right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900"
                title="Añadir Evento"
                aria-label="Añadir nuevo evento"
            >
                <PlusIcon className="w-8 h-8" />
            </button>

            <EventFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onAddEvent}
                onUpdate={onUpdateEvent}
                onDelete={onDeleteEvent}
                eventToEdit={eventToEdit}
                selectedDate={selectedDate}
            />
        </div>
    );
};
