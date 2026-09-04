const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// The current teatro pin is at top: 28%; left: 28%;
// We want it "mais no canto de la", so further left. Let's try top: 38%; left: 15%;

const oldTeatro = /<div class="ponto theater" style="top: 28%; left: 28%;"/;
const newTeatro = `<div class="ponto theater" style="top: 36%; left: 15%;"`;

content = content.replace(oldTeatro, newTeatro);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro pin moved to the far left corner!');
