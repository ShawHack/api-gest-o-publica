const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca', 'emca.css');
let content = fs.readFileSync(filePath, 'utf8');

const targetStyle = `.prev-btn-cursos, .next-btn-cursos,
.prev-btn-fotos, .next-btn-fotos,
.prev-btn-galeria, .next-btn-galeria {
    width: 52px;
    height: 52px;
    font-size: 1.1rem;
    background: #364ba3;
    color: white !important;
    border: 2px solid rgba(255, 255, 255, 0.2);`;

const newStyle = `.prev-btn-cursos, .next-btn-cursos,
.prev-btn-fotos, .next-btn-fotos,
.prev-btn-galeria, .next-btn-galeria {
    width: 52px;
    height: 52px;
    font-size: 1.1rem;
    background: #364ba3 !important;
    color: white !important;
    border: 2px solid rgba(255, 255, 255, 0.2);`;

if(content.includes(targetStyle)) {
    content = content.replace(targetStyle, newStyle);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Arrow buttons background forced to blue!');
} else {
    console.log('Target CSS block not found! Trying fallback...');
    // Just in case it's slightly different
    content = content.replace(/background:\s*#364ba3;/, 'background: #364ba3 !important;');
    fs.writeFileSync(filePath, content, 'utf8');
}
