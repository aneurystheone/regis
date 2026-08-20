import React from 'react';
import type { View } from '../types';
import { BookOpenIcon, ClipboardCheckIcon, StarIcon, ChartBarIcon, PresentationChartBarIcon } from './icons';
import { useAdmin } from '../hooks/useAdmin';

interface MobileBottomNavProps {
    currentView: View;
    onNavigate: (view: View) => void;
    selectedClassId?: string | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onNavigate, selectedClassId }) => {
    const isGradebookActive = currentView.startsWith('GRADEBOOK');
    const { isAdmin } = useAdmin();

    const navItems = [
        {
            view: (selectedClassId ? 'COURSE_DASHBOARD' : 'CLASSES') as View,
            label: 'Cursos',
            icon: <BookOpenIcon />,
            isActive: currentView === 'CLASSES' || currentView === 'COURSE_DASHBOARD'
        },
        {
            view: 'ATTENDANCE' as View,
            label: 'Asistencia',
            icon: <ClipboardCheckIcon />,
            isActive: currentView === 'ATTENDANCE'
        },
        // Admin Item (Middle)
        ...(isAdmin ? [{
            view: 'ADMIN_DASHBOARD' as View,
            label: 'Admin',
            icon: <PresentationChartBarIcon />,
            isActive: currentView === 'ADMIN_DASHBOARD'
        }] : []),
        {
            view: 'GRADEBOOK_GRADES' as View,
            label: 'Calificador',
            icon: <StarIcon />,
            isActive: isGradebookActive
        },
        {
            view: 'REPORTS' as View,
            label: 'Reportes',
            icon: <ChartBarIcon />,
            isActive: currentView === 'REPORTS'
        }
    ];

    return (
        <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 pb-safe z-50 rounded-2xl shadow-xl">
            <div className="flex justify-around items-center h-16 relative">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => onNavigate(item.view)}
                        className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 z-10 ${item.isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        {item.isActive && (
                            <div
                                className="absolute inset-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl -z-10 transition-opacity duration-300"
                            />
                        )}
                        <div className={`w-6 h-6 ${item.isActive ? 'transform scale-110 transition-transform' : ''}`}>
                            {item.icon}
                        </div>
                        <span className="text-[10px] font-bold">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};
