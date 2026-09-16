const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

console.log('--- Legislation in CONTENT_TYPES ---');
const ctIdx = content.indexOf("id: 'legislation'");
console.log(content.substring(ctIdx - 50, ctIdx + 300));

console.log('--- standardFields container ---');
const stdIdx = content.indexOf('id="standardFields"');
console.log(content.substring(stdIdx, stdIdx + 1500));
