const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');
const start = content.indexOf('id="legislationFields"');
console.log('--- HTML ---');
console.log(content.substring(start, start + 4000));
