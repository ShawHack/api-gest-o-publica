const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const initIdx = content.indexOf('function init()');
if (initIdx !== -1) {
  console.log('=== INIT FUNCTION PART 2 ===');
  console.log(content.substring(initIdx + 2500));
}
