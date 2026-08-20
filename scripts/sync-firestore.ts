import { initializeApp, cert, getApps, AppOptions } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Respaldo y Sincronización de Firestore (Completo con Subcolecciones)
 * 
 * Uso:
 *   npx tsx scripts/sync-firestore.ts export [nombre-archivo.json]
 *   npx tsx scripts/sync-firestore.ts import <nombre-archivo.json> <target-project-id>
 */

// Helper para limpiar corchetes o símbolos de ayuda como [archivo.json] o <archivo.json>
function cleanArg(str?: string): string | undefined {
  if (!str) return undefined;
  return str.replace(/^[\[<]+|[\]>]+$/g, '').trim();
}

const rawArgs = process.argv.slice(2);
const keyArg = rawArgs.find(a => a.startsWith('--key='));
const explicitKeyPath = keyArg ? keyArg.split('=')[1] : null;

const args = rawArgs
  .filter(a => !a.startsWith('--key='))
  .map(arg => cleanArg(arg)!);

const command = args[0];

if (!command || (command !== 'export' && command !== 'import')) {
  console.log(`
Uso:
  npx tsx scripts/sync-firestore.ts export [nombre-archivo.json] [--key=ruta/a/clave.json]
  npx tsx scripts/sync-firestore.ts import <nombre-archivo.json> <target-project-id> [--key=ruta/a/clave.json]
  `);
  process.exit(1);
}

// Lista exhaustiva de colecciones raíz en REGIS
const COLLECTIONS = [
  'users',
  'classes',
  'students',
  'deleted_students',
  'deleted_classes',
  'attendance',
  'grades', // legacy top-level grades
  'anecdotes',
  'anecdotal',
  'instruments',
  'competencies',
  'user_competencies',
  'fundamental_competencies',
  'teacher_profile',
  'journal',
  'resources',
  'custom_events',
  'lists',
  'lesson_plans',
  'app_config',
  'subscriptions',
  'referrals',
  'curriculums',
  'feedback',
  'teams',
  'school_groups',
  'system_logs'
];

// Helper para resolver el archivo de Service Account correspondiente al proyecto
function getServiceAccountPath(projectId?: string): string | null {
  if (explicitKeyPath) {
    const customPath = path.resolve(process.cwd(), explicitKeyPath);
    if (fs.existsSync(customPath)) return customPath;
    console.error(`❌ Archivo de clave especificado en --key no existe: ${customPath}`);
    process.exit(1);
  }

  if (projectId) {
    const specificCandidates = [
      path.resolve(process.cwd(), `scripts/service-account-${projectId}.json`),
      path.resolve(process.cwd(), `scripts/Service-account-${projectId}.json`),
    ];
    if (projectId === 'teacher-productivity-kit-bk1' || projectId === 'standby') {
      specificCandidates.push(
        path.resolve(process.cwd(), 'scripts/service-account-standby.json'),
        path.resolve(process.cwd(), 'scripts/service-account-bk1.json')
      );
    }
    if (projectId === 'regis-dev-150626' || projectId === 'dev') {
      specificCandidates.push(path.resolve(process.cwd(), 'scripts/Service-account-dev.json'));
    }
    if (projectId === 'teacher-productivity-kit' || projectId === 'prod') {
      specificCandidates.push(path.resolve(process.cwd(), 'scripts/service-account.json'));
    }

    for (const cand of specificCandidates) {
      if (fs.existsSync(cand)) return cand;
    }
  }

  // Fallbacks por defecto si no se especificó o para la app origen
  const prodPath = path.resolve(process.cwd(), 'scripts/service-account.json');
  const devPath = path.resolve(process.cwd(), 'scripts/Service-account-dev.json');
  if (fs.existsSync(prodPath)) return prodPath;
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

// Helper para inicializar Firebase Admin
function getAdminDb(projectId?: string, appName = 'default'): Firestore {
  const targetName = appName === 'default' ? '[DEFAULT]' : appName;
  const existingApp = getApps().find(a => a.name === targetName);
  if (existingApp) {
    return getFirestore(existingApp);
  }

  const serviceAccountPath = getServiceAccountPath(projectId);
  const options: AppOptions = {};

  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    options.credential = cert(serviceAccount);
    options.projectId = projectId || serviceAccount.project_id;
    console.log(`  🔑 Usando credencial: ${path.basename(serviceAccountPath)} (Project: ${serviceAccount.project_id || options.projectId})`);
  } else {
    if (projectId) {
      options.projectId = projectId;
      console.warn(`  ⚠️ No se encontró archivo Service Account para '${projectId}'. Intentando con credenciales por defecto...`);
      console.warn(`     (Recomendado: Guarda la clave de cuenta de servicio como scripts/service-account-${projectId}.json o scripts/service-account-standby.json)`);
    }
  }

  const app = appName === 'default'
    ? initializeApp(options)
    : initializeApp(options, appName);

  return getFirestore(app);
}

// Helper para escribir documentos en lotes respetando el límite de 500 ops de Firestore
async function batchWriteDocuments(
  db: Firestore,
  items: { path: string; data: Record<string, any> }[],
  chunkSize = 400
) {
  let committed = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = db.batch();

    for (const item of chunk) {
      const ref = db.doc(item.path);
      batch.set(ref, item.data, { merge: true });
    }

    await batch.commit();
    committed += chunk.length;
  }
  return committed;
}

interface BackupPayload {
  version: string;
  exportedAt: string;
  collections: Record<string, any[]>;
  subcollections: Record<string, any[]>;
  stats: {
    totalCollections: number;
    totalSubcollections: number;
    totalDocuments: number;
  };
}

async function main() {
  if (command === 'export') {
    const outputFile = args[1] || `firestore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    console.log(`📦 [Export] Iniciando respaldo completo de Firestore a ${outputFile}...`);

    const db = getAdminDb();
    let totalDocs = 0;

    const backupData: BackupPayload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      collections: {},
      subcollections: {},
      stats: {
        totalCollections: 0,
        totalSubcollections: 0,
        totalDocuments: 0
      }
    };

    // 1. Exportar Colecciones Principales
    for (const colName of COLLECTIONS) {
      try {
        const snapshot = await db.collection(colName).get();
        if (snapshot.docs.length > 0) {
          backupData.collections[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`  ✓ Colección '${colName}': ${snapshot.docs.length} docs`);
          totalDocs += snapshot.docs.length;
          backupData.stats.totalCollections++;
        }
      } catch (err: any) {
        console.warn(`  ⚠️ No se pudo respaldar '${colName}': ${err.message}`);
      }
    }

    // 2. Exportar Subcolecciones Granulares (instruments/{id}/grades y instruments/{id}/history)
    console.log(`\n🔍 [Export] Buscando subcolecciones granulares en 'instruments'...`);
    try {
      const instrumentsSnap = await db.collection('instruments').get();
      let totalGrades = 0;
      let totalHistories = 0;

      for (const instDoc of instrumentsSnap.docs) {
        const instId = instDoc.id;

        // Subcolección: grades
        const gradesSnap = await db.collection(`instruments/${instId}/grades`).get();
        if (gradesSnap.docs.length > 0) {
          const subPath = `instruments/${instId}/grades`;
          backupData.subcollections[subPath] = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          totalGrades += gradesSnap.docs.length;
          totalDocs += gradesSnap.docs.length;
          backupData.stats.totalSubcollections++;
        }

        // Subcolección: history (si existe)
        const historySnap = await db.collection(`instruments/${instId}/history`).get();
        if (historySnap.docs.length > 0) {
          const subPath = `instruments/${instId}/history`;
          backupData.subcollections[subPath] = historySnap.docs.map(d => ({ id: d.id, ...d.data() }));
          totalHistories += historySnap.docs.length;
          totalDocs += historySnap.docs.length;
          backupData.stats.totalSubcollections++;
        }
      }

      console.log(`  ✓ Subcolección 'grades': ${totalGrades} calificaciones respaldadas.`);
      if (totalHistories > 0) {
        console.log(`  ✓ Subcolección 'history': ${totalHistories} registros históricos respaldados.`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Error al respaldar subcolecciones de instruments: ${err.message}`);
    }

    backupData.stats.totalDocuments = totalDocs;

    const fullOutputPath = path.resolve(process.cwd(), outputFile);
    fs.writeFileSync(fullOutputPath, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log(`\n🎉 [Export] Respaldo finalizado con éxito.`);
    console.log(`   📄 Archivo: ${outputFile}`);
    console.log(`   📊 Total Documentos: ${totalDocs}`);
    console.log(`   📂 Colecciones: ${backupData.stats.totalCollections} | Subcolecciones: ${backupData.stats.totalSubcollections}`);

  } else if (command === 'import') {
    const inputFile = args[1];
    const targetProjectId = args[2];

    if (!inputFile || !targetProjectId) {
      console.error('❌ Error: Debes especificar el archivo JSON de entrada y el ID del proyecto destino.');
      console.error('   Ejemplo: npx tsx scripts/sync-firestore.ts import backup.json teacher-productivity-kit-bk1');
      process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), inputFile);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Archivo no encontrado: ${filePath}`);
      process.exit(1);
    }

    console.log(`📥 [Import] Importando datos de ${inputFile} al proyecto destino: ${targetProjectId}...`);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const backupData: BackupPayload | Record<string, any[]> = JSON.parse(rawData);

    const targetDb = getAdminDb(targetProjectId, 'targetApp');
    let totalImported = 0;

    // Detectar si es formato v2 o formato plano v1 legacy
    const isV2 = 'collections' in backupData && typeof backupData.collections === 'object';
    const topCollections: Record<string, any[]> = isV2
      ? (backupData as BackupPayload).collections
      : (backupData as Record<string, any[]>);

    // 1. Importar colecciones principales
    console.log(`\n📂 [Import] Procesando colecciones principales...`);
    for (const [colName, docs] of Object.entries(topCollections)) {
      if (!Array.isArray(docs) || docs.length === 0) continue;
      console.log(`  ⏳ Importando '${colName}' (${docs.length} docs)...`);

      const itemsToWrite = docs.map(doc => {
        const { id, ...data } = doc;
        return {
          path: `${colName}/${id}`,
          data
        };
      });

      const written = await batchWriteDocuments(targetDb, itemsToWrite);
      totalImported += written;
      console.log(`  ✓ Colección '${colName}' importada (${written} docs).`);
    }

    // 2. Importar subcolecciones (si es formato v2)
    if (isV2 && (backupData as BackupPayload).subcollections) {
      const subcollections = (backupData as BackupPayload).subcollections;
      const subPaths = Object.keys(subcollections);
      
      if (subPaths.length > 0) {
        console.log(`\n🔍 [Import] Procesando ${subPaths.length} subcolecciones...`);
        for (const [subPath, docs] of Object.entries(subcollections)) {
          if (!Array.isArray(docs) || docs.length === 0) continue;

          const itemsToWrite = docs.map(doc => {
            const { id, ...data } = doc;
            return {
              path: `${subPath}/${id}`,
              data
            };
          });

          const written = await batchWriteDocuments(targetDb, itemsToWrite);
          totalImported += written;
        }
        console.log(`  ✓ Todas las subcolecciones fueron importadas exitosamente.`);
      }
    }

    console.log(`\n✅ [Import] Importación al proyecto '${targetProjectId}' finalizada con éxito.`);
    console.log(`   📊 Total Documentos Escritos: ${totalImported}`);
  }
}

main().catch(err => {
  console.error('❌ Error en el script de sincronización:', err);
  process.exit(1);
});

