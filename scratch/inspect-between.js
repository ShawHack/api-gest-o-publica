const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const onCtIdx = content.indexOf('window.onContentTypeChange = function');
const liIdx = content.indexOf('async function loadItems()');
console.log('=== BETWEEN onContentTypeChange AND loadItems ===');
console.log(content.substring(onCtIdx, liIdx));
