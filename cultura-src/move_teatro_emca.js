const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Current Teatro is top: 30%; left: 73%;
// New Teatro is top: 25%; left: 73%;
const oldTeatro = /<div class="ponto theater" style="top: 30%; left: 73%;"/;
const newTeatro = `<div class="ponto theater" style="top: 25%; left: 73%;"`;
content = content.replace(oldTeatro, newTeatro);

// Current EMCA is top: 72%; left: 65%;
// New EMCA is top: 65%; left: 65%;
const oldEmca = /<div class="ponto museum" style="top: 72%; left: 65%;"/;
const newEmca = `<div class="ponto museum" style="top: 65%; left: 65%;"`;
content = content.replace(oldEmca, newEmca);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro and EMCA moved up!');
