const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'emca.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Fix text encodings and typos
html = html.replace(/nãone/g, 'none');
html = html.replace(/nǜone/g, 'none');
html = html.replace(/nãossa/g, 'nossa');
html = html.replace(/nǜossa/g, 'nossa');
html = html.replace(/R&á;pido/g, 'Rápido');
html = html.replace(/R&ǭ;pido/g, 'Rápido');

// Change footer background to black
// The CSS is likely: .biblio-footer { background: #ff716e;
html = html.replace(/\.biblio-footer\s*\{\s*background:\s*#ff716e;/g, '.biblio-footer {\n        background: #000000;');

// Some instances might have different spacing, let's use a broader regex
html = html.replace(/\.biblio-footer\s*\{([^}]*)background:\s*#[0-9a-fA-F]+/g, '.biblio-footer {$1background: #000000');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('emca.html updated with black footer and fixed typos.');
