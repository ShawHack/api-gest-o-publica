const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const ctIdx = content.indexOf('const CONTENT_TYPES = [');
console.log('CONTENT_TYPES Full:\n', content.substring(ctIdx, ctIdx + 2200));
