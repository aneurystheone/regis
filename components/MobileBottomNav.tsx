import React from 'react';
import type { View } from '../types';
import { BookOpenIcon, ClipboardCheckIcon, StarIcon, ChartBarIcon } from './icons';

interface MobileBottomNavProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, setCurrentView }) => {
    const isGradebookActive = currentView.startsWith('GRADEBOOK');

    const navItems = [
        {
            view: 'CLASSES' as View,
            label: 'Cursos',
            icon: <BookOpenIcon />,
            isActive: currentView === 'CLASSES'
        },
        {
            view: 'ATTENDANCE' as View,
            label: 'Asistencia',
            icon: <ClipboardCheckIcon />,
            isActive: currentView === 'ATTENDANCE'
        },
        {
            view: 'GRADEBOOK_GRADES' as View, // Default to grades view
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe z-50">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => setCurrentView(item.view)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${item.isActive
                                ? 'text-brand-primary dark:text-brand-secondary'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
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
