const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const bpIdx = content.indexOf('function buildPayload');
const nextFuncIdx = content.indexOf('window.saveContent', bpIdx);
console.log('buildPayload length:', nextFuncIdx - bpIdx);
console.log('End of buildPayload:\n', content.substring(nextFuncIdx - 2000, nextFuncIdx + 200));
