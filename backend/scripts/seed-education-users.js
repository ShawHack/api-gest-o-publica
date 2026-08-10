#!/usr/bin/env node
/**
 * Cria usuários de demonstração para perfis globais do módulo Educação.
 *
 * IMPORTANTE: education_manager NÃO é global — cada unidade escolar recebe
 * seu gestor no ato do vínculo. Use assign-education-manager.js por escola.
 *
 * Uso:
 *   node scripts/seed-education-users.js
 *   node scripts/seed-education-users.js --reset
 *   node scripts/seed-education-users.js --manager-slug emef-joao-silva   # demo opcional
 */
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  'mongodb://mongo:27017/apicemiterio'

const DEFAULT_PASSWORD = process.env.EDUCATION_DEMO_PASSWORD || 'Educacao@2026'

const DEMO_USERS = [
  {
    email: 'educacao-admin@garca.sp.gov.br',
    name: 'Admin Educação (demo)',
    role: 'education_admin',
    entitySlug: null,
  },
  {
    email: 'educacao-secretaria@garca.sp.gov.br',
    name: 'Secretaria Educação (demo)',
    role: 'education_secretary',
    entitySlug: 'secretaria-educacao',
  },
  {
    email: 'educacao-conselho@garca.sp.gov.br',
    name: 'Conselho CME (demo)',
    role: 'education_council',
    entitySlug: 'cme',
  },
]

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1 || !process.argv[idx + 1]) return null
  return process.argv[idx + 1]
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

async function upsertUser(User, spec, passwordHash, reset) {
  const email = spec.email.toLowerCase().trim()
  let user = await User.findOne({ email })

  if (!user) {
    user = await User.create({
      name: spec.name,
      email,
      password: passwordHash,
      phone: '14999990000',
      role: 'usuario',
      emailVerified: true,
    })
    console.log(`  + Usuário criado: ${email}`)
    return user
  }

  if (reset) {
    user.password = passwordHash
    user.name = spec.name
    user.emailVerified = true
    await user.save()
    console.log(`  ~ Usuário atualizado: ${email}`)
  } else {
    console.log(`  = Usuário já existe: ${email}`)
  }

  return user
}

async function upsertAssignment(EducationUserAssignment, userId, role, educationEntityId) {
  const filter = {
    userId,
    role,
    educationEntityId: educationEntityId || null,
  }

  await EducationUserAssignment.findOneAndUpdate(
    filter,
    { $set: { isActive: true } },
    { upsert: true, new: true }
  )

  console.log(`    → vínculo ${role}${educationEntityId ? ` @ ${educationEntityId}` : ' (global)'}`)
}

async function resolveEntity(EducationEntity, entitySlug) {
  if (!entitySlug) return null
  const entity = await EducationEntity.findOne({ slug: entitySlug, isActive: true }).select('_id name slug type')
  if (!entity) {
    console.error(`  ! Entidade não encontrada: ${entitySlug}`)
    console.error('    Execute antes: node scripts/seed-education.js')
    return null
  }
  console.log(`    unidade: ${entity.name} (${entity.slug})`)
  return entity
}

async function main() {
  const reset = hasFlag('reset')
  const managerSlug = parseArg('manager-slug')

  await mongoose.connect(MONGODB_URI)
  const User = require('../models/User')
  const EducationEntity = require('../models/EducationEntity')
  const EducationUserAssignment = require('../models/EducationUserAssignment')
  const { validateEducationAssignment } = require('../helpers/education-service')

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  console.log('[seed-education-users] Perfis globais do módulo Educação\n')
  console.log('Nota: gestores são vinculados POR UNIDADE via assign-education-manager.js\n')

  for (const spec of DEMO_USERS) {
    console.log(`• ${spec.role}`)
    const entity = await resolveEntity(EducationEntity, spec.entitySlug)
    if (spec.entitySlug && !entity) continue

    const user = await upsertUser(User, spec, passwordHash, reset)
    await upsertAssignment(EducationUserAssignment, user._id, spec.role, entity?._id || null)
    console.log('')
  }

  if (managerSlug) {
    console.log('• education_manager (demo opcional)')
    const entity = await resolveEntity(EducationEntity, managerSlug)
    if (entity) {
      const validation = validateEducationAssignment({
        role: 'education_manager',
        educationEntityId: entity._id,
        entity,
      })
      if (!validation.valid) {
        console.error(`  ! ${validation.errors.join('; ')}`)
      } else {
        const managerSpec = {
          email: 'educacao-gestor@garca.sp.gov.br',
          name: `Gestor ${entity.name} (demo)`,
        }
        const user = await upsertUser(User, managerSpec, passwordHash, reset)
        await upsertAssignment(EducationUserAssignment, user._id, 'education_manager', entity._id)
        console.log('')
      }
    }
  } else {
    console.log('• education_manager — omitido (use --manager-slug <slug> ou assign-education-manager.js por escola)\n')
  }

  console.log('Credenciais (senha padrão para todos):', DEFAULT_PASSWORD)
  console.log('')
  for (const spec of DEMO_USERS) {
    console.log(`  ${spec.role.padEnd(22)} ${spec.email}`)
  }
  if (managerSlug) {
    console.log(`  ${'education_manager'.padEnd(22)} educacao-gestor@garca.sp.gov.br  →  ${managerSlug}`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[seed-education-users] Falha:', err)
  process.exit(1)
})
