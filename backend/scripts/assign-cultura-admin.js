#!/usr/bin/env node
/**
 * Vincula usuário existente como admin_cultura.
 *
 * Uso:
 *   node scripts/assign-cultura-admin.js --email cultura@garca.sp.gov.br
 */
require('dotenv').config()
const mongoose = require('mongoose')

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://mongo:27017/apicemiterio'

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1 || !process.argv[idx + 1]) return null
  return process.argv[idx + 1]
}

async function main() {
  const email = parseArg('email')
  if (!email) {
    console.error('Uso: node scripts/assign-cultura-admin.js --email usuario@exemplo.com')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const User = require('../models/User')
  const CulturaUserAssignment = require('../models/CulturaUserAssignment')

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`)
    process.exit(1)
  }

  const assignment = await CulturaUserAssignment.findOneAndUpdate(
    { userId: user._id, role: 'admin_cultura' },
    { $set: { isActive: true } },
    { upsert: true, new: true }
  )

  console.log(`[assign-cultura-admin] ${user.email} → admin_cultura (${assignment._id})`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[assign-cultura-admin] Falha:', err)
  process.exit(1)
})
