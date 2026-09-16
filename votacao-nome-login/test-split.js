const { parseFuncionarioCsv, splitNomeTelefone } = require('/app/helpers/voting-csv-import')

const samples = [
  'Ademir Bardela\t(14)99705-1929',
  'Adhemar Kemp Marcondes de Moura\t(14) 99676-1905',
  'Silvio Augusto Portellinha de Castro\t(14) 99761-5595',
  'Maria Silva;(14) 99999-9999',
  'Joao Souza 14988887777',
]

console.log('splits:')
for (const s of samples) {
  const [n, p] = splitNomeTelefone(s)
  console.log(JSON.stringify({ in: s, nome: n, tel: p, digits: String(p).replace(/\D/g, '') }))
}

const csv = samples.join('\n')
const r = parseFuncionarioCsv(csv)
console.log('parse:', JSON.stringify({
  mode: r.mode,
  rows: r.rows.length,
  errors: r.errors,
  first: r.rows[0],
}, null, 2))
