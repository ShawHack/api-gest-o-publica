const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const councilIdx = content.indexOf('id="councilMemberFields"');
if (councilIdx !== -1) {
  const endIdx = content.indexOf('id="standardFields"', councilIdx);
  console.log('councilMemberFields container length:', endIdx - councilIdx);
  console.log(content.substring(councilIdx + 3000, endIdx));
}
