#!/usr/bin/env node
/**
 * Importa eleitores do CSV padrão (vota-func/Funcionario.csv).
 * Uso: node scripts/import-voting-voters.js [caminho.csv]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('../db/conn')
const VotingServidor = require('../models/VotingServidor')
const { importVotersFromCsv, DEFAULT_CSV } = require('../helpers/voting-csv-import')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI não configurado.')
  await mongoose.connect(uri)
  const filePath = process.argv[2] || DEFAULT_CSV
  console.log(`Importando eleitores de: ${filePath}`)
  const result = await importVotersFromCsv(VotingServidor, { filePath })
  console.log(JSON.stringify(result, null, 2))
  await mongoose.connection.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
