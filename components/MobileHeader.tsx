import React, { useState } from 'react';
import { SearchIcon, ChevronLeftIcon } from './icons';
import { Avatar } from './Avatar';
import { ProfileDropdownMenu } from './ProfileDropdownMenu';
import type { View } from '../types';

interface MobileHeaderProps {
    userName: string;
    userAvatar?: string;
    onSearchClick: () => void;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    currentView: View;
    title: string;
    connectionStatus?: 'online' | 'offline';
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    userName,
    userAvatar,
    onSearchClick,
    onNavigate,
    onLogout,
    currentView,
    title,
    connectionStatus
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const isDashboard = currentView === 'DASHBOARD';

    return (
        <header className="md:hidden flex flex-col bg-white dark:bg-slate-800 p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-40 space-y-4">
            <div className="flex justify-between items-center">
                {/* Left Section: Logo (Dashboard) or Back + Title (Others) */}
                <div className="flex items-center flex-1 overflow-hidden mr-2">
                    {isDashboard ? (
                        <>
                            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-primary/20 p-1 mr-3">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
                            </div>
                            <h1 className="text-xl font-black tracking-tighter text-brand-primary dark:text-white">REGIS</h1>
                        </>
                    ) : (
                        <>
                            {/* Back Button - Logic for "Back" is tricky without history, but usually means going to Dashboard or previous view. 
                   For now, let's make it go to Dashboard if it's a main view, or maybe just purely visual/contextual?
                   The user asked for "return arrow", implying navigation.
                   I will make it navigate to Dashboard for now as a safe default "Back".
               */}
                            <button
                                onClick={() => onNavigate('DASHBOARD')}
                                className="mr-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h1>
                        </>
                    )}
                </div>

                {/* Right Section: Actions + Profile */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search Icon (Only on NON-Dashboard views) */}
                    {!isDashboard && (
                        <button
                            onClick={onSearchClick}
                            className="p-2 text-slate-400 hover:text-brand-primary rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <SearchIcon className="w-5 h-5" />
                        </button>
                    )}

                    {/* User Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center"
                        >
                            <Avatar
                                name={userName}
                                src={userAvatar}
                                size="sm"
                                className="rounded-full border-2 border-slate-100 dark:border-slate-600"
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
            </div>

            {/* Global Search Bar - Only on Dashboard */}
            {isDashboard && (
                <button
                    onClick={onSearchClick}
                    className="flex items-center w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 group transition-all active:scale-[0.99]"
                >
                    <SearchIcon className="w-5 h-5 mr-3 group-hover:text-brand-primary transition-colors" />
                    <span className="text-sm font-medium">Buscar estudiantes...</span>
                </button>
            )}
        </header>
    );
};

