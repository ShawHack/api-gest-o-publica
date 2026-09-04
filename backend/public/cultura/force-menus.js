const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!['node_modules', '.git', 'uploads'].includes(f)) {
        walkDir(dirPath, callback);
      }
    } else if (f.endsWith('.html') && !f.includes('admin.html')) {
      callback(dirPath);
    }
  });
}

walkDir(__dirname, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Ensure menu-overlay exists
  if (content.includes('id="mobile-menu"') && !content.includes('id="menu-overlay"')) {
    content = content.replace(
      '<div class="mobile-menu" id="mobile-menu">',
      '<!-- MOBILE MENU OVERLAY -->\n  <div class="menu-overlay" id="menu-overlay" onclick="toggleMenu()"></div>\n\n  <div class="mobile-menu" id="mobile-menu">'
    );
    changed = true;
  }

  // 2. Fix toggleMenu function to include overlay logic
  const oldToggleRegex = /function\s+toggleMenu\s*\(\)\s*\{[\s\S]*?(?=\}<\/script>|<\/script>|\}\s*<\/script>)/;
  if (oldToggleRegex.test(content) && !content.includes('overlay.classList.add("active")')) {
    content = content.replace(oldToggleRegex, `function toggleMenu() {
      const menu = document.getElementById("mobile-menu");
      const overlay = document.getElementById("menu-overlay");
      if (menu) {
          menu.classList.toggle("open");
          if(overlay) {
              if(menu.classList.contains("open")) {
                  overlay.classList.add("active");
              } else {
                  overlay.classList.remove("active");
              }
          }
      }
    }`);
    changed = true;
  }

  // 3. Unhide hamburger inline styles if they are hidden
  if (content.includes('class="hamburger"') && content.includes('display: none;')) {
    content = content.replace(/style="([^"]*)display:\s*n[?]one;([^"]*)"/g, 'style="$1$2"');
    content = content.replace(/style="([^"]*)display:\s*none;([^"]*)"/g, 'style="$1$2"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
});
console.log('Done');
