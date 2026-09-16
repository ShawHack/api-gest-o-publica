const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const start = content.indexOf('// --- LEGISLATION (LEGISLAÇÃO');
const end = content.indexOf('async function loadItems()', start);
console.log(content.substring(start, end));
