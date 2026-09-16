const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const s = content.indexOf('function renderList()');
const e = content.indexOf('function loadItemForEdit(', s);
console.log(content.substring(s, e));
