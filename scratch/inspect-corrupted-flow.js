const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const onCtIdx = content.indexOf('window.onContentTypeChange = function');
console.log('=== FULL onContentTypeChange ===');
console.log(content.substring(onCtIdx, onCtIdx + 1600));

const liIdx = content.indexOf('async function loadItems()');
console.log('=== FULL loadItems ===');
console.log(content.substring(liIdx, liIdx + 1600));
