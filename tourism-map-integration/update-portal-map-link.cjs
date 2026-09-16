const fs = require('fs')
const file = process.argv[2]
let text = fs.readFileSync(file, 'utf8')
const from = '/mapaturistico/'
const to = '/turismo/mapa/'
const matches = text.split(from).length - 1
if (matches !== 1) throw new Error(`Esperada uma referência ao mapa legado; encontradas ${matches}`)
text = text.replace(from, to)
fs.writeFileSync(file, text)
console.log('Link do mapa atualizado:', from, '->', to)
