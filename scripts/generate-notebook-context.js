import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../docs/generated');
const ROOT_DIR = path.join(__dirname, '..');

// Files to include in the context
// Add or remove files here to tune the "Brain" of NotebookLM
const FILES_TO_INCLUDE = [
    'docs/ARCHITECTURE.md',
    'docs/ROADMAP_REGIS',
    'docs/OFFLINE_STRATEGY.md',
    'docs/NOTEBOOKLM_WORKFLOW.md',
    'types.ts',
    'services/api.ts',
    'services/authService.ts',
    'services/curriculumService.ts',
    'services/gradeHelpers.ts',
    'services/offlineStorage.ts',
    'services/usageService.ts',
    'public/data/index.json',
    'public/data/curriculum_template_master.json',
    'package.json',
    'firebase.json',
    'firestore.rules'
];

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function generateContext() {
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilePath = path.join(OUTPUT_DIR, `Regis_Context_${dateStr}.txt`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let content = "REGIS PROJECT CONTEXT OBTAINED AT " + new Date().toISOString() + "\n";
    content += "================================================================\n\n";

    FILES_TO_INCLUDE.forEach(relativePath => {
        const fullPath = path.join(ROOT_DIR, relativePath);

        try {
            if (fs.existsSync(fullPath)) {
                const fileContent = fs.readFileSync(fullPath, 'utf8');
                content += `\n\n--- START OF FILE: ${relativePath} ---\n`;
                content += "```" + (path.extname(relativePath).substring(1) || 'txt') + "\n";
                content += fileContent;
                content += "\n```\n";
                content += `--- END OF FILE: ${relativePath} ---\n`;
                console.log(`Included: ${relativePath}`);
            } else {
                console.warn(`WARNING: File not found: ${relativePath}`);
                content += `\n\n--- MISSING FILE: ${relativePath} ---\n`;
            }
        } catch (err) {
            console.error(`Error reading ${relativePath}:`, err);
        }
    });

    fs.writeFileSync(outputFilePath, content);
    console.log(`\nContext file generated successfully at:\n${outputFilePath}`);
}

generateContext();
