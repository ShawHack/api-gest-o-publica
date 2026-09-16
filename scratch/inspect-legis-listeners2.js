const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const start = content.indexOf('// 8. Listeners for Membros do Conselho');
const end = content.indexOf('// 10. Listeners for Standard', start);
console.log(content.substring(start, end));
