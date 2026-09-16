const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const onCtIdx = content.indexOf('window.onContentTypeChange = function(');
console.log('=== onContentTypeChange ===');
console.log(content.substring(onCtIdx, onCtIdx + 1500));

const resetIdx = content.indexOf('function resetForm(');
console.log('=== resetForm ===');
console.log(content.substring(resetIdx, resetIdx + 4000));
