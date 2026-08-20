import React, { useState } from 'react';
import { MenuIcon, SearchIcon, ChevronLeftIcon } from './icons';
import { ProfileDropdownMenu } from './ProfileDropdownMenu';
import { Avatar } from './Avatar';
import type { View, Class } from '../types';
import { ClassSelector } from './ClassSelector';

interface HeaderProps {
  title: React.ReactNode;
  userName: string;
  userAvatar?: string;
  onMenuClick: () => void;
  onSearchClick: () => void;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  currentView: View;
  connectionStatus?: 'online' | 'offline';
  classes?: Class[];
  selectedClassId?: string | null;
  onSelectClass?: (classId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  userName,
  userAvatar,
  onMenuClick,
  onSearchClick,
  onNavigate,
  onLogout,
  currentView,
  connectionStatus,
  classes,
  selectedClassId,
  onSelectClass
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-slate-800 p-4 md:py-2 md:px-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
        <button
          onClick={onMenuClick}
          className="md:hidden text-slate-400 hover:text-brand-primary p-2 rounded-xl hover:bg-brand-bg transition-all"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>

        {currentView !== 'DASHBOARD' && (
          <button
            onClick={() => {
              if (currentView === 'COURSE_DASHBOARD') {
                onNavigate('CLASSES');
              } else if (currentView === 'CLASSES') {
                onNavigate('DASHBOARD');
              } else if (['STUDENTS', 'ATTENDANCE', 'GRADEBOOK_GRADES', 'GRADEBOOK_INSTRUMENTS', 'GRADEBOOK_COMPETENCIES', 'REPORTS'].includes(currentView)) {
                onNavigate('COURSE_DASHBOARD');
              } else if (currentView === 'ADMIN_DASHBOARD') {
                onNavigate('DASHBOARD');
              } else {
                onNavigate('BACK' as View);
              }
            }}
            className="hidden md:flex items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-brand-primary hover:bg-brand-bg transition-all flex-shrink-0"
            aria-label="Volver"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        )}

        <h2 className="text-lg md:text-xl font-black text-brand-primary dark:text-slate-100 truncate tracking-tight flex-shrink-0">{title}</h2>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onSearchClick}
          className="text-slate-400 hover:text-brand-primary p-2.5 rounded-xl hover:bg-brand-bg transition-all"
          aria-label="Búsqueda"
        >
          <SearchIcon className="w-5 h-5" />
        </button>

        {classes && selectedClassId && onSelectClass && classes.length > 0 && [
          'REPORTS', 'COURSE_DASHBOARD', 'STUDENTS', 'ATTENDANCE',
          'GRADEBOOK_GRADES', 'GRADEBOOK_INSTRUMENTS', 'GRADEBOOK_COMPETENCIES'
        ].includes(currentView) && (
          <div className="hidden md:block w-48 lg:w-56">
            <ClassSelector
              classes={classes}
              selectedClassId={selectedClassId}
              onSelectClass={onSelectClass}
              size="small"
            />
          </div>
        )}

        <div className="h-8 w-px bg-slate-100 dark:bg-slate-700 mx-1"></div>

        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center p-1 rounded-xl hover:bg-brand-bg dark:hover:bg-slate-700 transition-all group"
            aria-label="Perfil del docente"
          >
            <Avatar
              name={userName}
              src={userAvatar}
              size="md"
              className="rounded-xl border-2 border-brand-bg dark:border-slate-600 shadow-sm group-hover:border-brand-secondary transition-all"
              status={connectionStatus}
            />
          </button>

          <ProfileDropdownMenu
            isOpen={isProfileMenuOpen}
            onClose={() => setIsProfileMenuOpen(false)}
            onNavigate={onNavigate}
            onLogout={onLogout}
            currentView={currentView}
          />
        </div>
      </div>
    </header>
  );
};