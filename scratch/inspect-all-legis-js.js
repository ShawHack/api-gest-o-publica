const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

function extract(name, regex) {
  const match = content.match(regex);
  console.log(`\n=== ${name} ===`);
  if (match) console.log(match[0]);
  else console.log('NO MATCH');
}

extract('RESET LEGIS', /if \(currentType === 'legislation'\) \{[\s\S]*?if \(currentType === 'council'\)/);
extract('LOAD LEGIS', /\} else if \(item\.type === 'legislation'\) \{[\s\S]*?\} else if \(item\.type === 'council'\)/);
extract('BUILD LEGIS', /if \(currentType === 'legislation'\) \{[\s\S]*?if \(currentType === 'council'\)/);
extract('PDF FUNCTIONS', /function uploadLegisPdf[\s\S]*?function renderLegisPdfPreview[\s\S]*?function /);
extract('RENDERLIST LEGIS', /item\.type === 'legislation'[\s\S]*?return /);
