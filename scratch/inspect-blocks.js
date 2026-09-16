const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const rfIdx = content.indexOf('function resetForm(');
const rlIdx = content.indexOf('function renderList()');
console.log('=== FROM resetForm TO renderList ===');
console.log(content.substring(rfIdx, rlIdx));

const bpIdx = content.indexOf('function buildPayload(');
const scIdx = content.indexOf('window.saveContent =');
console.log('=== FROM buildPayload TO saveContent ===');
console.log(content.substring(bpIdx, scIdx));
