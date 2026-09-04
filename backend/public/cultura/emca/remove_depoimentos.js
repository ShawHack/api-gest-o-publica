const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// Regex to match the Depoimentos section
// It starts with <!-- Depoimentos --> and ends with the next section or <!-- Galeria de Fotos -->
const regex = /<!-- Depoimentos -->[\s\S]*?<\/section>/;

if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Depoimentos section removed successfully!');
} else {
    console.log('Depoimentos section not found.');
}
