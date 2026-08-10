#!/usr/bin/env node
/**
 * Vincula usuário existente como gestor (education_manager) de UMA unidade escolar.
 * Cada escola/creche/EMEI deve ter seu próprio vínculo — não há gestor global fixo.
 *
 * Uso:
 *   node scripts/assign-education-manager.js --email gestor@escola.sp.gov.br --entity-slug emef-joao-silva
 *   node scripts/assign-education-manager.js --email gestor@escola.sp.gov.br --entity-id 507f1f77bcf86cd799439011
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
  const entitySlug = parseArg('entity-slug')
  const entityId = parseArg('entity-id')

  if (!email || (!entitySlug && !entityId)) {
    console.error('Uso: node scripts/assign-education-manager.js --email usuario@exemplo.com --entity-slug slug-da-unidade')
    console.error('  ou: node scripts/assign-education-manager.js --email usuario@exemplo.com --entity-id <ObjectId>')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const User = require('../models/User')
  const EducationEntity = require('../models/EducationEntity')
  const EducationUserAssignment = require('../models/EducationUserAssignment')
  const { validateEducationAssignment } = require('../helpers/education-service')

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`)
    process.exit(1)
  }

  const entity = entityId
    ? await EducationEntity.findById(entityId)
    : await EducationEntity.findOne({ slug: entitySlug, isActive: true })

  if (!entity) {
    console.error(`Unidade não encontrada: ${entitySlug || entityId}`)
    process.exit(1)
  }

  const validation = validateEducationAssignment({
    role: 'education_manager',
    educationEntityId: entity._id,
    entity,
  })
  if (!validation.valid) {
    console.error(validation.errors.join('; '))
    process.exit(1)
  }

  const assignment = await EducationUserAssignment.findOneAndUpdate(
    { userId: user._id, role: 'education_manager', educationEntityId: entity._id },
    { $set: { isActive: true } },
    { upsert: true, new: true }
  )

  console.log(`[assign-education-manager] ${user.email} → education_manager @ ${entity.name} (${entity.slug})`)
  console.log(`  assignmentId: ${assignment._id}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[assign-education-manager] Falha:', err)
  process.exit(1)
})
