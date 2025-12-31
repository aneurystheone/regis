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

            {/* Ajustes */}
            <button
                onClick={() => handleNavigate('SETTINGS')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${currentView === 'SETTINGS'
                    ? 'bg-brand-primary/10 text-brand-primary dark:text-brand-secondary'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
            >
                <CogIcon className="w-5 h-5" />
                <span>Ajustes</span>
            </button>

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
