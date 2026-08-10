const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /href="(?:\.\.\/|\.\/)*index\.html"/g, replace: 'href="/index.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*emca\.html"/g, replace: 'href="/emca/emca.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*emca\.html(#[\w-]+)"/g, replace: 'href="/emca/emca.html$1"' },
  { regex: /href="(?:\.\.\/|\.\/)*biblioteca(?:\/biblioteca)?\.html"/g, replace: 'href="/biblioteca/biblioteca.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*teatro(?:\/teatro)?\.html"/g, replace: 'href="/teatro/teatro.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*museu(?:\/museu)?\.html"/g, replace: 'href="/museu/museu.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*eventos(?:\/eventos)?\.html"/g, replace: 'href="/eventos/eventos.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*mapa\.html"/g, replace: 'href="/mapa.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*login\.html"/g, replace: 'href="/login.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*cadastro\.html"/g, replace: 'href="/cadastro.html"' },
  
  // Cursos dropdown in EMCA
  { regex: /href="(?:\.\.\/|\.\/)*cursos\/danca\.html"/g, replace: 'href="/emca/cursos/danca.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*cursos\/teatro\.html"/g, replace: 'href="/emca/cursos/teatro.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*cursos\/musica\.html"/g, replace: 'href="/emca/cursos/musica.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*cursos\/circo\.html"/g, replace: 'href="/emca/cursos/circo.html"' },
  { regex: /href="(?:\.\.\/|\.\/)*cursos\/desenho\.html"/g, replace: 'href="/emca/cursos/desenho.html"' }
];

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
  let original = content;
  
  replacements.forEach(rule => {
    content = content.replace(rule.regex, rule.replace);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed nav links in:', filePath);
  }
});
console.log('Finished fixing navigation links globally.');
