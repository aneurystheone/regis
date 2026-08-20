const fs = require('fs');

const reportPath = 'tests/LightHouse/localhost_4173-20260622T113004 Lighthouse tst 23-06-26.json';
const j = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('--- Main Thread Work Breakdown ---');
const mainThreadWork = j.audits['mainthread-work-breakdown'];

if (mainThreadWork) {
    console.log(`Score: ${mainThreadWork.score}`);
    console.log(`Value: ${mainThreadWork.displayValue}`);
    
    if (mainThreadWork.details && mainThreadWork.details.items) {
        console.log('\nBreakdown by category:');
        mainThreadWork.details.items.forEach(item => {
            console.log(`- ${item.groupLabel}: ${item.duration} ms`);
        });
    }
}

console.log('\n--- Long Tasks ---');
const longTasks = j.audits['long-tasks'];
if (longTasks) {
    console.log(`Score: ${longTasks.score}`);
    console.log(`Value: ${longTasks.displayValue}`);
    
    if (longTasks.details && longTasks.details.items) {
        longTasks.details.items.forEach((item, index) => {
            console.log(`\nTask ${index + 1}:`);
            console.log(`  Duration: ${item.duration} ms`);
            console.log(`  Start Time: ${item.startTime} ms`);
            if (item.url) console.log(`  URL: ${item.url}`);
        });
    }
}

console.log('\n--- Bootup Time ---');
const bootupTime = j.audits['bootup-time'];
if (bootupTime) {
    console.log(`Score: ${bootupTime.score}`);
    console.log(`Value: ${bootupTime.displayValue}`);
    
    if (bootupTime.details && bootupTime.details.items) {
        bootupTime.details.items.slice(0, 5).forEach((item, index) => {
            console.log(`\nItem ${index + 1}:`);
            console.log(`  URL: ${item.url}`);
            console.log(`  Total: ${item.total} ms`);
            console.log(`  Script Parse: ${item.scripting} ms`);
            console.log(`  Script Eval: ${item.scriptParseCompile} ms`);
        });
    }
}
