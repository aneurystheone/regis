import React, { useState } from 'react';
import {
    DocumentTextIcon,
    ChartBarIcon,
    SparklesIcon,
    UserPlusIcon,
    MicrophoneIcon,
    ChatBubbleBottomCenterTextIcon,
    TableCellsIcon,
    CheckIcon,
    ExclamationIcon
} from '../icons';
import type { AIFeatures } from '../../types';
import { uploadCurriculumData } from '../../services/curriculumService';

interface AISettingsProps {
    aiFeatures: AIFeatures;
    setAiFeatures: (features: AIFeatures) => void;
}

const AIToggle: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    isActive: boolean;
    onToggle: () => void;
}> = ({ icon, title, description, isActive, onToggle }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 transition-all hover:shadow-sm">
        <div className="flex items-start gap-4">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-slate-800 dark:text-white">{title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
        </div>
        <button
            onClick={onToggle}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary ${isActive ? 'bg-brand-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    </div>
);

const AISettings: React.FC<AISettingsProps> = ({ aiFeatures, setAiFeatures }) => {
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
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Funciones de IA - Vicente</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Activa o desactiva las capacidades inteligentes de tu asistente docente.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 space-y-4">
                <AIToggle
                    icon={<DocumentTextIcon className="w-6 h-6 text-indigo-500" />}
                    title="Resumen de Estudiantes"
                    description="Genera resúmenes automáticos del progreso y desempeño."
                    isActive={aiFeatures.summaryGeneration}
                    onToggle={() => setAiFeatures({ ...aiFeatures, summaryGeneration: !aiFeatures.summaryGeneration })}
                />
                <AIToggle
                    icon={<ChartBarIcon className="w-6 h-6 text-emerald-500" />}
                    title="Sugerencia de Criterios"
                    description="Vicente sugiere criterios de evaluación para tus instrumentos."
                    isActive={aiFeatures.criteriaGeneration}
                    onToggle={() => setAiFeatures({ ...aiFeatures, criteriaGeneration: !aiFeatures.criteriaGeneration })}
                />
                <AIToggle
                    icon={<SparklesIcon className="w-6 h-6 text-amber-500" />}
                    title="Planificador de Clases"
                    description="Diseña planes de clases completos basados en el currículo."
                    isActive={aiFeatures.lessonPlanning}
                    onToggle={() => setAiFeatures({ ...aiFeatures, lessonPlanning: !aiFeatures.lessonPlanning })}
                />
                <AIToggle
                    icon={<UserPlusIcon className="w-6 h-6 text-blue-500" />}
                    title="Extractor de Estudiantes"
                    description="Lee nombres de estudiantes desde fotos de listas impresas."
                    isActive={aiFeatures.studentExtraction}
                    onToggle={() => setAiFeatures({ ...aiFeatures, studentExtraction: !aiFeatures.studentExtraction })}
                />
                <AIToggle
                    icon={<MicrophoneIcon className="w-6 h-6 text-rose-500" />}
                    title="Análisis de Audio"
                    description="Analiza y categoriza registros anecdóticos grabados."
                    isActive={aiFeatures.audioAnalysis}
                    onToggle={() => setAiFeatures({ ...aiFeatures, audioAnalysis: !aiFeatures.audioAnalysis })}
                />
                <AIToggle
                    icon={<ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-purple-500" />}
                    title="Vicente en Panel"
                    description="Habilita las sugerencias y alertas proactivas en el Panel."
                    isActive={aiFeatures.vicenteAssistant}
                    onToggle={() => setAiFeatures({ ...aiFeatures, vicenteAssistant: !aiFeatures.vicenteAssistant })}
                />
            </div>

            {/* Data Management Section - Admin Only */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Gestión de Datos</h2>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 space-y-6">
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
        </div>
    );
};

export default AISettings;
