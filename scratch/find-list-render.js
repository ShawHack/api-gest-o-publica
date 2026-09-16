const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

let pos = 0;
while ((pos = content.indexOf('list', pos)) !== -1) {
  const snippet = content.substring(pos - 20, pos + 80).replace(/\n/g, ' ');
  if (snippet.includes('innerHTML') || snippet.includes('filter') || snippet.includes('comtur-card') || snippet.includes('renderList')) {
    console.log('list at', pos, ':', snippet);
  }
  pos += 10;
}
