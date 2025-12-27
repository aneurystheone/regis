import React from 'react';
import { MenuIcon, SearchIcon } from './icons';

interface HeaderProps {
  title: React.ReactNode;
  userName: string;
  userAvatar?: string;
  onMenuClick: () => void;
  onSearchClick: () => void;
  onProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, userName, userAvatar, onMenuClick, onSearchClick, onProfileClick }) => {
  const defaultAvatar = "https://ui-avatars.com/api/?name=" + encodeURIComponent(userName) + "&background=1F3A5F&color=fff";

  return (
    <header className="bg-white dark:bg-slate-800 p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center overflow-hidden">
        <button 
          onClick={onMenuClick} 
          className="md:hidden mr-4 text-slate-400 hover:text-brand-primary p-2 rounded-xl hover:bg-brand-bg transition-all"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>
        <h2 className="text-lg md:text-xl font-black text-brand-primary dark:text-slate-100 truncate tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onSearchClick} 
          className="text-slate-400 hover:text-brand-primary p-2.5 rounded-xl hover:bg-brand-bg transition-all"
          aria-label="Búsqueda"
        >
          <SearchIcon className="w-5 h-5" />
        </button>
        
        <div className="h-8 w-px bg-slate-100 dark:bg-slate-700 mx-1"></div>
        
        <button onClick={onProfileClick} className="flex items-center gap-3 p-1 rounded-xl hover:bg-brand-bg dark:hover:bg-slate-700 transition-all group">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-black text-brand-primary dark:text-slate-200 leading-none">{userName}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Maestro</span>
          </div>
          <img
            className="w-10 h-10 rounded-xl object-cover border-2 border-brand-bg dark:border-slate-600 shadow-sm group-hover:border-brand-secondary transition-all"
            src={userAvatar || defaultAvatar}
            alt="User Avatar"
          />
        </button>
      </div>
    </header>
  );
};