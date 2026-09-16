const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const resetIdx = content.indexOf("if (currentType === 'legislation')");
console.log('=== resetForm for legislation ===');
console.log(content.substring(resetIdx, resetIdx + 1500));
