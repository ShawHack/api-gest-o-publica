const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const lines = content.split('\n');
console.log(lines.slice(5580, 5760).map((l, i) => `${5581 + i}: ${l}`).join('\n'));
