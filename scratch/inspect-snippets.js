const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

function findSnippet(keyword, before=200, after=600) {
  let idx = 0;
  while ((idx = content.indexOf(keyword, idx)) !== -1) {
    console.log(`\n================ FOUND AT ${idx} ================`);
    console.log(content.substring(Math.max(0, idx - before), Math.min(content.length, idx + after)));
    idx += keyword.length;
  }
}

console.log('--- RESET FORM LEGIS ---');
findSnippet("currentType === 'legislation'");

console.log('--- LOAD ITEM LEGIS ---');
findSnippet("item.type === 'legislation'");

