import { execSync } from 'node:child_process';

console.log('🔍 === AUDITORÍA Y CONTROL DE PAQUETES REGIS ===\n');

// 1. Verificación de vulnerabilidades de seguridad
console.log('📦 1. Verificando vulnerabilidades de seguridad (npm audit)...');
let auditJson = null;

try {
  const auditOutput = execSync('npm audit --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  auditJson = JSON.parse(auditOutput);
} catch (error) {
  if (error.stdout) {
    try {
      auditJson = JSON.parse(error.stdout);
    } catch (e) {
      // Error de parseo no crítico
    }
  }
}

if (auditJson && auditJson.metadata && auditJson.metadata.vulnerabilities) {
  const summary = auditJson.metadata.vulnerabilities;
  console.log(`   • Vulnerabilidades Críticas: ${summary.critical || 0}`);
  console.log(`   • Vulnerabilidades Altas:    ${summary.high || 0}`);
  console.log(`   • Vulnerabilidades Moderadas:${summary.moderate || 0}`);
  console.log(`   • Vulnerabilidades Bajas:    ${summary.low || 0}`);
  
  if (summary.critical > 0 || summary.high > 0) {
    console.log('   ⚠️ ATENCIÓN: Existen vulnerabilidades críticas o altas que requieren atención prioritaria.');
  } else {
    console.log('   ✅ Sin vulnerabilidades críticas ni altas.');
  }
} else {
  console.log('   ✅ Sin vulnerabilidades reportadas por npm audit.');
}

// 2. Paquetes desactualizados y clasificación de impacto
console.log('\n📋 2. Verificando paquetes desactualizados (npm outdated)...');
let outdatedJson = {};
const CORE_PACKAGES = [
  'firebase',
  'firebase-admin',
  'firebase-tools',
  'react',
  'react-dom',
  'idb',
  'vite-plugin-pwa',
  '@capacitor/core',
  '@capacitor/android',
  'electron',
  'vite'
];

try {
  const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (outdatedOutput.trim()) {
    outdatedJson = JSON.parse(outdatedOutput);
  }
} catch (error) {
  if (error.stdout && error.stdout.trim()) {
    try {
      outdatedJson = JSON.parse(error.stdout);
    } catch (e) {
      // Error de parseo
    }
  }
}

const outdatedKeys = Object.keys(outdatedJson);
if (outdatedKeys.length === 0) {
  console.log('   ✅ Todos los paquetes están completamente al día.');
} else {
  console.log(`   Se detectaron ${outdatedKeys.length} paquete(s) con actualizaciones disponibles:\n`);
  
  let coreCount = 0;
  outdatedKeys.forEach((pkg) => {
    const info = outdatedJson[pkg];
    const isCore = CORE_PACKAGES.includes(pkg);
    if (isCore) coreCount++;
    const badge = isCore ? ' [CORE - REQUERIDA AUDITORÍA OFFLINE/FIREBASE]' : ' [SECUNDARIA]';
    console.log(`   • ${pkg.padEnd(28)} | Actual: ${info.current.padEnd(8)} | Última: ${info.latest.padEnd(8)}${badge}`);
  });

  if (coreCount > 0) {
    console.log(`\n   ⚠️ ATENCIÓN: Se detectaron ${coreCount} dependencias CORE desactualizadas.`);
    console.log('      No actualice paquetes CORE automáticamente sin verificar contratos offline/persistentes.');
  }
}

// 3. Verificación del estado de salud del código y tests
console.log('\n🧪 3. Verificando tipos TypeScript y Tests (npm run check)...');
try {
  execSync('npm run check', { stdio: 'inherit' });
  console.log('\n✅ Verificación de tipos y suite de tests superada exitosamente.');
  console.log('\n🎉 Auditoría de paquetes finalizada.');
} catch (error) {
  console.error('\n❌ ERROR: Falló la comprobación de tipos o la suite de pruebas.');
  process.exit(1);
}
