import React, { useState, useEffect } from 'react';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useSubscription } from '../contexts/SubscriptionContext';

interface WindowsTitleBarProps {
  planLabel?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  onHelpClick?: () => void;
  onNotificationClick?: () => void;
  showControls?: boolean;
  minimal?: boolean;
  className?: string;
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({
  planLabel = 'Gratis',
  ctaText = 'Actualizar a Premium',
  onCtaClick,
  onHelpClick,
  onNotificationClick,
  showControls,
  minimal = false,
  className = '',
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { isPremium, subscription } = useSubscription();

  const effectiveIsPremium = isPremium || subscription?.tier === 'premium';
  const effectivePlanLabel = effectiveIsPremium ? 'Premium' : planLabel;

  const isElectron = typeof window !== 'undefined' && (
    !!window.electronAPI?.isElectron ||
    (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron'))
  );

  const displayControls = showControls !== undefined ? showControls : isElectron;

  useEffect(() => {
    if (!displayControls || !window.electronAPI?.isMaximized) return;

    const checkMaximized = async () => {
      try {
        const maxed = await window.electronAPI?.isMaximized?.();
        setIsMaximized(!!maxed);
      } catch (e) {
        /* ignore */
      }
    };

    checkMaximized();

    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [displayControls]);

  const handleMinimize = () => {
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI?.maximize) {
      window.electronAPI.maximize();
      if (window.electronAPI.isMaximized) {
        const maxed = await window.electronAPI.isMaximized();
        setIsMaximized(maxed);
      }
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.close) {
      window.electronAPI.close();
    }
  };

  return (
    <header
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className={`h-11 w-full bg-slate-100 dark:bg-[#16151a] border-b border-slate-200 dark:border-[#292830] flex items-center justify-between px-3 select-none text-slate-800 dark:text-zinc-200 z-50 sticky top-0 transition-colors ${className}`}
    >
      {/* Left side: Logo & Optional Plan Badge */}
      <div className="flex items-center gap-2.5">
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <img
            src="/logo.png"
            alt="REGIS Logo"
            className="w-5 h-5 object-contain"
            onError={(e) => {
              // Fallback to text logo if logo image missing
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight leading-none font-sans">
            REGIS
          </span>
        </div>

        {/* Badge: (✓ Gratis / ✨ Premium) */}
        {!minimal && (
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-inner tracking-wide cursor-default select-none transition-all ${
              effectiveIsPremium
                ? 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-600 dark:text-amber-300 border border-amber-400/40 dark:border-amber-400/30 font-bold'
                : 'bg-slate-200 dark:bg-[#282730] text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-[#3c3a47]'
            }`}
          >
            <span className={effectiveIsPremium ? 'text-amber-500 font-bold text-[10px]' : 'text-slate-500 dark:text-zinc-400 font-bold text-[10px]'}>
              {effectiveIsPremium ? '✨' : '✓'}
            </span>
            <span>{effectivePlanLabel}</span>
          </div>
        )}
      </div>

      {/* Right side: Actions & Window controls */}
      <div className="flex items-center gap-2">
        {!minimal && (
          <>
            {/* Sync status indicator */}
            <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <SyncStatusIndicator />
            </div>

            {/* Action / Buy Button (Hidden if Premium) */}
            {onCtaClick && !effectiveIsPremium && (
              <button
                type="button"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                onClick={onCtaClick}
                className="bg-amber-400 hover:bg-amber-500 active:bg-amber-600 dark:bg-[#fbbd38] dark:hover:bg-[#e0a72f] dark:active:bg-[#c99525] text-slate-950 font-bold text-xs px-4 py-1.5 rounded-full transition-colors shadow-sm cursor-pointer whitespace-nowrap mr-1"
              >
                {ctaText}
              </button>
            )}

            {/* Bell / Notifications Icon */}
            {onNotificationClick && (
              <button
                type="button"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                onClick={onNotificationClick}
                title="Notificaciones"
                className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#282730] transition-colors relative cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
              </button>
            )}

            {/* Help / Question Icon */}
            {onHelpClick && (
              <button
                type="button"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                onClick={onHelpClick}
                title="Ayuda"
                className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#282730] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            {/* Separator */}
            {displayControls && <div className="h-4 w-px bg-slate-300 dark:bg-[#2d2c36] mx-0.5" />}
          </>
        )}

        {/* Window Controls */}
        {displayControls && (
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center ml-1"
          >
            {/* Minimize */}
            <button
              type="button"
              onClick={handleMinimize}
              title="Minimizar"
              className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#282730] rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                <rect x="2" y="8" width="12" height="1.5" rx="0.75" />
              </svg>
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              onClick={handleMaximize}
              title={isMaximized ? 'Restaurar' : 'Maximizar'}
              className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#282730] rounded-md transition-colors"
            >
              {isMaximized ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16" strokeWidth="1.5">
                  <path d="M4.5 2.5h7a1 1 0 011 1v7m-3-5h-7a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1v-7a1 1 0 00-1-1z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16" strokeWidth="1.5">
                  <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              title="Cerrar"
              className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-white hover:bg-red-600 rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16" strokeWidth="1.75">
                <path strokeLinecap="round" d="M3.5 3.5l9 9m0-9l-9 9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
