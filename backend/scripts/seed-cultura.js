/**
 * Seed inicial do módulo Cultura (SECULT).
 *
 * Uso:
 *   cd backend && node scripts/seed-cultura.js
 */
require('dotenv').config()
const mongoose = require('mongoose')

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://mongo:27017/apicemiterio'

async function seed() {
  await mongoose.connect(MONGODB_URI)

  const CulturaCategory = require('../models/CulturaCategory')
  const { DEFAULT_CATEGORIES } = require('../helpers/cultura-constants')

  for (const cat of DEFAULT_CATEGORIES) {
    await CulturaCategory.updateOne(
      { nome: cat.nome },
      { $setOnInsert: { nome: cat.nome, cor: cat.cor, isActive: true } },
      { upsert: true }
    )
  }

  const count = await CulturaCategory.countDocuments()
  console.log(`[seed-cultura] Categorias ativas: ${count}`)
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('[seed-cultura] Falha:', err)
  process.exit(1)
})
