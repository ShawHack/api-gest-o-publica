const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const rfIdx = content.indexOf('function resetForm(');
const rlIdx = content.indexOf('function renderList()');
console.log(content.substring(rfIdx + 15000, rlIdx));
