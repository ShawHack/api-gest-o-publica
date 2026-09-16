const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const rsgIdx = content.indexOf('function renderServiceGallery');
if (rsgIdx !== -1) {
  console.log('renderServiceGallery:\n', content.substring(rsgIdx, rsgIdx + 1200));
}
