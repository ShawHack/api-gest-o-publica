const fs = require('fs')
const file = '/home/semit/Documentos/api-gestao-publica/MAPA_DO_TESOURO.md'
const marker = '## 1. Finalidade\n'
let text = fs.readFileSync(file, 'utf8')
const plan = fs.readFileSync('/tmp/tourism-map-integration/plan.md', 'utf8').trimEnd()
if (!text.includes('### Plano oficial — integração do Mapa Turístico')) {
  if (!text.includes(marker)) throw new Error('Cabeçalho do Mapa não encontrado')
  text = text.replace(marker, `${marker}\n${plan}\n`)
  fs.writeFileSync(file, text)
}
