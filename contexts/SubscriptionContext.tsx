import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserSubscription, AIFeatures } from '../types';
import { api } from '../services/api';
import { SUBSCRIPTION_LIMITS } from '../config/limits';

interface SubscriptionContextType {
    subscription: UserSubscription;
    isPremium: boolean;
    canUseAI: (feature: keyof AIFeatures) => boolean;
    canCreateClass: (currentClassCount: number) => boolean;
    getRemainingClasses: (currentClassCount: number) => number;
    getRemainingExtractions: () => number;
}

const defaultSubscription: UserSubscription = {
    tier: 'free',
    status: 'active',
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'manual'
};

const SubscriptionContext = createContext<SubscriptionContextType>({
    subscription: defaultSubscription,
    isPremium: false,
    canUseAI: () => false,
    canCreateClass: () => true,
    getRemainingClasses: () => SUBSCRIPTION_LIMITS.FREE.MAX_CLASSES,
    getRemainingExtractions: () => SUBSCRIPTION_LIMITS.FREE.STUDENT_EXTRACTIONS_PER_MONTH
});

interface SubscriptionProviderProps {
    children: ReactNode;
    userId: string | null;
    aiFeatures: AIFeatures;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
    children,
    userId,
    aiFeatures
}) => {
    const [subscription, setSubscription] = useState<UserSubscription>(defaultSubscription);

    useEffect(() => {
        if (!userId) {
            setSubscription(defaultSubscription);
            return;
        }

        // Initial load
        api.getSubscription(userId).then(setSubscription);

        // Real-time listener
        const unsubscribe = api.onSubscriptionChange(setSubscription, userId);
        return () => unsubscribe();
    }, [userId]);

    const isPremium = subscription.tier === 'premium' && subscription.status === 'active';

    const canUseAI = (feature: keyof AIFeatures): boolean => {
        // Special case: studentExtraction is available to free users with a monthly limit
        if (feature === 'studentExtraction') {
            // Premium users have unlimited access
            if (isPremium && aiFeatures[feature]) {
                return true;
            }

            // Free users get extractions per month (updated to 10)
            if (aiFeatures[feature]) {
                const usage = subscription.usage?.studentExtractions;
                const FREE_MONTHLY_LIMIT = SUBSCRIPTION_LIMITS.FREE.STUDENT_EXTRACTIONS_PER_MONTH;

                if (!usage) {
                    // First time, allow usage
                    return true;
                }

                // Check if we need to reset (new month)
                const lastReset = new Date(usage.lastReset);
                const now = new Date();
                const needsReset =
                    now.getMonth() !== lastReset.getMonth() ||
                    now.getFullYear() !== lastReset.getFullYear();

                if (needsReset) {
                    // New month, allow usage (will be reset on next extraction)
                    return true;
                }

                // Check if under limit
                return usage.count < FREE_MONTHLY_LIMIT;
            }

            return false;
        }

        // All other AI features require premium
        return isPremium && aiFeatures[feature];
    };

    const canCreateClass = (currentClassCount: number): boolean => {
        // Premium: unlimited classes
        if (isPremium) return true;

        // Grandfathered users: respect existing classes (no new limit)
        if (subscription.grandfathered) return true;

        // Free users: enforce class limit
        return currentClassCount < SUBSCRIPTION_LIMITS.FREE.MAX_CLASSES;
    };

    const getRemainingClasses = (currentClassCount: number): number => {
        // Premium: unlimited
        if (isPremium) return Infinity;

        // Grandfathered: unlimited
        if (subscription.grandfathered) return Infinity;

        // Free: calculate remaining
        return Math.max(0, SUBSCRIPTION_LIMITS.FREE.MAX_CLASSES - currentClassCount);
    };

    const getRemainingExtractions = (): number => {
        // Premium: unlimited
        if (isPremium) return Infinity;

        const usage = subscription.usage?.studentExtractions;
        const limit = SUBSCRIPTION_LIMITS.FREE.STUDENT_EXTRACTIONS_PER_MONTH;

        if (!usage) return limit;

        // Check if needs reset
        const lastReset = new Date(usage.lastReset);
        const now = new Date();
        const needsReset =
            now.getMonth() !== lastReset.getMonth() ||
            now.getFullYear() !== lastReset.getFullYear();

        if (needsReset) return limit;

        return Math.max(0, limit - usage.count);
    };

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            isPremium,
            canUseAI,
            canCreateClass,
            getRemainingClasses,
            getRemainingExtractions
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => useContext(SubscriptionContext);

/**
 * Hook to check if a specific AI feature is available
 * Combines premium status AND admin feature flag
 */
export const useCanUseAI = (feature: keyof AIFeatures): boolean => {
    const { canUseAI } = useSubscription();
    return canUseAI(feature);
};
