const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

function findOccurrences(term) {
  let idx = 0;
  while ((idx = content.indexOf(term, idx)) !== -1) {
    console.log(`=== FOUND "${term}" at ${idx} ===`);
    console.log(content.substring(idx - 50, idx + 400));
    idx += term.length;
  }
}

console.log('--- uploadImage ---');
findOccurrences('uploadImage');
findOccurrences('upload');
