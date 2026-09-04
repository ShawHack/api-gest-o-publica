const fs = require('fs');
const path = require('path');

const baseDir = '/home/semit/Documentos/api-semit/cultura-src';

function scanAndInject(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') scanAndInject(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Limpar chamadas antigas se houver
      content = content.replace(/<script[^>]*src="[^"]*acessibilidade\.js"[^>]*><\/script>/gi, '');
      
      const scriptTag = '  <script src="/cultura/acessibilidade.js" defer></script>\n';
      if (/<\/body>/i.test(content)) {
        content = content.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else {
        content += `\n${scriptTag}`;
      }
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Acessibilidade injetada em: ${fullPath}`);
    }
  }
}

scanAndInject(baseDir);
console.log('Injeção concluída!');
