const fs = require('fs');
const path = require('path');

const vlibrasCode = `
  <!-- VLibras -->
  <div vw class="enabled">
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  </div>
  <script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>
  <script>
    new window.VLibras.Widget('https://vlibras.gov.br/app');
  </script>
</body>`;

function addVLibras(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && file !== 'imagesemca') {
            addVLibras(fullPath);
        } else if (stat.isFile() && file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Only add if not already present
            if (!content.includes('vw-plugin-wrapper')) {
                // Replace closing body tag with vlibras code + closing body tag
                content = content.replace(/<\/body>/, vlibrasCode);
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Added VLibras to: ' + fullPath);
            }
        }
    });
}

const baseDir = path.join(__dirname, 'emca');
if (fs.existsSync(baseDir)) {
    addVLibras(baseDir);
} else {
    // If we are already in emca
    addVLibras(__dirname);
}

console.log('Finished adding VLibras.');
