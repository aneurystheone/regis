import React from 'react';
import type { View } from '../types';
import { DashboardIcon, ClipboardCheckIcon, ChartBarIcon, BookOpenIcon, StarIcon, ChevronDoubleLeftIcon, PresentationChartBarIcon, SparklesIcon, VicenteIcon } from './icons';
import { useAdmin } from '../hooks/useAdmin';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenGuide?: () => void;
  selectedClassId?: string | null;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}> = ({ icon, label, isActive, onClick, isCollapsed }) => (
  <li
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={`flex items-center p-2.5 my-0.5 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${isActive
      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
      : 'text-slate-500 dark:text-slate-400 hover:bg-brand-bg dark:hover:bg-slate-700 hover:text-brand-primary dark:hover:text-slate-100'
      } ${isCollapsed ? 'justify-center' : ''}`}
  >
    <div className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>{icon}</div>
    <span className={`font-bold whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 ml-0 opacity-0' : 'ml-4 opacity-100'}`}>{label}</span>
  </li>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, onClose, isSidebarCollapsed, onToggleCollapse, selectedClassId }) => {
  const { isAdmin } = useAdmin();

  const isDashboardActive = currentView === 'DASHBOARD';
  const isGradebookActive = currentView.startsWith('GRADEBOOK');

  const handleNavigation = (view: View) => {
    setCurrentView(view);
    onClose();
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-brand-primary/20 backdrop-blur-sm z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      ></div>

      <aside
        className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-800 text-slate-800 p-4 flex flex-col h-full z-40 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 overflow-x-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isSidebarCollapsed ? 'md:w-16' : 'md:w-52 md:shadow-2xl md:shadow-brand-primary/5'}`}
      >
        <nav className={`flex-1 pt-2 ${isSidebarCollapsed ? '' : 'overflow-y-auto no-scrollbar'}`}>
          <ul>
            <NavItem icon={<DashboardIcon />} label="Panel" isActive={isDashboardActive} onClick={() => handleNavigation('DASHBOARD')} isCollapsed={isSidebarCollapsed} />
            <NavItem
              icon={<VicenteIcon className={`w-6 h-6 transition-colors ${currentView === 'VICENTE_CHAT' ? 'text-white' : 'text-amber-400 dark:text-amber-300'}`} />}
              label="IA Vicente"
              isActive={currentView === 'VICENTE_CHAT'}
              onClick={() => handleNavigation('VICENTE_CHAT')}
              isCollapsed={isSidebarCollapsed}
            />
            <NavItem icon={<PresentationChartBarIcon />} label="Planificación" isActive={currentView === 'LESSON_PLANNER'} onClick={() => handleNavigation('LESSON_PLANNER')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={<BookOpenIcon />} label="Cursos" isActive={currentView === 'CLASSES' || currentView === 'COURSE_DASHBOARD'} onClick={() => handleNavigation(selectedClassId ? 'COURSE_DASHBOARD' : 'CLASSES')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={<ClipboardCheckIcon />} label="Asistencia" isActive={currentView === 'ATTENDANCE'} onClick={() => handleNavigation('ATTENDANCE')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={<StarIcon />} label="Calificador" isActive={isGradebookActive} onClick={() => handleNavigation('GRADEBOOK_GRADES')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={<ChartBarIcon />} label="Reportes" isActive={currentView === 'REPORTS'} onClick={() => handleNavigation('REPORTS')} isCollapsed={isSidebarCollapsed} />
            {isAdmin && (
              <NavItem icon={<PresentationChartBarIcon />} label="Admin" isActive={currentView === 'ADMIN_DASHBOARD'} onClick={() => handleNavigation('ADMIN_DASHBOARD')} isCollapsed={isSidebarCollapsed} />
            )}
          </ul>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onToggleCollapse}
            aria-label={isSidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            className={`flex items-center justify-center rounded-xl text-slate-400 hover:text-brand-primary bg-slate-50 dark:bg-slate-700/60 transition-all hover:bg-brand-secondary/10 mx-auto ${isSidebarCollapsed ? 'w-10 h-10 p-0' : 'w-full p-3.5'
              }`}
          >
            <ChevronDoubleLeftIcon className={`w-6 h-6 flex-shrink-0 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>
    </>
  );
};