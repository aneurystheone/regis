import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Inicializar la aplicación de Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), 'scripts', 'Service-account-dev.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: No se encontró el archivo Service-account-dev.json en la carpeta scripts. Path buscado: ' + serviceAccountPath);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

async function setPremiumSubscription(email: string) {
    try {
        console.log(`🔍 Buscando usuario con correo: ${email}...`);
        const user = await auth.getUserByEmail(email);

        console.log(`👤 Usuario encontrado. UID: ${user.uid}`);

        const now = new Date().toISOString();
        const subscriptionRef = db.collection('subscriptions').doc(user.uid);

        await subscriptionRef.set({
            tier: 'premium',
            status: 'active',
            expiresAt: null,
            createdAt: now,
            updatedAt: now,
            source: 'manual'
        }, { merge: true });

        console.log(`✨ ¡Éxito! La suscripción del usuario ${email} ahora es PREMIUM (activa).`);
    } catch (error: any) {
        console.error(`❌ Error al actualizar la suscripción:`, error.message);
    }
}

const emailToSet = process.argv[2];

if (!emailToSet) {
    console.log('Uso: npx tsx scripts/set-premium.ts <correo_del_usuario>');
    process.exit(1);
}

setPremiumSubscription(emailToSet);
