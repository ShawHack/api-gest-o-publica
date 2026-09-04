const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cursos', 'danca.html');
let content = fs.readFileSync(filePath, 'utf8');

// Fix Alice Ballet folder path
const aliceRegex1 = /Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20\(Ballet\)/g;
const aliceRegex2 = /Alice no Pa[í]s das Maravilhas \(Ballet\)/g;
content = content.replace(aliceRegex1, 'Alice_Ballet');
content = content.replace(aliceRegex2, 'Alice_Ballet');

// Fix Dança folder path issue (catch any encoding glitch)
const dancaRegex1 = /\.\.\/imagesemca\/Dan[çc]*a\/capacelular1\.png/gi;
content = content.replace(dancaRegex1, '../imagesemca/capacelularballet1.png');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed broken image paths in danca.html');
