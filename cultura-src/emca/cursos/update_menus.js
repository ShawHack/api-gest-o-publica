const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', '..'); // teatro folder

function getHtmlFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (let file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'imagesemca' && file !== 'images' && !file.startsWith('.')) {
                getHtmlFiles(fullPath, files);
            }
        } else if (fullPath.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

const htmlFiles = getHtmlFiles(rootDir);

for (let file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Update Dropdown Menu text for Desenho
    if (content.includes('>Desenho</a>')) {
        content = content.replace(/>Desenho<\/a>/g, '>Desenho e Pintura</a>');
        changed = true;
    }
    
    // Remove Pintura from the dropdown list.
    // In the menu, it looks like: <a href="../cursos/pintura.html" class="dropdown-item">Pintura</a>
    // We should match any relative path pointing to pintura.html
    const pinturaRegex = /<a href="[^"]*?pintura\.html" class="dropdown-item">Pintura<\/a>\s*/g;
    if (pinturaRegex.test(content)) {
        content = content.replace(pinturaRegex, '');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated menus in ${file}`);
    }
}
console.log('Menu updates completed!');
