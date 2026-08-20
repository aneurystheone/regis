// Subscription Limits Configuration
// Centralizes all subscription tier limits for consistency across the app

export const SUBSCRIPTION_LIMITS = {
    FREE: {
        MAX_CLASSES: 10,
        STUDENT_EXTRACTIONS_PER_MONTH: 10,
    },
    PREMIUM: {
        MAX_CLASSES: Infinity,
        STUDENT_EXTRACTIONS_PER_MONTH: Infinity,
    },
} as const;

export const WARNING_THRESHOLDS = {
    CLASSES_LEFT_WARNING: 2,  // Show warning when ≤2 classes remaining
    EXTRACTIONS_LEFT_WARNING: 3,  // Show warning when ≤3 extractions remaining
} as const;

// Helper type for limit checks
export type LimitCheckResult = {
    canCreate: boolean;
    current: number;
    limit: number;
    remaining: number;
    reason?: 'free_limit_reached' | 'grandfathered' | 'premium';
};
