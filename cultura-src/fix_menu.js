const fs = require('fs');
const path = require('path');

const files = [
  'museu/museu.html',
  'teatro/teatro.html',
  'eventos/eventos.html',
  'eventos/detalhes.html',
  'eventos/garca-em-dancas.html',
  'eventos/viva-praca.html',
  'emca/galeriaemca.html',
  'painel_usuario.html',
  'perfil.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Insert overlay and action buttons
  const regexMenu = /<div class="mobile-menu" id="mobile-menu">([\s\S]*?)<\/div>/i;
  const match = content.match(regexMenu);
  if (match && !content.includes('menu-overlay')) {
    // Check if it's in a subdirectory to adjust paths
    const isRoot = file === 'painel_usuario.html' || file === 'perfil.html';
    const prefix = isRoot ? '' : '../';
    
    let newMenuInner = match[1].replace(/<\/div>$/i, '');
    newMenuInner += `
    <div class="mobile-menu-actions">
      <a href="${prefix}mapa.html" class="mobile-btn-mapa"><i data-lucide="map" style="width:18px;height:18px;"></i> Mapa Cultural</a>
      <a href="${prefix}login.html" class="mobile-btn-login"><i data-lucide="log-in" style="width:18px;height:18px;"></i> Login</a>
      <a href="${prefix}cadastro.html" class="mobile-btn-cadastro"><i data-lucide="user-plus" style="width:18px;height:18px;"></i> Cadastre-se</a>
    </div>
  </div>`;
    
    const replacement = `<!-- MOBILE MENU OVERLAY -->
  <div class="menu-overlay" id="menu-overlay" onclick="toggleMenu()"></div>

  <!-- MOBILE MENU -->
  <div class="mobile-menu" id="mobile-menu">${newMenuInner}`;
  
    content = content.replace(regexMenu, replacement);
  }

  // Replace toggleMenu function if it exists and doesn't handle overlay
  const regexToggle = /function toggleMenu\(\) {\s*const menu = document\.getElementById\("mobile-menu"\);\s*if \(menu\) menu\.classList\.toggle\("open"\);\s*}/g;
  content = content.replace(regexToggle, `function toggleMenu() {
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
    
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
