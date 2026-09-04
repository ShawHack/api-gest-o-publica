const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

const targets = {
  '/index.html': 'index.html',
  '/emca/emca.html': 'emca/emca.html',
  '/biblioteca/biblioteca.html': 'biblioteca/biblioteca.html',
  '/teatro/teatro.html': 'teatro/teatro.html',
  '/museu/museu.html': 'museu/museu.html',
  '/eventos/eventos.html': 'eventos/eventos.html',
  '/mapa.html': 'mapa.html',
  '/login.html': 'login.html',
  '/cadastro.html': 'cadastro.html',
  '/emca/cursos/danca.html': 'emca/cursos/danca.html',
  '/emca/cursos/teatro.html': 'emca/cursos/teatro.html',
  '/emca/cursos/musica.html': 'emca/cursos/musica.html',
  '/emca/cursos/circo.html': 'emca/cursos/circo.html',
  '/emca/cursos/desenho.html': 'emca/cursos/desenho.html'
};

function getRelativeUrl(fromPath, toPath) {
  let rel = path.relative(path.dirname(fromPath), toPath).replace(/\\/g, '/');
  if (!rel.startsWith('.') && !rel.startsWith('/')) {
    rel = './' + rel;
  }
  return rel;
}

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

walkDir(rootDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace each known absolute href with the correctly calculated relative one.
  Object.keys(targets).forEach(absPath => {
    const targetFilePath = path.join(rootDir, targets[absPath]);
    const relUrl = getRelativeUrl(filePath, targetFilePath);
    
    // We need to match href="/absPath" and also href="/absPath#fragment"
    // We use a regex to capture an optional hash
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`href="${escapeRegex(absPath)}(#[\\w-]+)?"`, 'g');
    
    content = content.replace(regex, (match, hash) => {
      return `href="${relUrl}${hash ? hash : ''}"`;
    });
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed absolute links to relative in:', filePath);
  }
});
console.log('Finished fixing navigation links to work with file:/// protocol globally.');
