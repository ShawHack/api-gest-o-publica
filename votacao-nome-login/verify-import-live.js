const mongoose = require('mongoose')
const VotingServidor = require('/app/models/VotingServidor')
const { importVotersFromCsv, parseFuncionarioCsv } = require('/app/helpers/voting-csv-import')

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DB_URI ||
    process.env.DATABASE_URL
  if (!uri) {
    console.log('NO_URI', Object.keys(process.env).filter((k) => /MONGO|DB|DATABASE/i.test(k)))
    process.exit(2)
  }
  await mongoose.connect(uri)

  const sample = [
    'Nome;Telefone',
    'Teste Importacao Alpha;(14) 99999-0001',
    'Teste Importacao Beta\t(14) 99999-0002',
    'Teste Importacao Gamma (14) 99999-0003',
  ].join('\n')

  const parsed = parseFuncionarioCsv(sample)
  console.log('parsed', parsed.mode, parsed.rows.length)

  const t0 = Date.now()
  const result = await importVotersFromCsv(VotingServidor, { content: sample, replace: false })
  console.log('import_ms', Date.now() - t0)
  console.log(JSON.stringify(result, null, 2))

  const del = await VotingServidor.deleteMany({ nome: { $in: parsed.rows.map((r) => r.nome) } })
  console.log('cleaned', del.deletedCount)
  await mongoose.disconnect()
}

main().catch(async (e) => {
  console.error('FAIL', e.message)
  try { await mongoose.disconnect() } catch (_) {}
  process.exit(1)
})
