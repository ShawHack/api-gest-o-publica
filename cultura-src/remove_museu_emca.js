const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.html') && fullPath.includes('emca')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Remove Museu from main nav
            const navRegex = /(<nav class="nav-menu"[^>]*>)([\s\S]*?)(<\/nav>)/;
            const match = content.match(navRegex);
            if (match && match[2].includes('Museu')) {
                const newNavContent = match[2].replace(/\s*<a[^>]+>[^<]*Museu[^<]*<\/a>\s*/, '\n      ');
                content = content.replace(navRegex, `$1${newNavContent}$3`);
                modified = true;
            }

            // Remove Museu from mobile menu
            const mobileRegex = /(<div class="mobile-menu" id="mobile-menu">)([\s\S]*?)(<\/div>)/;
            const mMatch = content.match(mobileRegex);
            if (mMatch && mMatch[2].includes('Museu')) {
                const newMobile = mMatch[2].replace(/\s*<a[^>]+>[^<]*Museu[^<]*<\/a>\s*/, '\n  ');
                content = content.replace(mobileRegex, `$1${newMobile}$3`);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Removed from ' + fullPath);
            }
        }
    }
}
processDir(__dirname);
