const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const onCtIdx = content.indexOf('window.onContentTypeChange = function');
const rlIdx = content.indexOf('function renderList()');

console.log('=== CURRENT onContentTypeChange & resetForm ===');
console.log(content.substring(onCtIdx, rlIdx));
