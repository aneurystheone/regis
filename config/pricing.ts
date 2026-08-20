// Pricing Plans Configuration
import type { PricingPlan } from '../types';

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'free',
        name: 'Gratis',
        tier: 'free',
        price: 0,
        interval: null,
        features: [
            'Hasta 50 estudiantes por clase',
            'Gestión básica de asistencia',
            'Calificaciones y reportes básicos',
            'Anécdotas y evidencias',
        ],
    },
    {
        id: 'premium_monthly',
        name: 'Premium',
        tier: 'premium',
        price: 7,
        interval: 'month',
        stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY,
        features: [
            'Estudiantes ilimitados',
            'IA Vicente - Asistente inteligente',
            'Generación automática de reportes',
            'Análisis de audio y evidencias',
            'Extracción automática de listas',
            'Soporte prioritario',
        ],
    },
];

export const getFreePlan = () => PRICING_PLANS.find(p => p.id === 'free')!;
export const getPremiumPlan = () => PRICING_PLANS.find(p => p.id === 'premium_monthly')!;
