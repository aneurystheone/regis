import React, { useState } from 'react';
import { TableCellsIcon, CheckIcon, ExclamationIcon } from '../icons';
import { uploadCurriculumData } from '../../services/curriculumService';

export const CurriculumManagement: React.FC = () => {
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Gestión de Datos del Currículo</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Administra y optimiza la base de datos curricular de la aplicación.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                        <TableCellsIcon className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                        Optimización de Base de Datos
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">
                        Cargar el currículo local actualizado a la base de datos (Firestore).
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleMigration}
                            disabled={migrationStatus === 'loading' || migrationStatus === 'success'}
                            className={`flex items-center px-4 py-2 font-bold text-white rounded-lg shadow transition-colors ${migrationStatus === 'success' ? 'bg-green-500 hover:bg-green-600' :
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
                </div>
            </div>
        </div>
    );
};
