const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const oldTeatro = /<div class="ponto theater" style="top: 25%; left: 75%;"/;
const newTeatro = `<div class="ponto theater" style="top: 18%; left: 65%;"`;

content = content.replace(oldTeatro, newTeatro);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro pin moved up and left!');
