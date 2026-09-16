const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

function inspectSnippet(label, startQuery, len = 400) {
  const idx = content.indexOf(startQuery);
  console.log(`=== ${label} (index ${idx}) ===`);
  if (idx !== -1) {
    console.log(content.substring(idx, idx + len));
  } else {
    console.log('NOT FOUND');
  }
}

inspectSnippet('1. indicatorFields Section 1', '<div id="indicatorFields"');
inspectSnippet('2. INDICATOR CONSTANTS & HELPERS', '// --- INDICATOR CONSTANTS & HELPERS ---');
inspectSnippet('3. resetForm indicator', 'if (currentType === \'indicator\') {');
inspectSnippet('4. loadItemForEdit indicator', '} else if (item.type === \'indicator\') {');
inspectSnippet('5. renderList empty', 'if (!filtered.length) {');
inspectSnippet('6. loadItems catch', '} catch (err) {\n      console.error(\'loadItems error:\', err);');
inspectSnippet('7. init indicator listeners', 'if ($(\'indMetricKey\')) {');
