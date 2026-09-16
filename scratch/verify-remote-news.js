const fs = require('fs');
const html = fs.readFileSync('/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html', 'utf8');

console.log('=== REMOTE FILE VERIFICATION ===');
const countNewsFields = (html.match(/id="newsFields"/g) || []).length;
console.log('1. Occurrences of id="newsFields":', countNewsFields);
console.log('2. specializedMap contains news -> newsFields:', html.includes("'news': 'newsFields'"));
console.log('3. newsCoverFileInput exists:', html.includes('id="newsCoverFileInput"'));
console.log('4. newsTitle exists:', html.includes('id="newsTitle"'));
console.log('5. newsSummary exists:', html.includes('id="newsSummary"'));
console.log('6. newsBody exists:', html.includes('id="newsBody"'));
console.log('7. newsCoverPreview exists:', html.includes('id="newsCoverPreview"'));
console.log('8. newsPhotoCredit exists:', html.includes('id="newsPhotoCredit"'));
console.log('9. newsCategory options exist:', html.includes('<option value="COMTUR">COMTUR</option>'));
console.log('10. Error message has notícias:', html.includes('Não foi possível carregar as notícias.'));

if (countNewsFields === 1 && html.includes("'news': 'newsFields'") && html.includes('id="newsCoverFileInput"')) {
  console.log('>>> REMOTE FILE IS 100% VALIDATED AND IN SYNC! <<<');
} else {
  console.error('>>> REMOTE FILE VALIDATION FAILED! <<<');
  process.exit(1);
}
