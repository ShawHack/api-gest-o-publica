const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// The current biblioteca is at top: 25%; left: 20%;
// The user wants it a bit lower and more to the side. Let's try top: 30%; left: 25%;

const oldBiblio = /<div class="ponto library" style="top: 25%; left: 20%;"/;
const newBiblio = `<div class="ponto library" style="top: 30%; left: 25%;"`;

content = content.replace(oldBiblio, newBiblio);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Biblioteca pin moved lower and to the side!');
