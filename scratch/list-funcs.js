const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const matches = content.matchAll(/(function\s+[a-zA-Z0-9_]+|window\.[a-zA-Z0-9_]+\s*=\s*(?:async\s*)?function|[a-zA-Z0-9_]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g);
const funcs = [];
for (const m of matches) {
  funcs.push(m[0]);
}
console.log('Functions found:', funcs);
