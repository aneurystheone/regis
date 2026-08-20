/**
 * REGIS Feedback Manager
 * 
 * Scans unsolved feedback tickets from Firestore, groups them by severity,
 * module, and type, then allows batch transformation into task files.
 * 
 * Uses Firebase Admin SDK with service account for full access to the
 * feedback collection (bypasses security rules).
 * 
 * Usage:
 *   npx tsx scripts/feedback-manager.ts
 *   npx tsx scripts/feedback-manager.ts --auto          # Skip interactive menu, export all
 *   npx tsx scripts/feedback-manager.ts --group=module   # Pre-select grouping
 *   npx tsx scripts/feedback-manager.ts --mark-reviewed  # Update status after export
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

// ESM compat
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Firebase Admin Init (Service Account) ───────────────────────────────────
const serviceAccountPath = path.resolve(__dirname, 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account not found at:', serviceAccountPath);
    console.error('   Place your Firebase Admin SDK service account JSON at scripts/service-account.json');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedbackTicket {
    id: string;
    userId: string;
    type: 'bug' | 'feature' | 'general';
    message: string;
    status: 'new' | 'reviewed' | 'addressed';
    ssoMetadata?: { name: string; email: string };
    appMetadata?: { version: string; userAgent: string; currentView: string; platform?: string };
    screenshotUrl?: string | null;
    createdAt?: FirebaseFirestore.Timestamp | null;
}

type Severity = 'critical' | 'high' | 'medium' | 'low';
type GroupBy = 'severity' | 'module' | 'type';

interface ClassifiedTicket extends FeedbackTicket {
    severity: Severity;
    module: string;
    dateStr: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VIEW_TO_MODULE: Record<string, string> = {
    'DASHBOARD': 'Dashboard',
    'COURSE_DASHBOARD': 'Dashboard',
    'GRADEBOOK_GRADES': 'Gradebook',
    'GRADEBOOK_INSTRUMENTS': 'Gradebook',
    'GRADEBOOK_COMPETENCIES': 'Gradebook',
    'ATTENDANCE': 'Attendance',
    'STUDENTS': 'Students',
    'STUDENT_PROFILE': 'Students',
    'REPORTS': 'Reports',
    'SETTINGS': 'Settings',
    'SETTINGS_APPEARANCE': 'Settings',
    'SETTINGS_AI': 'Settings',
    'SETTINGS_RECYCLE_BIN': 'Settings',
    'SETTINGS_SUBSCRIPTION': 'Settings',
    'TEACHER_PROFILE': 'Teacher Profile',
    'CALENDAR': 'Calendar',
    'CLASSES': 'Classes',
    'LESSON_PLANNER': 'Lesson Planner',
    'ADMIN_DASHBOARD': 'Admin',
};

// Keywords that escalate severity (Spanish-focused for Dominican user base)
const CRITICAL_KEYWORDS = [
    'crash', 'bloqueado', 'no funciona', 'no carga', 'se cierra',
    'pierde datos', 'perdí', 'perdió', 'borró', 'desapareció',
    'urgente', 'emergencia', 'no puedo entrar', 'pantalla blanca',
    'error fatal', 'no abre', 'se congela'
];

const HIGH_KEYWORDS = [
    'error', 'falla', 'no guarda', 'lento', 'tarda',
    'no aparece', 'incorrecto', 'mal cálculo', 'no sincroniza',
    'offline', 'no responde', 'se traba'
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveModule(currentView?: string): string {
    if (!currentView) return 'General';
    return VIEW_TO_MODULE[currentView] || 'General';
}

function resolveSeverity(ticket: FeedbackTicket): Severity {
    const msg = (ticket.message || '').toLowerCase();

    // Keyword escalation first (overrides type-based default)
    if (CRITICAL_KEYWORDS.some(kw => msg.includes(kw))) return 'critical';
    if (HIGH_KEYWORDS.some(kw => msg.includes(kw))) return 'high';

    // Type-based baseline
    switch (ticket.type) {
        case 'bug': return 'high';
        case 'feature': return 'medium';
        case 'general': return 'low';
        default: return 'low';
    }
}

function formatDate(timestamp: any): string {
    if (!timestamp) return 'Sin fecha';
    try {
        if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString().split('T')[0];
        if (timestamp._seconds != null) return new Date(timestamp._seconds * 1000).toISOString().split('T')[0];
        if (timestamp.seconds != null) return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
        return new Date(timestamp).toISOString().split('T')[0];
    } catch {
        return 'Sin fecha';
    }
}

function severityEmoji(s: Severity): string {
    switch (s) {
        case 'critical': return '🔴';
        case 'high': return '🟠';
        case 'medium': return '🟡';
        case 'low': return '🟢';
    }
}

function severityLabel(s: Severity): string {
    switch (s) {
        case 'critical': return 'Critical';
        case 'high': return 'High';
        case 'medium': return 'Medium';
        case 'low': return 'Low';
    }
}

function typeEmoji(t: string): string {
    switch (t) {
        case 'bug': return '🐛';
        case 'feature': return '✨';
        case 'general': return '💭';
        default: return '📝';
    }
}

function typeLabel(t: string): string {
    switch (t) {
        case 'bug': return 'Bug';
        case 'feature': return 'Feature Request';
        case 'general': return 'General';
        default: return t;
    }
}

function groupTickets<K extends string>(
    tickets: ClassifiedTicket[],
    keyFn: (t: ClassifiedTicket) => K
): Map<K, ClassifiedTicket[]> {
    const groups = new Map<K, ClassifiedTicket[]>();
    for (const ticket of tickets) {
        const key = keyFn(ticket);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(ticket);
    }
    return groups;
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
    return new Promise(resolve => rl.question(question, resolve));
}

function truncate(str: string, maxLen: number): string {
    if (!str) return '';
    const clean = str.replace(/\n/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen - 3) + '...';
}

// ─── Core Logic ──────────────────────────────────────────────────────────────

async function fetchUnsolvedFeedback(): Promise<FeedbackTicket[]> {
    console.log('🔍 Scanning Firestore feedback collection...\n');

    const snapshot = await db.collection('feedback').get();

    const allTickets: FeedbackTicket[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
    } as FeedbackTicket));

    // Filter unsolved (not 'addressed')
    const unsolved = allTickets.filter(t => t.status !== 'addressed');

    console.log(`   Found ${allTickets.length} total tickets, ${unsolved.length} unsolved\n`);
    return unsolved;
}

function classifyTickets(tickets: FeedbackTicket[]): ClassifiedTicket[] {
    return tickets.map(t => ({
        ...t,
        severity: resolveSeverity(t),
        module: resolveModule(t.appMetadata?.currentView),
        dateStr: formatDate(t.createdAt),
    }));
}

function displaySummary(tickets: ClassifiedTicket[]): void {
    const bySeverity = groupTickets(tickets, t => t.severity);
    const byModule = groupTickets(tickets, t => t.module);
    const byType = groupTickets(tickets, t => t.type);

    const line = '─'.repeat(55);
    const headerLine = '═'.repeat(55);

    console.log(`\n┌${headerLine}┐`);
    console.log(`│  ${'REGIS Feedback Manager'.padEnd(53)}│`);
    console.log(`│  ${`${tickets.length} unsolved tickets scanned`.padEnd(53)}│`);
    console.log(`├${line}┤`);

    // By Severity
    console.log(`│${''.padEnd(55)}│`);
    console.log(`│  ${'BY SEVERITY:'.padEnd(53)}│`);
    const sevEntries: string[] = [];
    const sevOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
    for (const sev of sevOrder) {
        const count = bySeverity.get(sev)?.length || 0;
        if (count > 0) sevEntries.push(`${severityEmoji(sev)} ${severityLabel(sev)} (${count})`);
    }
    for (let i = 0; i < sevEntries.length; i += 2) {
        const pair = sevEntries.slice(i, i + 2).join('  ');
        console.log(`│  ${pair.padEnd(53)}│`);
    }

    // By Module
    console.log(`│${''.padEnd(55)}│`);
    console.log(`│  ${'BY MODULE:'.padEnd(53)}│`);
    const modEntries = [...byModule.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([mod, items]) => `${mod} (${items.length})`);
    for (let i = 0; i < modEntries.length; i += 3) {
        const row = modEntries.slice(i, i + 3).join('  ');
        console.log(`│  ${row.padEnd(53)}│`);
    }

    // By Type
    console.log(`│${''.padEnd(55)}│`);
    console.log(`│  ${'BY TYPE:'.padEnd(53)}│`);
    const typeEntries: string[] = [];
    for (const t of ['bug', 'feature', 'general'] as const) {
        const count = byType.get(t)?.length || 0;
        if (count > 0) typeEntries.push(`${typeEmoji(t)} ${typeLabel(t)} (${count})`);
    }
    const typeRow = typeEntries.join('  ');
    console.log(`│  ${typeRow.padEnd(53)}│`);

    console.log(`│${''.padEnd(55)}│`);
    console.log(`└${line}┘\n`);
}

// ─── Task File Generation ────────────────────────────────────────────────────

function generateTaskFile(
    groupName: string,
    groupBy: GroupBy,
    tickets: ClassifiedTicket[]
): string {
    const today = new Date().toISOString().split('T')[0];

    // Determine overall priority label
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    tickets.forEach(t => severityCounts[t.severity]++);
    let priorityLabel = 'Low';
    if (severityCounts.critical > 0) priorityLabel = 'Critical';
    else if (severityCounts.high > 0) priorityLabel = 'High';
    else if (severityCounts.medium > 0) priorityLabel = 'Medium';

    const priorityDetail = Object.entries(severityCounts)
        .filter(([, count]) => count > 0)
        .map(([sev, count]) => `${count} ${sev}`)
        .join(', ');

    // Determine header prefix based on dominant type
    const typeCounts: Record<string, number> = { bug: 0, feature: 0, general: 0 };
    tickets.forEach(t => { if (typeCounts[t.type] !== undefined) typeCounts[t.type]++; });
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
    const typePrefix = dominantType === 'bug' ? 'BUG' : dominantType === 'feature' ? 'FEATURE' : 'FEEDBACK';

    let md = '';
    md += `# [${typePrefix}] ${groupName} Issues — ${today}\n\n`;
    md += `**Source**: Auto-generated from REGIS Feedback Manager\n`;
    md += `**Tickets**: ${tickets.length} feedback items\n`;
    md += `**Priority**: ${priorityLabel} (${priorityDetail})\n`;
    md += `**Grouped by**: ${groupBy}\n\n`;
    md += `---\n\n`;
    md += `## Tickets\n\n`;

    tickets.forEach((t, i) => {
        const name = t.ssoMetadata?.name || 'Anónimo';
        const email = t.ssoMetadata?.email || '';
        const userStr = email ? `${name} (${email})` : name;

        md += `### ${i + 1}. "${truncate(t.message, 80)}"\n\n`;
        md += `- **Reported by**: ${userStr}\n`;
        md += `- **Type**: ${typeEmoji(t.type)} ${typeLabel(t.type)}\n`;
        md += `- **Severity**: ${severityEmoji(t.severity)} ${severityLabel(t.severity)}\n`;
        md += `- **Module**: ${t.module}\n`;
        md += `- **View**: \`${t.appMetadata?.currentView || 'unknown'}\`\n`;
        md += `- **Version**: ${t.appMetadata?.version || 'unknown'}\n`;
        md += `- **Date**: ${t.dateStr}\n`;
        if (t.screenshotUrl) {
            md += `- **Screenshot**: [View](${t.screenshotUrl})\n`;
        }
        md += `- **Ticket ID**: \`${t.id}\`\n`;
        md += '\n';

        // Full message if truncated above
        if (t.message && t.message.length > 80) {
            md += `> ${t.message.replace(/\n/g, '\n> ')}\n\n`;
        }
    });

    // Suggested actions section
    md += `---\n\n`;
    md += `## Suggested Actions\n\n`;

    if (dominantType === 'bug') {
        const modules = [...new Set(tickets.map(t => t.module))];
        modules.forEach(mod => {
            md += `- [ ] Investigate ${mod} module for reported issues\n`;
        });
        md += `- [ ] Add regression tests for affected flows\n`;
        md += `- [ ] Verify offline behavior in affected areas\n`;
    } else if (dominantType === 'feature') {
        md += `- [ ] Evaluate feasibility of requested features\n`;
        md += `- [ ] Prioritize based on user impact and dev effort\n`;
        md += `- [ ] Create implementation plan for approved features\n`;
    } else {
        md += `- [ ] Review and categorize feedback items\n`;
        md += `- [ ] Identify actionable improvements\n`;
    }
    md += `- [ ] Update ticket statuses after resolution\n`;

    return md;
}

// ─── Batch Status Update ─────────────────────────────────────────────────────

async function batchUpdateStatus(
    ticketIds: string[],
    newStatus: 'reviewed' | 'addressed'
): Promise<number> {
    let updated = 0;
    const BATCH_SIZE = 450; // Firestore batch limit safety buffer

    for (let i = 0; i < ticketIds.length; i += BATCH_SIZE) {
        const chunk = ticketIds.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const id of chunk) {
            batch.update(db.collection('feedback').doc(id), { status: newStatus });
        }

        await batch.commit();
        updated += chunk.length;
    }

    return updated;
}

// ─── Output ──────────────────────────────────────────────────────────────────

function ensureOutputDir(): string {
    const outputDir = path.resolve(process.cwd(), 'docs', 'generated', 'tasks');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    return outputDir;
}

function writeTaskFiles(
    groups: Map<string, ClassifiedTicket[]>,
    groupBy: GroupBy,
    outputDir: string
): string[] {
    const writtenFiles: string[] = [];

    for (const [groupName, tickets] of groups) {
        const safeName = groupName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const today = new Date().toISOString().split('T')[0];
        const filename = `TASK-${today}-${groupBy}-${safeName}.md`;
        const filepath = path.join(outputDir, filename);
        const content = generateTaskFile(groupName, groupBy, tickets);

        fs.writeFileSync(filepath, content, 'utf8');
        writtenFiles.push(filepath);
        console.log(`   📄 ${filename} (${tickets.length} tickets)`);
    }

    return writtenFiles;
}

// ─── Interactive Export Flow ─────────────────────────────────────────────────

function getKeyFn(groupBy: GroupBy): (t: ClassifiedTicket) => string {
    switch (groupBy) {
        case 'severity': return (t: ClassifiedTicket) => t.severity;
        case 'module': return (t: ClassifiedTicket) => t.module;
        case 'type': return (t: ClassifiedTicket) => t.type;
    }
}

async function interactiveExport(
    classified: ClassifiedTicket[],
    rl: readline.Interface
): Promise<void> {
    console.log('How would you like to group the tasks?\n');
    console.log('  1) severity  — Group by critical/high/medium/low');
    console.log('  2) module    — Group by app module (Gradebook, Attendance, etc.)');
    console.log('  3) type      — Group by bug/feature/general');
    console.log('  q) quit      — Exit without generating\n');

    const choice = await prompt(rl, '  Select grouping [1/2/3/q]: ');

    let groupBy: GroupBy;
    switch (choice.trim().toLowerCase()) {
        case '1': case 'severity': groupBy = 'severity'; break;
        case '2': case 'module': groupBy = 'module'; break;
        case '3': case 'type': groupBy = 'type'; break;
        case 'q': case 'quit':
            console.log('\n👋 Exiting without changes.\n');
            return;
        default:
            console.log('⚠️  Invalid choice. Defaulting to "module".\n');
            groupBy = 'module';
    }

    const groups = groupTickets(classified, getKeyFn(groupBy));

    // Show groups and let user pick
    console.log(`\n📊 Groups found (${groups.size}):\n`);
    const groupNames = [...groups.keys()];
    groupNames.forEach((name, i) => {
        const count = groups.get(name)!.length;
        console.log(`  ${i + 1}) ${name} (${count} tickets)`);
    });
    console.log(`  a) All groups`);
    console.log(`  q) Quit\n`);

    const selection = await prompt(rl, '  Select groups to export [numbers separated by comma / a / q]: ');

    let selectedGroups: Map<string, ClassifiedTicket[]>;

    if (selection.trim().toLowerCase() === 'q') {
        console.log('\n👋 Exiting without changes.\n');
        return;
    } else if (selection.trim().toLowerCase() === 'a') {
        selectedGroups = groups;
    } else {
        const indices = selection.split(/[,\s]+/)
            .map(s => parseInt(s.trim()) - 1)
            .filter(i => !isNaN(i) && i >= 0 && i < groupNames.length);
        if (indices.length === 0) {
            console.log('⚠️  No valid selection. Exporting all groups.\n');
            selectedGroups = groups;
        } else {
            selectedGroups = new Map();
            for (const idx of indices) {
                const name = groupNames[idx];
                selectedGroups.set(name, groups.get(name)!);
            }
        }
    }

    // Generate files
    const outputDir = ensureOutputDir();
    console.log(`\n📁 Writing task files to: ${outputDir}\n`);
    const writtenFiles = writeTaskFiles(selectedGroups, groupBy, outputDir);
    console.log(`\n✅ Generated ${writtenFiles.length} task file(s)\n`);

    // Ask about status update
    const exportedTicketIds = [...selectedGroups.values()].flat().map(t => t.id);
    const shouldMark = await prompt(rl, `  Mark ${exportedTicketIds.length} exported tickets as "reviewed"? [y/N]: `);

    if (shouldMark.trim().toLowerCase() === 'y') {
        console.log(`\n📝 Updating statuses...`);
        const updated = await batchUpdateStatus(exportedTicketIds, 'reviewed');
        console.log(`   ✅ Updated ${updated} ticket(s)\n`);
    } else {
        console.log('   Skipped status update.\n');
    }
}

async function autoExport(
    classified: ClassifiedTicket[],
    groupBy: GroupBy,
    markReviewed: boolean
): Promise<void> {
    const groups = groupTickets(classified, getKeyFn(groupBy));
    const outputDir = ensureOutputDir();

    console.log(`📂 Grouping by: ${groupBy}`);
    console.log(`📁 Writing task files to: ${outputDir}\n`);

    const writtenFiles = writeTaskFiles(groups, groupBy, outputDir);
    console.log(`\n✅ Generated ${writtenFiles.length} task file(s)\n`);

    if (markReviewed) {
        const allTicketIds = classified.map(t => t.id);
        console.log(`📝 Marking ${allTicketIds.length} tickets as "reviewed"...`);
        const updated = await batchUpdateStatus(allTicketIds, 'reviewed');
        console.log(`   ✅ Updated ${updated} ticket(s)\n`);
    }
}

// ─── CLI Entry ───────────────────────────────────────────────────────────────

async function run() {
    const args = process.argv.slice(2);
    const isAuto = args.includes('--auto');
    const markReviewed = args.includes('--mark-reviewed');
    const presetGroup = args.find(a => a.startsWith('--group='))?.split('=')[1] as GroupBy | undefined;

    console.log('\n' + '═'.repeat(55));
    console.log('  🎯 REGIS Feedback Manager');
    console.log('═'.repeat(55) + '\n');

    // 1. Fetch
    let tickets: FeedbackTicket[];
    try {
        tickets = await fetchUnsolvedFeedback();
    } catch (error) {
        console.error('❌ Failed to connect to Firestore:', error);
        process.exit(1);
    }

    if (tickets.length === 0) {
        console.log('✅ No unsolved feedback tickets found. All clear!\n');
        process.exit(0);
    }

    // 2. Classify
    const classified = classifyTickets(tickets);

    // 3. Display summary
    displaySummary(classified);

    // 4. Export
    if (isAuto || presetGroup) {
        const groupBy = (presetGroup && ['severity', 'module', 'type'].includes(presetGroup))
            ? presetGroup
            : 'module';
        await autoExport(classified, groupBy, markReviewed);
    } else {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await interactiveExport(classified, rl);
        rl.close();
    }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

console.log('🚀 Starting REGIS Feedback Manager...\n');
run()
    .then(() => {
        console.log('═'.repeat(55));
        console.log('  ✅ Feedback Manager completed successfully!');
        console.log('═'.repeat(55) + '\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Feedback Manager failed:', error);
        process.exit(1);
    });
