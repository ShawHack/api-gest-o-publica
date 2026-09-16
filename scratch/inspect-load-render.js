const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const loadStart = content.indexOf('function loadItemForEdit');
console.log('--- loadItemForEdit ---');
console.log(content.substring(loadStart, loadStart + 2500));

const renderListStart = content.indexOf('function renderList()');
console.log('--- renderList ---');
console.log(content.substring(renderListStart, renderListStart + 2500));
