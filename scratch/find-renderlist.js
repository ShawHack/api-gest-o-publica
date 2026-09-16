const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

let pos = 0;
while ((pos = content.indexOf('renderList', pos)) !== -1) {
  console.log('Found renderList at', pos, content.substring(pos - 30, pos + 50));
  pos += 10;
}
