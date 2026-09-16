const p = require('/app/helpers/voting-csv-import')
const sample = [
  'Silvio Augusto Portellinha de Castro\t(14) 99761-5595',
  'Ademir Bardela\t(14)99705-1929',
  'Ulisses de Leo Tedde\t(14) 99784-3723',
].join('\n')
const r = p.parseFuncionarioCsv(sample)
console.log(JSON.stringify({
  mode: r.mode,
  rows: r.rows.length,
  errors: r.errors,
  first: r.rows[0] && { nome: r.rows[0].nome, whatsapp: r.rows[0].whatsapp },
  second: r.rows[1] && { nome: r.rows[1].nome, whatsapp: r.rows[1].whatsapp },
}, null, 2))
