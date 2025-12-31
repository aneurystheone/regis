import React, { useState, useRef, useEffect } from 'react';
import { UserCircleIcon, CalendarIcon, CogIcon, MoonIcon, RecycleBinIcon, ArrowRightOnRectangleIcon, ChevronDownIcon, SparklesIcon } from './icons';
import type { View } from '../types';

interface ProfileDropdownMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    currentView: View;
}

export const ProfileDropdownMenu: React.FC<ProfileDropdownMenuProps> = ({
    isOpen,
    onClose,
    onNavigate,
    onLogout,
    currentView
}) => {
    const [isAjustesExpanded, setIsAjustesExpanded] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleNavigate = (view: View) => {
        onNavigate(view);
        onClose();
    };

    const handleLogout = () => {
        onLogout();
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[70] animate-in fade-in slide-in-from-top-2 duration-200"
        >
            {/* Perfil */}
            <button
                onClick={() => handleNavigate('TEACHER_PROFILE')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${currentView === 'TEACHER_PROFILE'
                    ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-secondary'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
            >
                <UserCircleIcon className="w-5 h-5" />
                <span>Perfil</span>
            </button>

            {/* Agenda */}
            <button
                onClick={() => handleNavigate('CALENDAR')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${currentView === 'CALENDAR'
                    ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-secondary'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
            >
                <CalendarIcon className="w-5 h-5" />
                <span>Agenda</span>
            </button>

            {/* Ajustes (collapsible) */}
            <div>
                <button
                    onClick={() => setIsAjustesExpanded(!isAjustesExpanded)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors ${['SETTINGS_APPEARANCE', 'SETTINGS_AI', 'SETTINGS_RECYCLE_BIN'].includes(currentView)
                        ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-secondary'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <CogIcon className="w-5 h-5" />
                        <span>Ajustes</span>
                    </div>
                    <ChevronDownIcon
                        className={`w-4 h-4 transition-transform duration-200 ${isAjustesExpanded ? 'rotate-180' : ''
                            }`}
                    />
                </button>

                {/* Ajustes Submenu */}
                {isAjustesExpanded && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-l-2 border-brand-primary/20 ml-4 my-1">
                        <button
                            onClick={() => handleNavigate('SETTINGS_APPEARANCE')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${currentView === 'SETTINGS_APPEARANCE'
                                ? 'text-brand-primary dark:text-brand-secondary'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <MoonIcon className="w-4 h-4" />
                            <span>Apariencia</span>
                        </button>

                        <button
                            onClick={() => handleNavigate('SETTINGS_AI')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${currentView === 'SETTINGS_AI'
                                ? 'text-brand-primary dark:text-brand-secondary'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <SparklesIcon className="w-4 h-4" />
                            <span>Inteligencia Artificial</span>
                        </button>

                        <button
                            onClick={() => handleNavigate('SETTINGS_RECYCLE_BIN')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${currentView === 'SETTINGS_RECYCLE_BIN'
                                ? 'text-brand-primary dark:text-brand-secondary'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <RecycleBinIcon className="w-4 h-4" />
                            <span>Papelera</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>

            {/* Cerrar sesión */}
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span>Cerrar sesión</span>
            </button>
        </div>
    );
};
