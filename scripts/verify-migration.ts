import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

// Load environment variables
// Parse command line arguments
const isProd = process.argv.includes('--prod');

// Load environment variables
dotenv.config({ path: '.env.local' });

if (isProd) {
    console.log('⚠️ Running in PRODUCTION mode');
    dotenv.config({ path: '.env.production', override: true });
} else {
    console.log('Running in DEVELOPMENT mode');
    dotenv.config({ path: '.env.development' });
}

const serviceAccountPath = path.resolve('scripts/service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: scripts/service-account.json not found.');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
});

const db = admin.firestore();

async function verifyMigration() {
    console.log('🔍 Admin Verifying migration...\n');

    const listsRef = db.collection('lists');
    const listsSnapshot = await listsRef.get();

    let totalMismatches = 0;
    let totalChecked = 0;

    for (const listDoc of listsSnapshot.docs) {
        if (!listDoc.id.startsWith('grades_')) continue;

        const userId = listDoc.id.replace('grades_', '');
        const data = listDoc.data();
        const oldGrades: any[] = data.items || [];

        console.log(`Checking user ${userId.substring(0, 8)}: ${oldGrades.length} grades`);

        for (const grade of oldGrades) {
            const newDocRef = db.doc(`instruments/${grade.instrumentId}/grades/${grade.studentId}`);
            const newDoc = await newDocRef.get();

            totalChecked++;

            if (!newDoc.exists) {
                console.error(`  ❌ MISSING: ${grade.studentId} in instrument ${grade.instrumentId}`);
                totalMismatches++;
                continue;
            }

            const newData = newDoc.data();
            if (newData?.score !== grade.score) {
                console.error(`  ⚠️  SCORE MISMATCH: ${grade.studentId} (${grade.score} vs ${newData?.score})`);
                totalMismatches++;
            }
        }

        console.log(`  ✅ User ${userId.substring(0, 8)} verified`);
    }

    console.log(`\n${'='.repeat(40)}`);
    if (totalMismatches === 0) {
        console.log(`✅ ADMIN VERIFICATION PASSED - ${totalChecked} grades verified`);
    } else {
        console.log(`❌ ADMIN VERIFICATION FAILED - ${totalMismatches} mismatches found`);
    }
    console.log('='.repeat(40));
}

verifyMigration();
