
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Circle,
    BookOpen,
    UserPlus,
    ClipboardList,
    FileText,
    Sparkles,
    X,
    ChevronRight,
    Trophy,
    Calendar
} from 'lucide-react';
import { OnboardingMissions } from '../../types';

interface MissionChecklistProps {
    missions: OnboardingMissions;
    onMissionClick: (missionId: keyof OnboardingMissions) => void;
    onDismiss: () => void;
}

export const MissionChecklist: React.FC<MissionChecklistProps> = ({
    missions,
    onMissionClick,
    onDismiss
}) => {
    const missionItems = [
        {
            id: 'profileSetup' as keyof OnboardingMissions,
            label: 'Agrega tu horario y centro',
            icon: Calendar,
            done: missions.profileSetup
        },
        {
            id: 'classesCreated' as keyof OnboardingMissions,
            label: 'Configura tus cursos',
            icon: BookOpen,
            done: missions.classesCreated
        },
        {
            id: 'studentsImported' as keyof OnboardingMissions,
            label: 'Recluta a tus estudiantes',
            icon: UserPlus,
            done: missions.studentsImported
        },
        {
            id: 'firstAttendance' as keyof OnboardingMissions,
            label: 'Pasa tu primera lista',
            icon: ClipboardList,
            done: missions.firstAttendance
        },
        {
            id: 'firstInstrument' as keyof OnboardingMissions,
            label: 'Crea tu primer instrumento',
            icon: Sparkles,
            done: missions.firstInstrument
        },
        {
            id: 'firstReport' as keyof OnboardingMissions,
            label: 'Genera tu reporte mágico',
            icon: FileText,
            done: missions.firstReport
        },
    ];

    const completedCount = missionItems.filter(m => m.done).length;
    const progress = (completedCount / missionItems.length) * 100;
    const allDone = completedCount === missionItems.length;

    // Prioritize uncompleted missions and only show the top 3
    const displayedMissions = [...missionItems]
        .sort((a, b) => {
            if (a.done === b.done) return 0;
            return a.done ? 1 : -1;
        })
        .slice(0, 3);

    if (allDone) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none overflow-hidden relative"
            >
                <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-300" />
                            <h3 className="text-lg font-black tracking-tight">¡Eres un Maestro Pro!</h3>
                        </div>
                        <p className="text-sm opacity-90 font-medium">Has completado todas tus misiones iniciales.</p>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* Decorative sparkles */}
                <Sparkles className="absolute -bottom-2 -right-2 w-24 h-24 opacity-20 rotate-12" />
            </motion.div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-200/50 dark:border-slate-700/50 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        Tu Camino al Éxito <Sparkles className="w-3 h-3 text-indigo-500" />
                    </h3>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        Misiones de Onboarding
                    </p>
                </div>
                <button
                    onClick={onDismiss}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Progress Area */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    <span>Progreso Total</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                </div>
            </div>

            {/* Mission List */}
            <div className="grid gap-2">
                {displayedMissions.map((mission, index) => (
                    <button
                        key={mission.id}
                        disabled={mission.done}
                        onClick={() => onMissionClick(mission.id)}
                        className={`group flex items-center gap-4 p-3 rounded-2xl transition-all text-left
                            ${mission.done
                                ? 'bg-emerald-50 dark:bg-emerald-900/10 opacity-70 cursor-default'
                                : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:scale-[1.02]'}`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors
                            ${mission.done
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                            {mission.done ? <CheckCircle2 className="w-6 h-6" /> : <mission.icon className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${mission.done ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                {mission.label}
                            </p>
                            {!mission.done && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Click para comenzar mission</p>
                            )}
                        </div>

                        {!mission.done && (
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                        )}
                    </button>
                ))}
            </div>

            <p className="text-[10px] text-center text-slate-400 font-medium italic">
                Completa misiones para convertirte en un experto en Regis.
            </p>
        </div>
    );
};
