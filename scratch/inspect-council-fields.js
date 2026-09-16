const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const councilIdx = content.indexOf('id="councilMemberFields"');
console.log('councilMemberFields index:', councilIdx);
if (councilIdx !== -1) {
  console.log(content.substring(councilIdx - 50, councilIdx + 4000));
}
