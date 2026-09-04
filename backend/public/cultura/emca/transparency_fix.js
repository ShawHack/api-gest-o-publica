const fs = require('fs');
const path = require('path');

// 1. Modify emca.html (make background more transparent)
const htmlPath = path.join(__dirname, 'emca.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Change from 0.95 to 0.45 for a nice frosted glass effect
htmlContent = htmlContent.replace(/background: rgba\(255, 255, 255, 0\.95\);/, 'background: rgba(255, 255, 255, 0.45);');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Stats background made more transparent in emca.html');

// 2. Modify emca.css (remove the top line from Cursos section)
const cssPath = path.join(__dirname, 'emca.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// The line is caused by:
// .cursos-section-new {
//     border-top: 1px solid rgba(10, 25, 47, 0.06);
//     box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
// }
// and .cursos-section-new::before

cssContent = cssContent.replace(/border-top: 1px solid rgba\(10, 25, 47, 0\.06\);/g, 'border-top: none;');
cssContent = cssContent.replace(/box-shadow: inset 0 1px 0 rgba\(255, 255, 255, 0\.8\);/g, 'box-shadow: none;');

// Remove the colorful line on top
const beforeRegex = /\.cursos-section-new::before\s*{[\s\S]*?}/;
if (beforeRegex.test(cssContent)) {
    cssContent = cssContent.replace(beforeRegex, '.cursos-section-new::before { display: none; }');
}

fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('Removed horizontal lines from emca.css');
