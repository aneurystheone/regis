import React from 'react';
import type { PricingPlan } from '../types';
import { CheckIcon, SparklesIcon } from './icons';

interface PricingCardProps {
    plan: PricingPlan;
    current?: boolean;
    onSelect?: () => void;
    isLoading?: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({
    plan,
    current = false,
    onSelect,
    isLoading = false,
}) => {
    const isPremium = plan.tier === 'premium';
    const isFree = plan.tier === 'free';

    return (
        <div
            className={`relative rounded-2xl border-2 p-6 transition-all ${isPremium
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 shadow-xl'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
        >
            {isPremium && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        <SparklesIcon className="w-3 h-3" />
                        POPULAR
                    </span>
                </div>
            )}

            <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                    {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                        ${plan.price}
                    </span>
                    {plan.interval && (
                        <span className="text-slate-500 dark:text-slate-400 text-sm">
                            /{plan.interval === 'month' ? 'mes' : 'año'}
                        </span>
                    )}
                </div>
            </div>

            <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                ))}
            </ul>

            {current ? (
                <button
                    disabled
                    className="w-full py-3 px-4 rounded-lg font-bold text-sm bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                >
                    Plan Actual
                </button>
            ) : onSelect ? (
                <button
                    onClick={onSelect}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all ${isPremium
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                            : 'bg-slate-600 hover:bg-slate-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? 'Procesando...' : isFree ? 'Cambiar a Gratis' : 'Mejorar a Premium'}
                </button>
            ) : null}
        </div>
    );
};
