import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { Download, RefreshCw, WifiOff, X, CheckCircle2, Smartphone } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const {
    isInstallable,
    isStandalone,
    isOffline,
    needRefresh,
    offlineReady,
    installApp,
    updateServiceWorker,
    dismissInstallPrompt,
    dismissOfflineReady
  } = usePWA();

  const [dismissedInstall, setDismissedInstall] = useState(false);

  // If app is already standalone, don't show install banner
  const showInstall = isInstallable && !dismissedInstall && !isStandalone;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-md w-full sm:w-auto space-y-3 pointer-events-none px-4 sm:px-0">

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="pointer-events-auto bg-amber-600 text-white p-3.5 rounded-2xl shadow-xl border border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-700/50 rounded-xl">
              <WifiOff className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <p className="font-semibold text-sm">Modo sin conexión</p>
              <p className="text-xs text-amber-100/90">Trabajando con datos guardados localmente.</p>
            </div>
          </div>
        </div>
      )}

      {/* App Update Banner */}
      {needRefresh && (
        <div className="pointer-events-auto bg-indigo-900 dark:bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 rounded-xl">
              <RefreshCw className="w-5 h-5 text-indigo-300 animate-spin-slow" />
            </div>
            <div>
              <p className="font-semibold text-sm">Actualización disponible</p>
              <p className="text-xs text-indigo-200/80">Hay una nueva versión de Regis lista.</p>
            </div>
          </div>
          <button
            onClick={updateServiceWorker}
            className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>
      )}

      {/* Offline Ready Toast */}
      {offlineReady && (
        <div className="pointer-events-auto bg-emerald-900 dark:bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="font-semibold text-sm">Listo para usar sin conexión</p>
              <p className="text-xs text-emerald-200/80">Regis ha guardado los archivos principales.</p>
            </div>
          </div>
          <button
            onClick={dismissOfflineReady}
            className="p-1 hover:bg-emerald-800/50 rounded-lg text-emerald-200 transition"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstall && (
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md p-1.5">
                <img src="/logo.avif" alt="Regis" className="w-full h-full object-contain" onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }} />
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Instalar Regis App</h4>
                <p className="text-xs text-slate-400 mt-0.5">Acceso directo y mejor rendimiento</p>
              </div>
            </div>
            <button
              onClick={() => {
                setDismissedInstall(true);
                dismissInstallPrompt();
              }}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setDismissedInstall(true);
                dismissInstallPrompt();
              }}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white font-medium rounded-xl hover:bg-slate-800 transition"
            >
              Ahora no
            </button>
            <button
              onClick={installApp}
              className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
