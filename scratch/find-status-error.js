const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const resetIdx = content.indexOf('function resetForm(');
const resetEnd = content.indexOf('// --- SIDEBAR LIST ---', resetIdx);
const resetCode = content.substring(resetIdx, resetEnd);

let idx = 0;
while ((idx = resetCode.indexOf('statusToSave', idx)) !== -1) {
  console.log('=== FOUND statusToSave in resetForm at', idx, '===');
  console.log(resetCode.substring(idx - 100, idx + 200));
  idx += 12;
}
