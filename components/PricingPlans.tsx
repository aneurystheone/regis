import React, { useState } from 'react';
import { PRICING_PLANS } from '../config/pricing';
import { PricingCard } from './PricingCard';
import { useSubscription } from '../contexts/SubscriptionContext';
import { redirectToCheckout } from '../services/stripe';
import { getCurrentUserId } from '../services/api';
import { XIcon } from './icons';
import { useAlert } from '../contexts/ConfirmationContext';

interface PricingPlansProps {
    onClose?: () => void;
}

export const PricingPlans: React.FC<PricingPlansProps> = ({ onClose }) => {
    const { subscription, isPremium } = useSubscription();
    const [isLoading, setIsLoading] = useState(false);
    const alert = useAlert();

    const handleUpgrade = async (priceId: string) => {
        const userId = getCurrentUserId();
        if (!userId) {
            await alert({ title: 'Atención', message: 'Debes iniciar sesión para mejorar tu plan', type: 'info' });
            return;
        }

        if (!priceId) {
            await alert({ title: 'Error', message: 'Error: Price ID no configurado. Contacta soporte.', type: 'danger' });
            return;
        }

        setIsLoading(true);
        try {
            await redirectToCheckout(priceId, userId);
        } catch (error) {
            console.error('Error during checkout:', error);
            await alert({ title: 'Error', message: 'Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.', type: 'danger' });
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white">
                        Elige tu Plan
                    </h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="ml-auto p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                    Desbloquea todo el potencial de REGIS con IA Vicente
                </p>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {PRICING_PLANS.map((plan) => (
                    <PricingCard
                        key={plan.id}
                        plan={plan}
                        current={subscription.tier === plan.tier}
                        onSelect={
                            plan.tier === 'premium' && !isPremium
                                ? () => handleUpgrade(plan.stripePriceId!)
                                : undefined
                        }
                        isLoading={isLoading}
                    />
                ))}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                <p>Pagos seguros procesados por Stripe</p>
                <p className="mt-2">Cancela en cualquier momento. Sin compromisos a largo plazo.</p>
            </div>
        </div>
    );
};
