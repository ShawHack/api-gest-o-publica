const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

let pos = 0;
while ((pos = content.indexOf('allItems', pos)) !== -1) {
  console.log('allItems at', pos, ':', content.substring(pos - 30, pos + 80).replace(/\n/g, ' '));
  pos += 10;
}
