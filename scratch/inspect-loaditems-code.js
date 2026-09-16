const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const start = content.indexOf('function loadItems()');
console.log(content.substring(start, start + 3500));
