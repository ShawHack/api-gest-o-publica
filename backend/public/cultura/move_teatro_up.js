const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// The current teatro pin is at top: 38%; left: 78%;
// We want to move it higher. Let's try top: 25%; left: 75%;

const oldTeatro = /<div class="ponto theater" style="top: 38%; left: 78%;"/;
const newTeatro = `<div class="ponto theater" style="top: 25%; left: 75%;"`;

content = content.replace(oldTeatro, newTeatro);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro pin moved up!');
