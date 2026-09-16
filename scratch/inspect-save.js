const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const bpIdx = content.indexOf('function buildPayload');
console.log('buildPayload start:\n', content.substring(bpIdx, bpIdx + 800));

const saveIdx = content.indexOf('saveContent(');
console.log('saveContent at:', saveIdx);
