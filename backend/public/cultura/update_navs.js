const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            const isRoot = dir === __dirname;
            const prefix = isRoot ? './' : '../';

            // Add Museu to main nav
            const navRegex = /(<nav class="nav-menu"[^>]*>)([\s\S]*?)(<\/nav>)/;
            const match = content.match(navRegex);
            if (match && !match[2].includes('Museu')) {
                const styleMatch = match[2].match(/<a[^>]+href="[^"]*?(?:index|emca|biblioteca|teatro)\.html"[^>]+style="([^"]+)"[^>]*>/i);
                const style = styleMatch ? styleMatch[1] : 'color: #475569; text-decoration: none; font-weight: 500; font-family: \'Rubik\', sans-serif; transition: color 0.3s;';
                
                const newLink = `\n        <a href="${prefix}museu/museu.html" class="nav-link" style="${style}">Museu</a>\n      `;
                const newNavContent = match[2].replace(/\s+$/, '') + newLink;
                content = content.replace(navRegex, `$1${newNavContent}$3`);
                modified = true;
            }

            // Add Museu to mobile menu
            const mobileRegex = /(<div class="mobile-menu" id="mobile-menu">)([\s\S]*?)(<\/div>)/;
            const mMatch = content.match(mobileRegex);
            if (mMatch && !mMatch[2].includes('Museu')) {
                const mLink = `\n    <a href="${prefix}museu/museu.html" class="nav-link" onclick="toggleMenu()">Museu</a>\n  `;
                const newMobile = mMatch[2].replace(/\s+$/, '') + mLink;
                content = content.replace(mobileRegex, `$1${newMobile}$3`);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated ' + fullPath);
            }
        }
    }
}
processDir(__dirname);
