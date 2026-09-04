const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Currently:
// Teatro: top: 36%; left: 15%;
// Biblioteca: top: 38%; left: 78%;
// EMCA: top: 72%; left: 65%;

const oldTeatro = /<div class="ponto theater" style="top: 36%; left: 15%;"/;
const newTeatro = `<div class="ponto theater" style="top: 38%; left: 78%;"`;

const oldBiblio = /<div class="ponto library" style="top: 38%; left: 78%;"/;
const newBiblio = `<div class="ponto library" style="top: 28%; left: 28%;"`;

content = content.replace(oldTeatro, newTeatro);
content = content.replace(oldBiblio, newBiblio);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro and Biblioteca swapped!');
