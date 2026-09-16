const fs = require('fs')
const path = '/home/semit/Documentos/api-gestao-publica/MAPA_DO_TESOURO.md'
const text = fs.readFileSync(path, 'utf8')
const final = fs.readFileSync('/tmp/phase3-errors/phase3-final.md', 'utf8').trimEnd()
const start = text.indexOf('### Etapa 3 — tratamento nativo')
if (start < 0) throw new Error('Etapa 3 ausente')
const end = text.indexOf('\n### ', start + 4)
if (end < 0) throw new Error('Próxima seção ausente')
let updated = text.slice(0, start) + final + '\n' + text.slice(end)
updated = updated.replace(
  '**Próxima etapa:** integrar tratamento nativo em Educação e Documentos e revisar seus códigos HTTP, com plano próprio aqui no mapa.',
  '**Etapa seguinte concluída:** Educação e Documentos receberam tratamento nativo e revisão dos códigos HTTP na etapa 3 deste mapa.'
)
updated = updated.replace(
  '- **Pendências por módulo:** error boundaries e telas de rotas internas inválidas de SAMA, Agenda, Educação, Documentos e demais SPAs;',
  '- **Situação por módulo:** SAMA e Agenda foram cobertos na etapa 2; Educação e Documentos, na etapa 3. Permanecem para revisão gradual os demais SPAs;'
)
fs.writeFileSync(path, updated)
