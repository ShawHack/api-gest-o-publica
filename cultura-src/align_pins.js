const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// The current biblioteca is at top: 28%; left: 28%;
// The current teatro is at top: 18%; left: 65%;
// The user wants them aligned and on opposite edges. Let's try top: 25% for both, left: 20% for biblioteca, left: 80% for teatro.

const oldBiblio = /<div class="ponto library" style="top: 28%; left: 28%;"/;
const newBiblio = `<div class="ponto library" style="top: 25%; left: 20%;"`;

const oldTeatro = /<div class="ponto theater" style="top: 18%; left: 65%;"/;
const newTeatro = `<div class="ponto theater" style="top: 25%; left: 80%;"`;

content = content.replace(oldBiblio, newBiblio);
content = content.replace(oldTeatro, newTeatro);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro and Biblioteca perfectly aligned!');
