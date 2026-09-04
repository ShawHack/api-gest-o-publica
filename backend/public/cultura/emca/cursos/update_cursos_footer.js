const fs = require('fs');
const path = require('path');

const emcaPath = path.join(__dirname, '..', 'emca.html');
const emcaHtml = fs.readFileSync(emcaPath, 'utf8');

const footerRegex = /<style>\s*\.biblio-footer\s*\{[\s\S]*?<\/footer>/;
const match = emcaHtml.match(footerRegex);

if (!match) process.exit(1);

let newFooter = match[0];
newFooter = newFooter.replace(/href="\.\.\/index\.html"/g, 'href="../../index.html"');
newFooter = newFooter.replace(/href="\.\.\/emca\/emca\.html"/g, 'href="../../emca/emca.html"');
newFooter = newFooter.replace(/href="\.\.\/biblioteca\/biblioteca\.html"/g, 'href="../../biblioteca/biblioteca.html"');

// Add !important to the footer text colors to avoid being overridden by course-specific global styles
newFooter = newFooter.replace(/color:\s*#ffffff;/g, 'color: #ffffff !important;');
newFooter = newFooter.replace(/color:\s*rgba\(255,255,255,0\.9\);/g, 'color: rgba(255,255,255,0.9) !important;');
newFooter = newFooter.replace(/color:\s*rgba\(255,255,255,0\.8\);/g, 'color: rgba(255,255,255,0.8) !important;');

const files = ['circo.html', 'danca.html', 'desenho.html', 'musica.html', 'pintura.html', 'teatro.html'];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        const fileFooterRegex = /<style>\s*\.biblio-footer\s*\{[\s\S]*?<\/footer>/;
        if (fileFooterRegex.test(content)) {
            content = content.replace(fileFooterRegex, newFooter);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
        } else {
             const fallbackRegex = /<footer class="biblio-footer"[\s\S]*?<\/footer>/;
             if (fallbackRegex.test(content)) {
                 content = content.replace(fallbackRegex, newFooter);
                 fs.writeFileSync(filePath, content, 'utf8');
             }
        }
    }
});
