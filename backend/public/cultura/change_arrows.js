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
    background: white;
    color: var(--lavender) !important;
    border: 2px solid rgba(255, 213, 201, 0.4);`;

const newStyle = `.prev-btn-cursos, .next-btn-cursos,
.prev-btn-fotos, .next-btn-fotos,
.prev-btn-galeria, .next-btn-galeria {
    width: 52px;
    height: 52px;
    font-size: 1.1rem;
    background: #364ba3;
    color: white !important;
    border: 2px solid rgba(255, 255, 255, 0.2);`;

if(content.includes(targetStyle)) {
    content = content.replace(targetStyle, newStyle);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Arrow buttons changed to blue with white arrows!');
} else {
    console.log('Target CSS block not found!');
}
