const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

console.log('Search "item.type === \'legislation\'":');
let pos = 0;
while ((pos = content.indexOf("item.type === 'legislation'", pos)) !== -1) {
  console.log('Found at', pos, 'Context:', content.substring(pos - 50, pos + 100));
  pos += 10;
}

console.log('Search "Listeners for":');
pos = 0;
while ((pos = content.indexOf("Listeners for", pos)) !== -1) {
  console.log('Found at', pos, 'Context:', content.substring(pos - 30, pos + 50));
  pos += 10;
}
