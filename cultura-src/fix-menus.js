const fs = require('fs');
const path = require('path');

const menuHTML = `
  <!-- MOBILE MENU OVERLAY -->
  <div class="menu-overlay" id="menu-overlay" onclick="toggleMenu()"></div>

  <!-- MOBILE MENU -->
  <div class="mobile-menu" id="mobile-menu">
    <a href="/index.html" class="nav-link" onclick="toggleMenu()">Início</a>
    <a href="/emca/emca.html" class="nav-link" onclick="toggleMenu()">EMCA</a>
    <a href="/biblioteca/biblioteca.html" class="nav-link" onclick="toggleMenu()">Biblioteca</a>
    <a href="/teatro/teatro.html" class="nav-link" onclick="toggleMenu()">Teatro</a>
    <a href="/museu/museu.html" class="nav-link" onclick="toggleMenu()">Museu</a>
    <a href="/eventos/eventos.html" class="nav-link" onclick="toggleMenu()">Eventos</a>
    
    <div class="mobile-menu-actions">
      <a href="/mapa.html" class="mobile-btn-mapa"><i data-lucide="map" style="width:18px;height:18px;"></i> Mapa Cultural</a>
      <a href="/login.html" class="mobile-btn-login"><i data-lucide="log-in" style="width:18px;height:18px;"></i> Login</a>
      <a href="/cadastro.html" class="mobile-btn-cadastro"><i data-lucide="user-plus" style="width:18px;height:18px;"></i> Cadastre-se</a>
    </div>
  </div>

  <script>
    if (typeof toggleMenu === 'undefined') {
      window.toggleMenu = function() {
        const menu = document.getElementById("mobile-menu");
        const overlay = document.getElementById("menu-overlay");
        if (menu) {
            menu.classList.toggle("open");
            if(menu.classList.contains("open")) {
                overlay.classList.add("active");
            } else {
                overlay.classList.remove("active");
            }
        }
      }
    }
  </script>
`;

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'uploads') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.html') && !f.includes('admin.html')) {
        callback(dirPath);
      }
    }
  });
}

walkDir(__dirname, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('class="hamburger"') && !content.includes('id="mobile-menu"')) {
    content = content.replace('</header>', '</header>\n' + menuHTML);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
});
console.log('Done fixing menus');
