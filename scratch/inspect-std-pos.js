const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const stdIdx = content.indexOf('id="standardFields"');
console.log('standardFields index:', stdIdx);
if (stdIdx !== -1) {
  console.log(content.substring(stdIdx - 200, stdIdx + 1200));
}
