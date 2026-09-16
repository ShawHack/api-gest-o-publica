const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const rlIdx = content.indexOf('function renderList()');
if (rlIdx !== -1) {
  console.log('renderList:\n', content.substring(rlIdx, rlIdx + 2000));
}
