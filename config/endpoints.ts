// Centralized API Endpoints & External Integrations Catalog
// Used in Admin Panel and Cloud Functions orchestration

export interface CloudFunctionEndpoint {
    id: string;
    name: string;
    type: 'onCall (HTTPS)' | 'onRequest (Webhook)' | 'Stripe Checkout' | 'Stripe Portal';
    description: string;
    typeBadgeColor: string;
}

export const CLOUD_FUNCTIONS_CATALOG: CloudFunctionEndpoint[] = [
    {
        id: 'callGemini',
        name: 'callGemini',
        type: 'onCall (HTTPS)',
        description: 'Proxy server-side seguro para Google GenAI API.',
        typeBadgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    },
    {
        id: 'createCheckoutSession',
        name: 'createCheckoutSession',
        type: 'Stripe Checkout',
        description: 'Generación de checkout de suscripción mensual Plan Premium.',
        typeBadgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    },
    {
        id: 'createPortalSession',
        name: 'createPortalSession',
        type: 'Stripe Portal',
        description: 'Acceso al portal de facturación de Stripe para Docentes.',
        typeBadgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    },
    {
        id: 'stripeWebhook',
        name: 'stripeWebhook',
        type: 'onRequest (Webhook)',
        description: 'Receptáculo HTTP de eventos de pago y actualización de estado.',
        typeBadgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    }
];

export interface ExternalIntegration {
    name: string;
    details: string;
}

export const EXTERNAL_INTEGRATIONS: ExternalIntegration[] = [
    {
        name: 'Google GenAI API',
        details: 'Modelos: gemini-3.1-flash, gemini-2.0-flash, gemini-1.5-flash'
    },
    {
        name: 'Stripe API',
        details: 'Versión 2023-10-16 • Suscripciones & Webhooks'
    },
    {
        name: 'Firebase SDK (v9+)',
        details: 'Auth, Firestore (Offline-First Cache), Cloud Storage'
    }
];

export const getFunctionUrl = (projectId: string, functionName: string): string => {
    return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
};
