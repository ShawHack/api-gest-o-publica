const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const normIdx = content.indexOf('function normalizeType');
if (normIdx !== -1) {
  console.log('=== normalizeType ===');
  console.log(content.substring(normIdx, normIdx + 1000));
}
