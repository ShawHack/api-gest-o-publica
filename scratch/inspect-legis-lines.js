const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

lines.forEach((line, idx) => {
  if (line.includes('// --- LEGISLATION') || line.includes('function renderLegisPdfPreview') || line.includes('function uploadLegisPdf')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
