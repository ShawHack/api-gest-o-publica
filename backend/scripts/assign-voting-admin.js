#!/usr/bin/env node
/**
 * Atribui role admin-votacao a um usuário Memorial existente.
 *
 * Uso:
 *   node scripts/assign-voting-admin.js --email rh@garca.sp.gov.br
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://mongo:27017/apicemiterio?replicaSet=rs0'

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1 || !process.argv[idx + 1]) return null
  return process.argv[idx + 1]
}

async function main() {
  const email = parseArg('email')
  if (!email) {
    console.error('Uso: node scripts/assign-voting-admin.js --email usuario@exemplo.com')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const User = require('../models/User')

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`)
    process.exit(1)
  }

  user.role = 'admin-votacao'
  await user.save()

  console.log(`[assign-voting-admin] ${user.email} → admin-votacao`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[assign-voting-admin] Falha:', err)
  process.exit(1)
})
