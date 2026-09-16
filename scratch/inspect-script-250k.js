const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

console.log(content.substring(250000, 265000));
