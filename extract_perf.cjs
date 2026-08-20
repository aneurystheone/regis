const fs = require('fs');

const reportPath = 'tests/LightHouse/localhost_4173-20260622T113004 Lighthouse tst 23-06-26.json';
const j = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('--- Performance Metrics ---');
const perfCategory = j.categories.performance;
console.log('Performance Score:', perfCategory.score);

const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'];
metrics.forEach(m => {
    const audit = j.audits[m];
    if (audit) {
        console.log(`${audit.title}: ${audit.displayValue} (Score: ${audit.score})`);
    }
});

console.log('\n--- Top Performance Opportunities ---');
const refs = perfCategory.auditRefs.filter(r => r.weight > 0);
refs.forEach(r => {
    const a = j.audits[r.id];
    // Check if it's an opportunity (usually has details.type === 'opportunity' or significant savings)
    if (a.score !== null && a.score < 1 && (a.details?.type === 'opportunity' || a.details?.overallSavingsMs > 0 || a.details?.overallSavingsBytes > 0)) {
        console.log(`\n[${a.score.toFixed(2)}] ${a.title}`);
        if (a.details && a.details.overallSavingsMs) console.log(`  Savings: ${a.details.overallSavingsMs} ms`);
        if (a.details && a.details.overallSavingsBytes) console.log(`  Savings: ${(a.details.overallSavingsBytes / 1024).toFixed(2)} KB`);
        
        if (a.details && a.details.items && a.details.items.length > 0) {
            a.details.items.slice(0, 5).forEach(item => {
                if (item.url) console.log(`  - URL: ${item.url}`);
                if (item.node && item.node.snippet) console.log(`  - Node: ${item.node.snippet}`);
                if (item.totalBytes) console.log(`    Total Bytes: ${(item.totalBytes / 1024).toFixed(2)} KB`);
                if (item.wastedBytes) console.log(`    Wasted Bytes: ${(item.wastedBytes / 1024).toFixed(2)} KB`);
                if (item.wastedMs) console.log(`    Wasted Ms: ${item.wastedMs} ms`);
            });
        }
    }
});

console.log('\n--- Diagnostics ---');
refs.forEach(r => {
    const a = j.audits[r.id];
    if (a.score !== null && a.score < 1 && (!a.details || (a.details.type !== 'opportunity' && !a.details.overallSavingsMs && !a.details.overallSavingsBytes))) {
        console.log(`[${a.score.toFixed(2)}] ${a.title}`);
        if (a.displayValue) console.log(`  Value: ${a.displayValue}`);
        
        if (a.details && a.details.items && a.details.items.length > 0) {
            a.details.items.slice(0, 3).forEach(item => {
                if (item.url) console.log(`  - URL: ${item.url}`);
            });
        }
    }
});
