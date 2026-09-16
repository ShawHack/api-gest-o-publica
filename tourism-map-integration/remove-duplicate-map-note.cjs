const fs = require('fs')
const file = process.argv[2]
let text = fs.readFileSync(file, 'utf8')
const sentence = 'Foram implantadas a ficha estável `/turismo/local/{slug}` e a página `/turismo/mapa/`, com busca, categorias, marcadores e lista acessível. O botão “Ver mapa” do portal passou a usar a URL nova; durante a revisão, a página oferece acesso explícito ao legado.'
const duplicated = `${sentence} ${sentence}`
if (!text.includes(duplicated)) throw new Error('Trecho duplicado não encontrado')
text = text.replace(duplicated, sentence)
fs.writeFileSync(file, text)
