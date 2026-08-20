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
    console.log('Please download your service account key from:');
    console.log('Firebase Console > Project Settings > Service Accounts > Generate new private key');
    console.log('And save it as scripts/service-account.json');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

async function migrateGrades() {
    console.log('🚀 Starting admin grade migration to subcollections...\n');

    let totalUsers = 0;
    let totalGrades = 0;

    try {
        const listsRef = db.collection('lists');
        const listsSnapshot = await listsRef.get();

        for (const listDoc of listsSnapshot.docs) {
            if (!listDoc.id.startsWith('grades_')) continue;

            const userId = listDoc.id.replace('grades_', '');
            const data = listDoc.data();
            const grades: any[] = data.items || [];

            if (grades.length === 0) {
                console.log(`⏭️  Skipping user ${userId} (no grades)`);
                continue;
            }

            console.log(`\n📝 Migrating ${grades.length} grades for user ${userId.substring(0, 8)}...`);
            totalUsers++;

            // Group by instrument
            const gradesByInstrument = grades.reduce((acc, grade) => {
                if (!acc[grade.instrumentId]) acc[grade.instrumentId] = [];
                acc[grade.instrumentId].push(grade);
                return acc;
            }, {} as Record<string, any[]>);

            for (const [instrumentId, instrumentGrades] of Object.entries(gradesByInstrument)) {
                const batch = db.batch();

                instrumentGrades.forEach(grade => {
                    const gradeDocRef = db.doc(`instruments/${instrumentId}/grades/${grade.studentId}`);

                    // Fallback: If grade.userId is missing, use the one from the doc ID
                    const finalUserId = grade.userId || userId;

                    batch.set(gradeDocRef, {
                        userId: finalUserId,
                        score: grade.score,
                        criteriaScores: grade.criteriaScores || {},
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        migratedAt: new Date().toISOString()
                    }, { merge: true });
                });

                await batch.commit();
                totalGrades += instrumentGrades.length;
                console.log(`  ✅ Instrument ${instrumentId.substring(0, 8)}: ${instrumentGrades.length} grades migrated`);
            }
        }

        console.log('\n' + '='.repeat(40));
        console.log('🎉 ADMIN MIGRATION COMPLETE');
        console.log(`📊 Users migrated: ${totalUsers}`);
        console.log(`📝 Total grades: ${totalGrades}`);
        console.log('='.repeat(40));

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED:', error);
        process.exit(1);
    }
}

migrateGrades();
