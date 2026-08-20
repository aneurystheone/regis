import React from 'react';
import {
    DocumentTextIcon,
    ChartBarIcon,
    SparklesIcon,
    UserPlusIcon,
    MicrophoneIcon,
    ChatBubbleBottomCenterTextIcon,
    VicenteIcon,
    PresentationChartBarIcon
} from '../icons';
import type { AIFeatures } from '../../types';

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
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 tracking-tight flex items-center gap-2">
                    <VicenteIcon className="w-7 h-7 text-amber-500" />
                    Configuración IA - Vicente
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Gestiona y habilita los módulos de Inteligencia Artificial para los docentes.</p>
            </div>

            {/* Grupo 1: IA Vicente (Asistente Principal) */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                    🤖 Asistente Virtual - IA Vicente
                </h3>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                    <AIToggle
                        icon={<VicenteIcon className="w-6 h-6 text-amber-500" />}
                        title="IA Vicente (Panel & Sugerencias Proactivas)"
                        description="Habilita las alertas proactivas, la asistencia situacional y el chat de IA Vicente en el Panel."
                        isActive={aiFeatures.vicenteAssistant}
                        onToggle={() => setAiFeatures({ ...aiFeatures, vicenteAssistant: !aiFeatures.vicenteAssistant })}
                    />
                </div>
            </div>

            {/* Grupo 2: Módulo de Planificación */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                    📅 Módulo de Planificación Pedagógica
                </h3>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                    <AIToggle
                        icon={<PresentationChartBarIcon className="w-6 h-6 text-indigo-500" />}
                        title="Planificación de Clases (Planificador)"
                        description="Generación automatizada de secuencias didácticas y planes de clase basados en el currículo."
                        isActive={aiFeatures.lessonPlanning}
                        onToggle={() => setAiFeatures({ ...aiFeatures, lessonPlanning: !aiFeatures.lessonPlanning })}
                    />
                </div>
            </div>

            {/* Grupo 3: Herramientas Inteligentes de Aula */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                    ✨ Herramientas Inteligentes de Evaluación y Análisis
                </h3>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                    <AIToggle
                        icon={<DocumentTextIcon className="w-6 h-6 text-indigo-500" />}
                        title="Resumen de Estudiantes"
                        description="Genera resúmenes automáticos del progreso y desempeño por estudiante."
                        isActive={aiFeatures.summaryGeneration}
                        onToggle={() => setAiFeatures({ ...aiFeatures, summaryGeneration: !aiFeatures.summaryGeneration })}
                    />
                    <AIToggle
                        icon={<ChartBarIcon className="w-6 h-6 text-emerald-500" />}
                        title="Sugerencia de Criterios"
                        description="Vicente sugiere criterios de evaluación y rúbricas para los instrumentos."
                        isActive={aiFeatures.criteriaGeneration}
                        onToggle={() => setAiFeatures({ ...aiFeatures, criteriaGeneration: !aiFeatures.criteriaGeneration })}
                    />
                    <AIToggle
                        icon={<UserPlusIcon className="w-6 h-6 text-blue-500" />}
                        title="Extractor de Estudiantes"
                        description="Reconocimiento óptico (OCR) de listas impresas para matricular estudiantes automáticamente."
                        isActive={aiFeatures.studentExtraction}
                        onToggle={() => setAiFeatures({ ...aiFeatures, studentExtraction: !aiFeatures.studentExtraction })}
                    />
                    <AIToggle
                        icon={<MicrophoneIcon className="w-6 h-6 text-rose-500" />}
                        title="Análisis de Audio"
                        description="Transcripción y categorización inteligente de observaciones de aula grabadas por voz."
                        isActive={aiFeatures.audioAnalysis}
                        onToggle={() => setAiFeatures({ ...aiFeatures, audioAnalysis: !aiFeatures.audioAnalysis })}
                    />
                </div>
            </div>
        </div>
    );
};

export default AISettings;
