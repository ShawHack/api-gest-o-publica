const fs = require('fs');
const path = '/home/semit/Documentos/api-gestao-publica/MAPA_DO_TESOURO.md';
const text = fs.readFileSync(path, 'utf8');
const plan = fs.readFileSync('/tmp/phase3-errors/phase3-plan.md', 'utf8');
if (!text.includes('### Etapa 3 — tratamento nativo')) {
  if (!text.includes('## 1. Finalidade\n')) throw new Error('Cabeçalho ausente');
  fs.writeFileSync(path, text.replace('## 1. Finalidade\n', '## 1. Finalidade\n\n' + plan));
}
