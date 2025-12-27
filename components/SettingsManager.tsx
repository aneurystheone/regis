
import React, { useState } from 'react';
import { SunIcon, MoonIcon, TableCellsIcon, CheckIcon, ExclamationIcon } from './icons';
import type { FontSize } from '../types';
import { uploadCurriculumData } from '../services/curriculumService';

interface SettingsManagerProps {
  activeSubView: 'APPEARANCE';
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  currentUserEmail?: string;
}

const FontSizeButton: React.FC<{
  label: string;
  size: FontSize;
  currentSize: FontSize;
  onClick: (size: FontSize) => void;
}> = ({ label, size, currentSize, onClick }) => (
  <button
    onClick={() => onClick(size)}
    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
      size === currentSize
        ? 'bg-indigo-600 text-white shadow'
        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
    }`}
  >
    {label}
  </button>
);


export const SettingsManager: React.FC<SettingsManagerProps> = ({ isDarkMode, setIsDarkMode, fontSize, setFontSize, currentUserEmail }) => {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const handleMigration = async () => {
      setMigrationStatus('loading');
      try {
          await uploadCurriculumData();
          setMigrationStatus('success');
      } catch (error) {
          setMigrationStatus('error');
      }
  };

  // Allow only specific admin to migrate
  const isAdmin = currentUserEmail === 'aneurystheone@gmail.com';

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Appearance Section */}
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Apariencia</h2>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Modo Oscuro</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Reduce el brillo para una visualización más cómoda.</p>
                </div>
                <div className="flex items-center gap-2">
                    <SunIcon className={`w-6 h-6 ${!isDarkMode ? 'text-yellow-500' : 'text-slate-400'}`} />
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        role="switch"
                        aria-checked={isDarkMode}
                    >
                        <span
                            aria-hidden="true"
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                    </button>
                    <MoonIcon className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-slate-400'}`} />
                </div>
            </div>
            
            <div className="hidden md:flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-6">
                <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tamaño del Texto</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ajuste el tamaño del texto.</p>
                </div>
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <FontSizeButton label="Pequeño" size="sm" currentSize={fontSize} onClick={setFontSize} />
                <FontSizeButton label="Normal" size="base" currentSize={fontSize} onClick={setFontSize} />
                <FontSizeButton label="Grande" size="lg" currentSize={fontSize} onClick={setFontSize} />
                </div>
            </div>
            </div>
        </div>

        {/* Data Management Section - Admin Only */}
        {isAdmin && (
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Gestión de Datos</h2>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                            <TableCellsIcon className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"/>
                            Optimización de Base de Datos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">
                            Cargar el currículo local actualizado a la base de datos (Firestore). 
                            Esto es necesario si ha modificado los archivos en <code>public/data/</code> recientemente.
                        </p>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleMigration}
                                disabled={migrationStatus === 'loading' || migrationStatus === 'success'}
                                className={`flex items-center px-4 py-2 font-bold text-white rounded-lg shadow transition-colors ${
                                    migrationStatus === 'success' ? 'bg-green-500 hover:bg-green-600' : 
                                    migrationStatus === 'error' ? 'bg-red-500 hover:bg-red-600' :
                                    'bg-indigo-600 hover:bg-indigo-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {migrationStatus === 'loading' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                                {migrationStatus === 'success' && <CheckIcon className="w-5 h-5 mr-2" />}
                                {migrationStatus === 'error' && <ExclamationIcon className="w-5 h-5 mr-2" />}
                                
                                {migrationStatus === 'idle' && 'Iniciar Migración a Firestore'}
                                {migrationStatus === 'loading' && 'Migrando...'}
                                {migrationStatus === 'success' && 'Migración Exitosa'}
                                {migrationStatus === 'error' && 'Error (Ver Consola)'}
                            </button>
                        </div>
                        {migrationStatus === 'error' && (
                            <p className="text-xs text-red-500 mt-2">Asegúrese de haber configurado <code>firebase.ts</code> correctamente con sus credenciales.</p>
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
