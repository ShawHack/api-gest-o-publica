const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const bpIdx = content.indexOf('function buildPayload');
const saveIdx = content.indexOf('async function saveContent');
console.log('buildPayload snippet:\n', content.substring(saveIdx - 2500, saveIdx));
