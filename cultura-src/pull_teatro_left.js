const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Current Teatro is top: 25%; left: 73%;
// It's still floating in the void. Let's pull it much further left to be inside the building. Let's try left: 58%;
const oldTeatro = /<div class="ponto theater" style="top: 25%; left: 73%;"/;
const newTeatro = `<div class="ponto theater" style="top: 25%; left: 58%;"`;

content = content.replace(oldTeatro, newTeatro);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro pin moved inside the building!');
