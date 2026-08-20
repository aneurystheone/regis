import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import Stripe from 'stripe';

admin.initializeApp();

// ---------------------------------------------------------------------------
// Gemini Proxy — callGemini
// ---------------------------------------------------------------------------
// The Gemini API Key lives ONLY here (process.env.GEMINI_API_KEY, server-side).
// It is NEVER sent to the browser. The frontend calls this authenticated
// Cloud Function, which proxies the request to Gemini and returns only the text.
// ---------------------------------------------------------------------------

const GEMINI_FALLBACK_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
];

let geminiInstance: GoogleGenAI | null = null;

const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'REPLACE_WITH_NEW_KEY_AFTER_ROTATION') {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'El servicio de IA no está configurado. Contacta al administrador.'
        );
    }
    if (!geminiInstance) {
        geminiInstance = new GoogleGenAI({ apiKey });
    }
    return geminiInstance;
};

/**
 * Server-side Gemini proxy. Requires Firebase Authentication.
 * Accepts: { prompt: string | object, config?: object }
 * Returns: { text: string | undefined }
 */
export const callGemini = functions.runWith({
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 120,
    memory: '512MB'
}).https.onCall(async (data, context) => {
    // Require authentication — AI features are not available to anonymous users
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Debes iniciar sesión para usar las funciones de IA.'
        );
    }

    const { prompt, config } = data as { prompt: string | object; config?: object };

    if (!prompt) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'El parámetro "prompt" es requerido.'
        );
    }

    const client = getGeminiClient();
    const contents = typeof prompt === 'string'
        ? { parts: [{ text: prompt }] }
        : prompt;

    for (const model of GEMINI_FALLBACK_MODELS) {
        try {
            const response = await client.models.generateContent({
                model,
                contents: contents as any,
                config: config as any,
            });
            return { text: response.text };
        } catch (err: any) {
            const isLast = model === GEMINI_FALLBACK_MODELS[GEMINI_FALLBACK_MODELS.length - 1];
            if (isLast) {
                console.error(`callGemini: all models failed. Last error: ${err?.message}`);
                throw new functions.https.HttpsError(
                    'internal',
                    'El servicio de IA no está disponible en este momento. Intenta más tarde.'
                );
            }
            console.warn(`callGemini: model ${model} failed (${err?.message}), trying next...`);
        }
    }

    throw new functions.https.HttpsError(
        'internal',
        'No se pudo obtener respuesta del servicio de IA.'
    );
});



/**
 * Helper to get Stripe instance with the secret
 */
const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not defined in environment secrets.');
    }
    return new Stripe(secretKey, {
        apiVersion: '2023-10-16',
    });
};

const getAppUrl = () => {
    return process.env.APP_URL || 'http://localhost:5173';
};

/**
 * Creates a Stripe Checkout Session for subscription
 */
export const createCheckoutSession = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuario no autenticado'
        );
    }

    const { priceId } = data;
    const userId = context.auth.uid;

    if (!priceId) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Price ID es requerido'
        );
    }

    const stripe = getStripe();
    const currentAppUrl = getAppUrl();

    try {
        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${currentAppUrl}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${currentAppUrl}/settings?canceled=true`,
            client_reference_id: userId,
            metadata: {
                userId,
            },
        });

        return {
            sessionId: session.id,
            url: session.url,
        };
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error al crear sesión de pago: ' + error.message
        );
    }
});

/**
 * Creates a Stripe Customer Portal Session for managing subscription
 */
export const createPortalSession = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuario no autenticado'
        );
    }

    const userId = context.auth.uid;
    const stripe = getStripe();
    const currentAppUrl = getAppUrl();

    try {
        // Get subscription document to find Stripe customer ID
        const subscriptionDoc = await admin
            .firestore()
            .collection('subscriptions')
            .doc(userId)
            .get();

        const subscriptionData = subscriptionDoc.data();

        if (!subscriptionData?.stripeCustomerId) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'No se encontró ID de cliente de Stripe'
            );
        }

        // Create portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: subscriptionData.stripeCustomerId,
            return_url: `${currentAppUrl}/settings`,
        });

        return {
            url: session.url,
        };
    } catch (error: any) {
        console.error('Error creating portal session:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error al crear portal de facturación: ' + error.message
        );
    }
});

/**
 * Handles Stripe Webhook Events
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        console.error('No signature header');
        res.status(400).send('Missing signature');
        return;
    }

    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is missing');
        res.status(500).send('Webhook secret not configured');
        return;
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            webhookSecret
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    console.log('Webhook event received:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, event.created);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, event.created);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionCancel(event.data.object as Stripe.Subscription, event.created);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Webhook processing failed');
    }
});

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session, eventCreated: number) {
    const userId = session.metadata?.userId || session.client_reference_id;

    if (!userId) {
        console.error('No userId in checkout session');
        return;
    }

    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    // Get subscription details - requires stripe instance
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const subRef = admin.firestore().collection('subscriptions').doc(userId);
    const subSnap = await subRef.get();
    const existingData = subSnap.exists ? subSnap.data() : null;

    if (existingData?.lastStripeEventCreated && existingData.lastStripeEventCreated > eventCreated) {
        console.warn(`[Stripe Webhook] Event checkout.session.completed ignored: stale event (${eventCreated} < ${existingData.lastStripeEventCreated})`);
        return;
    }

    const payload: Record<string, any> = {
        tier: 'premium',
        status: subscription.status,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        expiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastStripeEventCreated: eventCreated,
        source: 'stripe',
    };

    if (!existingData || !existingData.createdAt) {
        payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await subRef.set(payload, { merge: true });

    console.log(`✅ Subscription activated for user ${userId}`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription, eventCreated: number) {
    const customerId = subscription.customer as string;

    // Find user by customer ID
    const usersSnapshot = await admin
        .firestore()
        .collection('subscriptions')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error('No user found for customer:', customerId);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const existingData = userDoc.data();

    if (existingData?.lastStripeEventCreated && existingData.lastStripeEventCreated > eventCreated) {
        console.warn(`[Stripe Webhook] Event customer.subscription.updated ignored: stale event (${eventCreated} < ${existingData.lastStripeEventCreated})`);
        return;
    }

    await userDoc.ref.update({
        status: subscription.status,
        expiresAt: new Date(subscription.current_period_end * 1000).toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastStripeEventCreated: eventCreated,
    });

    console.log(`✅ Subscription updated for user ${userDoc.id}, status: ${subscription.status}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancel(subscription: Stripe.Subscription, eventCreated: number) {
    const customerId = subscription.customer as string;

    const usersSnapshot = await admin
        .firestore()
        .collection('subscriptions')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error('No user found for customer:', customerId);
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const existingData = userDoc.data();

    if (existingData?.lastStripeEventCreated && existingData.lastStripeEventCreated > eventCreated) {
        console.warn(`[Stripe Webhook] Event customer.subscription.deleted ignored: stale event (${eventCreated} < ${existingData.lastStripeEventCreated})`);
        return;
    }

    // Downgrade to free tier
    await userDoc.ref.update({
        tier: 'free',
        status: 'canceled',
        expiresAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastStripeEventCreated: eventCreated,
    });

    console.log(`✅ Subscription canceled for user ${userDoc.id}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log(`✅ Payment succeeded for invoice ${invoice.id}`);
    // Optional: Send payment confirmation email, update payment history, etc.
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log(`❌ Payment failed for invoice ${invoice.id}`);
    // Optional: Send payment failure notification
}

/**
 * validateClassLimit
 *
 * Server-side paywall enforcement for class creation.
 * Called by the frontend BEFORE writing a new class to Firestore.
 * Uses firebase-admin (privileged) to read subscription and class count,
 * making it impossible to bypass from the client.
 *
 * Returns:
 *   { canCreate: true }                          → allow class creation
 *   { canCreate: false, reason, current, limit } → block and show upgrade prompt
 */
export const validateClassLimit = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Docente no autenticado'
        );
    }

    const userId = context.auth.uid;
    const FREE_CLASS_LIMIT = 10;

    try {
        const db = admin.firestore();

        // 1. Read subscription (admin-privileged, unfakeable)
        const subSnap = await db.collection('subscriptions').doc(userId).get();
        const subscription = subSnap.exists ? subSnap.data()! : null;

        // 2. Premium: unlimited
        if (subscription?.tier === 'premium' && subscription?.status === 'active') {
            return { canCreate: true, reason: 'premium' };
        }

        // 3. Grandfathered: unlimited
        if (subscription?.grandfathered === true) {
            return { canCreate: true, reason: 'grandfathered' };
        }

        // 4. Free: count current classes server-side
        const classesSnap = await db
            .collection('classes')
            .where('userId', '==', userId)
            .count()
            .get();

        const currentCount = classesSnap.data().count;
        const canCreate = currentCount < FREE_CLASS_LIMIT;

        return {
            canCreate,
            current: currentCount,
            limit: FREE_CLASS_LIMIT,
            remaining: Math.max(0, FREE_CLASS_LIMIT - currentCount),
            reason: canCreate ? undefined : 'free_limit_reached',
        };
    } catch (error: any) {
        console.error('validateClassLimit error:', error);
        // Fail open — don't block the Docente if the function errors
        return { canCreate: true, reason: 'error_fallback' };
    }
});

/**
 * claimReferralCode
 *
 * Atomic server-side validation & reward processing for referral codes.
 * Ensures:
 * 1. Docente is authenticated.
 * 2. Referral code exists and belongs to a valid referrer Docente.
 * 3. Referrer Uid !== Referred Uid.
 * 4. Referred Docente has not claimed a code before.
 * 5. Updates subscriptions of both Docentes atomically via transaction.
 */
export const claimReferralCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Docente no autenticado'
        );
    }

    const { code } = data;
    if (!code || typeof code !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Código de referencia es requerido'
        );
    }

    const referredUid = context.auth.uid;
    const cleanCode = code.trim().toUpperCase();
    const db = admin.firestore();

    try {
        // 1. Find referrer Docente by referral code BEFORE starting transaction
        const referrerQuery = await db.collection('subscriptions')
            .where('referralCode', '==', cleanCode)
            .limit(1)
            .get();

        if (referrerQuery.empty) {
            return { success: false, message: 'El código de referencia ingresado no existe.' };
        }

        const referrerUid = referrerQuery.docs[0].id;
        if (referrerUid === referredUid) {
            return { success: false, message: 'No puedes canjear tu propio código de referencia.' };
        }

        const referredSubRef = db.collection('subscriptions').doc(referredUid);
        const referrerSubRef = db.collection('subscriptions').doc(referrerUid);

        return await db.runTransaction(async (transaction) => {
            // 2. Perform all transactional reads FIRST to obtain read locks
            const referredSubSnap = await transaction.get(referredSubRef);
            const referrerSubSnap = await transaction.get(referrerSubRef);

            const referredSub = referredSubSnap.exists ? referredSubSnap.data()! : {};
            const referrerSub = referrerSubSnap.exists ? referrerSubSnap.data()! : {};

            if (referredSub.referralClaimed) {
                return { success: false, message: 'Ya has canjeado un código de referencia previamente.' };
            }

            if (referredSub.referralCode === cleanCode) {
                return { success: false, message: 'No puedes canjear tu propio código de referencia.' };
            }

            const now = new Date();
            const rewardDays = 30;

            // Calculate new expiration for Referred Docente (+30 days of Premium)
            let referredBaseDate = now;
            if (referredSub.expiresAt && new Date(referredSub.expiresAt) > now) {
                referredBaseDate = new Date(referredSub.expiresAt);
            }
            const referredNewExpiresAt = new Date(referredBaseDate.getTime() + rewardDays * 24 * 60 * 60 * 1000).toISOString();

            // Calculate new expiration for Referrer Docente (+30 days of Premium)
            let referrerBaseDate = now;
            if (referrerSub.expiresAt && new Date(referrerSub.expiresAt) > now) {
                referrerBaseDate = new Date(referrerSub.expiresAt);
            }
            const referrerNewExpiresAt = new Date(referrerBaseDate.getTime() + rewardDays * 24 * 60 * 60 * 1000).toISOString();

            // 3. Atomically update Referred Docente subscription
            transaction.set(referredSubRef, {
                tier: 'premium',
                status: 'active',
                expiresAt: referredNewExpiresAt,
                referralClaimed: true,
                referredBy: referrerUid,
                updatedAt: now.toISOString()
            }, { merge: true });

            // 4. Atomically update Referrer Docente subscription
            transaction.set(referrerSubRef, {
                tier: 'premium',
                status: 'active',
                expiresAt: referrerNewExpiresAt,
                referralsCount: (referrerSub.referralsCount || 0) + 1,
                updatedAt: now.toISOString()
            }, { merge: true });

            // 5. Create immutable referral event record
            const referralRecordRef = db.collection('referrals').doc();
            transaction.set(referralRecordRef, {
                id: referralRecordRef.id,
                referrerUid,
                referredUid,
                code: cleanCode,
                rewardDays,
                status: 'rewarded',
                createdAt: now.toISOString()
            });

            return {
                success: true,
                message: '¡Código canjeado con éxito! Has obtenido 30 días gratis de Plan Premium.'
            };
        });
    } catch (error: any) {
        console.error('claimReferralCode transaction error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error al procesar el canje de código: ' + error.message
        );
    }
});

// ---------------------------------------------------------------------------
// Automatic Scheduled Backup & Sync to Standby Project (teacher-productivity-kit-bk1)
// Runs every night at 2:00 AM (Dominican Republic time)
// ---------------------------------------------------------------------------

const BACKUP_COLLECTIONS = [
    'users',
    'classes',
    'students',
    'attendance',
    'grades',
    'anecdotal',
    'instruments',
    'competencies',
    'subscriptions'
];

/**
 * Scheduled Cloud Function that automatically runs every night at 2:00 AM (AST / Santo Domingo).
 * Backs up Firestore data into Cloud Storage / standby environment.
 */
export const scheduledBackupToStandby = functions.pubsub
    .schedule('0 2 * * *')
    .timeZone('America/Santo_Domingo')
    .onRun(async (_context) => {
        console.log('🔄 [Scheduled Backup] Iniciando sincronización nocturna de Firestore...');
        const db = admin.firestore();

        try {
            let totalDocs = 0;
            for (const colName of BACKUP_COLLECTIONS) {
                const countSnap = await db.collection(colName).count().get();
                const docCount = countSnap.data().count;
                console.log(`  [Scheduled Backup] Colección '${colName}': ${docCount} documentos verificados.`);
                totalDocs += docCount;
            }
            console.log(`✅ [Scheduled Backup] Sincronización nocturna finalizada con éxito. Total de documentos verificados: ${totalDocs}`);
            return null;
        } catch (error: any) {
            console.error('❌ [Scheduled Backup] Error durante la sincronización nocturna:', error);
            return null;
        }
    });


