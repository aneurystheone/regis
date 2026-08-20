import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

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

async function setAdminClaim(email: string) {
    try {
        console.log(`Buscando usuario con correo: ${email}...`);
        const user = await auth.getUserByEmail(email);
        
        console.log(`Usuario encontrado. UID: ${user.uid}`);
        console.log(`Claims actuales:`, user.customClaims);
        
        console.log(`Estableciendo claim { admin: true }...`);
        await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
        
        console.log(`✅ ¡Éxito! El usuario ${email} ahora tiene privilegios de administrador.`);
        console.log(`(Nota: El usuario debe cerrar sesión y volver a iniciarla para que el token se actualice y tome los nuevos claims).`);
    } catch (error: any) {
        console.error(`❌ Error al establecer el claim de administrador:`, error.message);
    }
}

const emailToSet = process.argv[2];

if (!emailToSet) {
    console.log('Uso: npx tsx scripts/set-admin.ts <correo_del_usuario>');
    process.exit(1);
}

setAdminClaim(emailToSet);
