const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const buildPayloadIdx = content.indexOf('function buildPayload');
const loadIdx = content.indexOf('function loadItemForEdit(item)');
console.log('End of loadItemForEdit:\n', content.substring(buildPayloadIdx - 2000, buildPayloadIdx));
