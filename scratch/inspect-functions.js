const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

function showAround(query, len = 1000) {
  let idx = 0;
  while ((idx = content.indexOf(query, idx)) !== -1) {
    console.log(`=== FOUND "${query}" at ${idx} ===`);
    console.log(content.substring(idx - 100, idx + len));
    idx += query.length;
  }
}

console.log('--- onContentTypeChange ---');
showAround('function onContentTypeChange');

console.log('--- resetForm ---');
showAround('function resetForm');

console.log('--- renderList ---');
showAround('function renderList(');

console.log('--- loadItemForEdit ---');
showAround('function loadItemForEdit');

console.log('--- init ---');
showAround('function init()');
