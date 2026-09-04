const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Current Teatro is top: 25%; left: 80%;
// Let's change it to top: 30%; left: 73%; so it aligns with Biblioteca (top: 30%) and sits inside the map.

const oldTeatro = /<div class="ponto theater" style="top: 25%; left: 80%;"/;
const newTeatro = `<div class="ponto theater" style="top: 30%; left: 73%;"`;

content = content.replace(oldTeatro, newTeatro);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro pin brought inside the map and aligned!');
