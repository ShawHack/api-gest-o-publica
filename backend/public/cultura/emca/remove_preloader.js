const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

const loaderRegex = /<!-- Preloader -->\s*<div id="preloader">\s*<div class="loader-spinner"><\/div>\s*<\/div>/;

if (loaderRegex.test(content)) {
    content = content.replace(loaderRegex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Preloader removed from emca.html!');
} else {
    console.log('Preloader not found in emca.html.');
}
