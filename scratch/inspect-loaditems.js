const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const liIdx = content.indexOf('async function loadItems');
if (liIdx !== -1) {
  console.log('loadItems snippet:\n', content.substring(liIdx, liIdx + 1500));
}
