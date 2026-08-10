const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cursos', 'desenho.html');
let content = fs.readFileSync(filePath, 'utf8');

// Remove the broken pintura images from the gallery
content = content.replace(/<div class="gallery-item"><img src="\.\.\/imagesemca\/pintura\/pintura2\.jpg" alt="Pintura Aluno 1"><\/div>/g, '');
content = content.replace(/<div class="gallery-item"><img src="\.\.\/imagesemca\/pintura\/pintura3\.jpg" alt="Pintura Aluno 2"><\/div>/g, '');
content = content.replace(/<div class="gallery-item"><img src="\.\.\/imagesemca\/pintura\/pintura4\.jpg" alt="Pintura Aluno 3"><\/div>/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Broken images removed from desenho.html');
