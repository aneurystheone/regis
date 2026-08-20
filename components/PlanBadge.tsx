import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SparklesIcon } from './icons';

export const PlanBadge: React.FC = () => {
    const { isPremium } = useSubscription();

    if (isPremium) {
        return (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-sm ring-1 ring-white/20">
                <SparklesIcon className="w-3 h-3" />
                <span className="text-[10px] font-black tracking-wider uppercase">PRO</span>
            </div>
        );
    }

    return (
        <div className="flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
            <span className="text-[10px] font-bold tracking-wider uppercase">Gratis</span>
        </div>
    );
};
