const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const start = content.indexOf('function uploadLegisPdf');
console.log(content.substring(start, start + 2500));
