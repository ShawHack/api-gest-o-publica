const crypto = require('crypto')
const bcrypt = require('bcrypt')
const User = require('../models/User')
const Sepultado = require('../models/Sepultado')
const Pet = require('../models/Pet')
const AdoptionRequest = require('../models/AdoptionRequest')
const Denounce = require('../models/Denounce')
const Arvore = require('../models/Arvore')
const AuditLog = require('../models/AuditLog')
const UserRefreshToken = require('../models/UserRefreshToken')

function safeProfile(userDoc) {
  if (!userDoc) return null
  const u = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    userType: u.userType,
    instituteName: u.instituteName,
    cpf: u.cpf ? '***' : undefined,
    cpf_cnpj: u.cpf_cnpj ? '***' : undefined,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

async function collectSubjectData(userId) {
  const uid = String(userId)
  const user = await User.findById(uid).select('-password')
  if (!user) return null

  const [sepultados, pets, adoptions, denounces, arvores, auditAsActor] = await Promise.all([
    Sepultado.find({ 'user._id': user._id }).lean(),
    Pet.find({ user: user._id }).select('-__v').lean(),
    AdoptionRequest.find({ adopter: user._id }).lean(),
    Denounce.find({ user: user._id }).lean(),
    Arvore.find({ user: user._id }).lean(),
    AuditLog.find({ actorId: user._id }).sort('-createdAt').limit(500).lean(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    userId: uid,
    profile: safeProfile(user),
    sepultados,
    pets,
    adoptionRequests: adoptions,
    denounces,
    arvores,
    auditTrailAsActor: auditAsActor.map((row) => ({
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      status: row.status,
      createdAt: row.createdAt,
    })),
  }
}

async function eraseSubjectData(userId, { actorReq } = {}) {
  const user = await User.findById(userId)
  if (!user) return { ok: false, reason: 'not_found' }

  const anonEmail = `excluido+${user._id}@anon.semit.local`
  const randomPass = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)

  await Promise.all([
    UserRefreshToken.deleteMany({ userId: user._id }),
    Pet.deleteMany({ user: user._id }),
    AdoptionRequest.deleteMany({ adopter: user._id }),
    Denounce.deleteMany({ user: user._id }),
    Arvore.deleteMany({ user: user._id }),
    Sepultado.updateMany(
      { 'user._id': user._id },
      {
        $set: {
          'user.name': 'Titular removido (LGPD)',
          'user.phone': null,
          'user.image': null,
        },
      }
    ),
    AuditLog.updateMany(
      { actorId: user._id },
      { $set: { actorEmail: null, metadata: { lgpdRedacted: true } } }
    ),
  ])

  user.name = 'Titular removido (LGPD)'
  user.email = anonEmail
  user.phone = '00000000000'
  user.cpf = undefined
  user.cpf_cnpj = undefined
  user.image = undefined
  user.password = randomPass
  user.emailVerified = false
  user.emailVerifyToken = undefined
  user.emailVerifyExpires = undefined
  user.resetPasswordToken = undefined
  user.resetPasswordExpires = undefined
  await user.save()

  if (actorReq) {
    const { recordAudit } = require('./audit-log')
    await recordAudit(actorReq, {
      action: 'lgpd.subject_erase',
      resourceType: 'user',
      resourceId: String(user._id),
      metadata: { anonymizedEmail: anonEmail },
    })
  }

  return { ok: true, userId: String(user._id), anonymizedEmail: anonEmail }
}

module.exports = { collectSubjectData, eraseSubjectData, safeProfile }
