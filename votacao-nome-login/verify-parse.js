const { parseFuncionarioCsv } = require('/app/helpers/voting-csv-import')

const sample = [
  'Silvio Augusto Portellinha de Castro\t(14) 99761-5595',
  'Ademir Bardela\t(14)99705-1929',
  'Wagner Luis Souza (14) 3406-1625',
  'Maria Silva;(14) 99999-9999',
].join('\n')

const r = parseFuncionarioCsv(sample)
console.log(JSON.stringify({
  mode: r.mode,
  rows: r.rows.length,
  errors: r.errors,
  first: r.rows[0] && { nome: r.rows[0].nome, whatsapp: r.rows[0].whatsapp },
  all: r.rows.map((x) => ({ nome: x.nome, tel: x.whatsapp })),
}, null, 2))
