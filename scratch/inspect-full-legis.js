const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const start = content.indexOf('// --- LEGISLATION (LEGISLAÇÃO');
const end = content.indexOf('// --- ATTRACTIONS', start);
console.log('LENGTH:', end - start);
console.log(content.substring(start, end));
