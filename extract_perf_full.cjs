const fs = require('fs');

const reportPath = 'tests/LightHouse/localhost_4173-20260622T113004 Lighthouse tst 23-06-26.json';
const j = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('--- Full Performance Details ---');
const perfCategory = j.categories.performance;
const refs = perfCategory.auditRefs;

refs.forEach(r => {
    const a = j.audits[r.id];
    if (a && a.score !== null && a.score < 1) {
        console.log(`\n[Score: ${a.score}] ${a.title} (${r.id})`);
        if (a.displayValue) console.log(`  Value: ${a.displayValue}`);
        if (a.details && a.details.overallSavingsMs) console.log(`  Savings: ${a.details.overallSavingsMs} ms`);
        if (a.details && a.details.overallSavingsBytes) console.log(`  Savings: ${(a.details.overallSavingsBytes / 1024).toFixed(2)} KB`);
        
        if (a.details && a.details.items && a.details.items.length > 0) {
            a.details.items.slice(0, 10).forEach(item => {
                let line = '  - ';
                if (item.url) line += `URL: ${item.url} `;
                if (item.node && item.node.snippet) line += `Node: ${item.node.snippet} `;
                if (item.totalBytes) line += `Total: ${(item.totalBytes / 1024).toFixed(1)} KB `;
                if (item.wastedBytes) line += `Wasted: ${(item.wastedBytes / 1024).toFixed(1)} KB `;
                if (item.wastedMs) line += `WastedMs: ${item.wastedMs} ms `;
                if (item.transferSize) line += `Transfer: ${(item.transferSize / 1024).toFixed(1)} KB `;
                console.log(line);
            });
        }
    }
});
