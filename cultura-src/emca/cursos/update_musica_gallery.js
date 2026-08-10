const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'musica.html');
const imgFolder = path.join(__dirname, '..', 'imagesemca', 'musica');

let html = fs.readFileSync(htmlPath, 'utf8');

const files = fs.readdirSync(imgFolder).filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png'));

let galleryHtml = '<div class="gallery-grid">\n';
files.forEach(file => {
    galleryHtml += `                    <div class="gallery-item"><img src="../imagesemca/musica/${file}" alt="Galeria Música" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400?text=Foto+Musica';"></div>\n`;
});
galleryHtml += '                </div>';

const regex = /<div class="gallery-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/;
if (regex.test(html)) {
    html = html.replace(regex, galleryHtml + '\n            </div>\n        </section>');
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('Gallery updated successfully with ' + files.length + ' images.');
} else {
    console.log('Regex did not match.');
}
