const fs = require('fs')
const candidate = '/home/semit/Documentos/api-semit/frontend/build/index.html'
const active = '/home/semit/Documentos/api-semit/backend/public/index.html'
let next = fs.readFileSync(candidate, 'utf8')
const current = fs.readFileSync(active, 'utf8')
const guard = current.match(/<script[^>]+memorial-guard\.js[^>]*><\/script>/)?.[0]
if (!guard) throw new Error('Guarda Memorial não encontrada no index ativo')
if (!next.includes('memorial-guard.js')) {
  const marker = next.match(/<script[^>]+\/static\/js\/main\.[^>]+><\/script>/)?.[0]
  if (!marker) throw new Error('Bundle principal não encontrado no candidato')
  next = next.replace(marker, `${guard}${marker}`)
  fs.writeFileSync(candidate, next)
}
if (!next.includes('main.0529ed84.js')) throw new Error('Hash inesperado do candidato')
