const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// Regex to match the Eventos section
// It starts with <!-- Agenda de Eventos --> and ends with </section>
const regex = /<!-- Agenda de Eventos -->[\s\S]*?<\/section>/;

if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Eventos section removed successfully!');
} else {
    console.log('Eventos section not found.');
}
