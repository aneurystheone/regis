import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
    if (!stripePromise) {
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
            console.error('Stripe publishable key not found');
            return null;
        }
        stripePromise = loadStripe(publishableKey);
    }
    return stripePromise;
};

export interface CheckoutSessionData {
    sessionId: string;
    url: string;
}

/**
 * Opens a URL in an external browser.
 * In native (Capacitor) context: uses @capacitor/browser so the Docente isn't
 * trapped inside the WebView during payment flows.
 * In web context: falls back to window.location.href.
 */
export const openExternalUrl = async (url: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
    } else {
        window.location.href = url;
    }
};

/**
 * Creates a Stripe Checkout Session via Cloud Function
 */
export const createCheckoutSession = async (
    priceId: string,
    userId: string
): Promise<CheckoutSessionData> => {
    const functions = getFunctions();
    const createSession = httpsCallable<
        { priceId: string },
        CheckoutSessionData
    >(functions, 'createCheckoutSession');

    const result = await createSession({ priceId });
    return result.data;
};

/**
 * Redirects to Stripe Checkout.
 * Uses an external browser in native context to avoid trapping the Docente
 * inside the Capacitor WebView during the payment flow.
 */
export const redirectToCheckout = async (priceId: string, userId: string) => {
    try {
        const { url } = await createCheckoutSession(priceId, userId);

        if (url) {
            await openExternalUrl(url);
        } else {
            throw new Error('No checkout URL returned');
        }
    } catch (error) {
        console.error('Error redirecting to checkout:', error);
        throw error;
    }
};

/**
 * Creates a Customer Portal session for managing subscription
 */
export const createPortalSession = async (userId: string): Promise<{ url: string }> => {
    const functions = getFunctions();
    const createPortal = httpsCallable<{}, { url: string }>(
        functions,
        'createPortalSession'
    );

    const result = await createPortal({});
    return result.data;
};
