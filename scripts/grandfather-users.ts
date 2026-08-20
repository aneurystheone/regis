/**
 * Grandfathering Script for Existing Users with >6 Classes
 * 
 * Run this ONCE before deploying class limit to production
 * 
 * Usage:
 *   npx ts-node scripts/grandfather-users.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, where } from 'firebase/firestore';

// Firebase config (use production config)
const firebaseConfig = {
    // IMPORTANT: Replace with your production Firebase config
    apiKey: "AIzaSyBJuCd_OwKsPnEw0Qu_aQOhNEMEGIf1iUc",
    authDomain: "gen-lang-client-0875059420.firebaseapp.com",
    projectId: "gen-lang-client-0875059420",
    storageBucket: "gen-lang-client-0875059420.firebasestorage.app",
    messagingSenderId: "875059420",
    appId: "1:875059420:web:e3b5e77fe5ce20c5fc28a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function grandfatherExistingUsers() {
    console.log('🔍 Buscando usuarios para grandfathering...\n');

    try {
        // Get all classes to count by userId
        const classesSnapshot = await getDocs(collection(db, 'classes'));
        const userClassCounts: Record<string, number> = {};

        classesSnapshot.forEach((doc) => {
            const classData = doc.data();
            const userId = classData.userId;
            if (userId) {
                userClassCounts[userId] = (userClassCounts[userId] || 0) + 1;
            }
        });

        console.log(`📊 Total usuarios con clases: ${Object.keys(userClassCounts).length}\n`);

        let grandfathered = 0;
        let skipped = 0;
        const FREE_CLASS_LIMIT = 10;

        // Process each user
        for (const [userId, classCount] of Object.entries(userClassCounts)) {
            if (classCount > FREE_CLASS_LIMIT) {
                // Check if subscription doc exists
                const subRef = doc(db, 'subscriptions', userId);
                const subSnap = await getDoc(subRef);

                if (subSnap.exists()) {
                    const subData = subSnap.data();

                    // Skip if already premium
                    if (subData.tier === 'premium' && subData.status === 'active') {
                        console.log(`⏭️  Skipped user ${userId} (already premium, ${classCount} clases)`);
                        skipped++;
                        continue;
                    }

                    // Skip if already grandfathered
                    if (subData.grandfathered) {
                        console.log(`⏭️  Skipped user ${userId} (already grandfathered, ${classCount} clases)`);
                        skipped++;
                        continue;
                    }

                    // Update existing subscription
                    await setDoc(subRef, {
                        ...subData,
                        grandfathered: true,
                        updatedAt: new Date().toISOString()
                    });

                    console.log(`✅ Grandfathered user ${userId} (${classCount} clases)`);
                    grandfathered++;
                } else {
                    // Create new subscription doc with grandfathered status
                    await setDoc(subRef, {
                        tier: 'free',
                        status: 'active',
                        expiresAt: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        source: 'grandfathered',
                        grandfathered: true
                    });

                    console.log(`✅ Created grandfathered subscription for user ${userId} (${classCount} clases)`);
                    grandfathered++;
                }
            }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`✨ Grandfathering completo!`);
        console.log(`   • Usuarios grandfathered: ${grandfathered}`);
        console.log(`   • Usuarios skipped: ${skipped}`);
        console.log(`   • Total procesados: ${grandfathered + skipped}`);
        console.log(`${'='.repeat(50)}\n`);

    } catch (error) {
        console.error('❌ Error during grandfathering:', error);
        process.exit(1);
    }
}

// Run the script
console.log('🚀 Starting grandfathering script for REGIS...\n');
grandfatherExistingUsers()
    .then(() => {
        console.log('✅ Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
