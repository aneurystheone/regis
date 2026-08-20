/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string
    readonly VITE_FIREBASE_MEASUREMENT_ID: string
    readonly VITE_RECAPTCHA_SITE_KEY: string
    readonly VITE_STRIPE_PUBLISHABLE_KEY: string
    readonly VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY: string
    readonly VITE_APP_URL: string
    readonly GEMINI_API_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare const __BUILD_DATE__: string;
declare const __APP_VERSION__: string;
