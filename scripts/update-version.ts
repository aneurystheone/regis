import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');
const TYPES_TS_PATH = path.resolve(__dirname, '../types.ts');

// Get new version from arguments
const newVersion = process.argv[2];

if (!newVersion) {
    console.error('❌ Error: Please provide a version number (e.g., npx tsx scripts/update-version.ts 1.6.1)');
    process.exit(1);
}

// Validate version format (x.y.z)
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error('❌ Error: Version must be in format x.y.z (e.g. 1.6.0)');
    process.exit(1);
}

console.log(`🚀 Updating version to ${newVersion}...`);

try {
    // 1. Update package.json
    if (fs.existsSync(PACKAGE_JSON_PATH)) {
        const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
        const oldVersion = packageJson.version;
        packageJson.version = newVersion;
        fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`✅ Updated package.json: ${oldVersion} -> ${newVersion}`);
    } else {
        console.error('❌ package.json not found!');
    }

    // 2. Update types.ts (APP_VERSION constant)
    if (fs.existsSync(TYPES_TS_PATH)) {
        let typesContent = fs.readFileSync(TYPES_TS_PATH, 'utf8');

        // Generate Build String: MMdd.HHmm
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hour = now.getHours().toString().padStart(2, '0');
        const minute = now.getMinutes().toString().padStart(2, '0');
        const buildString = `${month}${day}.${hour}${minute}`;

        const versionString = `v${newVersion} Build ${buildString}`;

        // Regex to replace the APP_VERSION line
        // Looks for: export const APP_VERSION = '...';
        const versionRegex = /export const APP_VERSION = '.*';/;

        if (versionRegex.test(typesContent)) {
            typesContent = typesContent.replace(versionRegex, `export const APP_VERSION = '${versionString}';`);
            fs.writeFileSync(TYPES_TS_PATH, typesContent);
            console.log(`✅ Updated types.ts: APP_VERSION = '${versionString}'`);
        } else {
            console.warn('⚠️ Could not find APP_VERSION constant in types.ts');
        }
    } else {
        console.error('❌ types.ts not found!');
    }

    console.log('\n🎉 Version update complete!');

} catch (error) {
    console.error('❌ Error updating version:', error);
    process.exit(1);
}
