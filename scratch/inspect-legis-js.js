const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

function showSection(name, startPattern, endPattern) {
  const start = content.indexOf(startPattern);
  if (start === -1) {
    console.log('Not found:', startPattern);
    return;
  }
  const end = content.indexOf(endPattern, start);
  console.log(`\n=== ${name} ===`);
  console.log(content.substring(start, end !== -1 ? end : start + 1500));
}

showSection('RESET FORM LEGIS', "if (currentType === 'legislation')", "if (currentType === 'council')");
showSection('LOAD ITEM FOR EDIT LEGIS', "} else if (item.type === 'legislation') {", "} else if (item.type === 'council') {");
showSection('BUILD PAYLOAD LEGIS', "if (currentType === 'legislation') {", "if (currentType === 'council') {");
showSection('LISTENERS LEGIS', "// 9. Listeners for Legislação", "// 10. Listeners for Standard");
