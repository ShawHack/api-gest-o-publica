const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'museu', 'museu.html');
let content = fs.readFileSync(filePath, 'utf8');

// Change the background image in the museum-hero class
content = content.replace(/background-image: url\('museu_bg\.png'\);/, "background-image: url('museu_real.png');");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Hero background updated to real image!');
