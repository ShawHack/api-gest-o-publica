#!/usr/bin/env node
/**
 * Vincula usuário existente como education_admin (acesso total ao módulo Educação).
 *
 * Uso:
 *   node scripts/assign-education-admin.js --email educacao@garca.sp.gov.br
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
    console.error('Uso: node scripts/assign-education-admin.js --email usuario@exemplo.com')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const User = require('../models/User')
  const EducationUserAssignment = require('../models/EducationUserAssignment')

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`)
    process.exit(1)
  }

  const assignment = await EducationUserAssignment.findOneAndUpdate(
    { userId: user._id, role: 'education_admin', educationEntityId: null },
    { $set: { isActive: true } },
    { upsert: true, new: true }
  )

  console.log(`[assign-education-admin] ${user.email} → education_admin (${assignment._id})`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[assign-education-admin] Falha:', err)
  process.exit(1)
})
