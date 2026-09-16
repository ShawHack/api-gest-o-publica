const fs = require('fs')
const { execFileSync } = require('child_process')

const workFile = process.argv[2]
const outFile = process.argv[3]
const working = fs.readFileSync(workFile, 'utf8')
const match = working.match(/### Plano oficial — integração do Mapa Turístico ao Turismo Garça e Pontos QR \(15\/09\/2026\)[\s\S]*?(?=### Etapa 3 —)/)
if (!match) throw new Error('Plano de integração não encontrado')
const base = execFileSync('git', ['show', 'HEAD:MAPA_DO_TESOURO.md'], { encoding: 'utf8' })
const marker = '## 1. Finalidade\n'
if (!base.includes(marker)) throw new Error('Marcador da finalidade não encontrado no HEAD')
fs.writeFileSync(outFile, base.replace(marker, `${marker}\n${match[0]}`))
