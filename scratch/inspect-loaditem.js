const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const loadIdx = content.indexOf('function loadItemForEdit(item)');
if (loadIdx !== -1) {
  console.log('loadItemForEdit snippet:\n', content.substring(loadIdx + 1000, loadIdx + 3000));
}
