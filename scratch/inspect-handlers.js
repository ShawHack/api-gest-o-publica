const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

function printRange(fromText, len) {
  const idx = content.indexOf(fromText);
  if (idx !== -1) {
    console.log(`=== FROM "${fromText}" ===`);
    console.log(content.substring(idx, idx + len));
  }
}

printRange('function onContentTypeChange', 1600);
printRange('function resetForm', 1800);
