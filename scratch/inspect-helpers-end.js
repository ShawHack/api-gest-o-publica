const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const rsdIdx = content.indexOf('function renderServiceDocs()');
const nextIdx = content.indexOf('window.onContentTypeChange');
console.log(content.substring(rsdIdx, nextIdx));
