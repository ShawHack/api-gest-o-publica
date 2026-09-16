const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const s = content.indexOf('function loadItemForEdit(');
const e = content.indexOf('function buildPayload(', s);
console.log(content.substring(s, e));
