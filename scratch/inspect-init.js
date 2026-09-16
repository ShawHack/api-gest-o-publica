const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// Find init() function
const initIdx = content.indexOf('function init()');
if (initIdx !== -1) {
  console.log('=== INIT FUNCTION ===');
  console.log(content.substring(initIdx, initIdx + 3000));
}
