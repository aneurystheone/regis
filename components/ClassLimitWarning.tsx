import React from 'react';
import { SparklesIcon, LockClosedIcon } from './icons';
import { SUBSCRIPTION_LIMITS, WARNING_THRESHOLDS } from '../config/limits';

interface ClassLimitWarningProps {
    currentCount: number;
    isPremium: boolean;
    isGrandfathered: boolean;
    onUpgradeClick?: () => void;
}

export const ClassLimitWarning: React.FC<ClassLimitWarningProps> = ({
    currentCount,
    isPremium,
    isGrandfathered,
    onUpgradeClick
}) => {
    // Don't show for premium or grandfathered users
    if (isPremium || isGrandfathered) return null;

    const limit = SUBSCRIPTION_LIMITS.FREE.MAX_CLASSES;
    const remaining = Math.max(0, limit - currentCount);

    // Limit reached - show blocking message
    if (remaining === 0) {
        return (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                    <LockClosedIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                            🔒 Límite de Clases Alcanzado
                        </h4>
                        <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                            Has creado <strong>{currentCount} clases</strong>, el máximo del plan gratuito.
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                            Mejora a <strong>Premium</strong> para obtener:
                        </p>
                        <ul className="text-sm text-amber-700 dark:text-amber-400 mt-1 space-y-0.5 ml-4">
                            <li>✅ Clases ilimitadas</li>
                            <li>✅ IA Vicente ilimitada (10 → ∞)</li>
                            <li>✅ Soporte prioritario</li>
                        </ul>
                        <button
                            onClick={onUpgradeClick}
                            className="mt-3 w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all text-sm"
                        >
                            Ver Planes Premium - Solo $7/mes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Warning (≤2 classes remaining)
    if (remaining <= WARNING_THRESHOLDS.CLASSES_LEFT_WARNING) {
        return (
            <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                <div className="flex items-start gap-2">
                    <SparklesIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                            ⚠️ Te {remaining === 1 ? 'queda' : 'quedan'} {remaining} {remaining === 1 ? 'clase' : 'clases'} en el plan gratuito
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Considera{' '}
                            <button
                                onClick={onUpgradeClick}
                                className="font-bold underline hover:text-yellow-900 dark:hover:text-yellow-100"
                            >
                                mejorar a Premium
                            </button>{' '}
                            para clases ilimitadas.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Info badge (showing progress)
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
                {currentCount}/{limit} clases
            </span>
            {currentCount >= 4 && (
                <span className="text-slate-500 dark:text-slate-400">
                    • Plan Gratuito
                </span>
            )}
        </div>
    );
};
