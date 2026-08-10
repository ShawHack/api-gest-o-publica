const { recordAudit } = require('./audit-log')
const VotingPleitoMembership = require('../models/VotingPleitoMembership')

const VOTING_GLOBAL_ADMIN_ROLES = ['admin', 'admin-votacao']
const VOTING_AUDITOR_ROLE = 'votacao_auditor'

function userIdOf(user) {
  return user?._id || user?.id
}

function isVotingGlobalAdmin(user) {
  return VOTING_GLOBAL_ADMIN_ROLES.includes(user?.role)
}

function isVotingAuditorRole(user) {
  return user?.role === VOTING_AUDITOR_ROLE
}

function deny(req, res, message, meta = {}) {
  recordAudit(req, {
    action: 'authz.voting_denied',
    resourceType: 'authorization',
    status: 'denied',
    module: 'votacao',
    eventType: 'SECURITY',
    metadata: {
      method: req.method,
      path: req.originalUrl || req.path,
      role: req.user?.role,
      ...meta,
    },
  })
  return res.status(403).json({ message })
}

/** Qualquer pessoa autorizada a entrar no módulo admin de votação. */
async function requireVotingStaff(req, res, next) {
  try {
    if (!req.user) return deny(req, res, 'Usuário não autenticado.')
    if (isVotingGlobalAdmin(req.user)) return next()

    const uid = userIdOf(req.user)
    if (isVotingAuditorRole(req.user)) {
      const active = await VotingPleitoMembership.exists({
        userId: uid,
        status: 'active',
        role: 'auditor',
      })
      if (active) {
        req.votingAccess = { scope: 'auditor', global: false }
        return next()
      }
      return deny(req, res, 'Auditor sem vínculo ativo a nenhum pleito.', {
        reason: 'no_active_membership',
      })
    }

    // Usuário com membership ativo mas role legado diferente
    const active = await VotingPleitoMembership.exists({
      userId: uid,
      status: 'active',
    })
    if (active) {
      req.votingAccess = { scope: 'auditor', global: false }
      return next()
    }

    return deny(req, res, 'Sem permissão para o módulo de votação.', {
      reason: 'not_voting_staff',
    })
  } catch (e) {
    console.error('[voting-authz.requireVotingStaff]', e)
    return res.status(500).json({ message: 'Erro de autorização.' })
  }
}

/** Apenas gestores globais SEMIT (escrita / administração). */
function requireVotingWrite(req, res, next) {
  if (!req.user) return deny(req, res, 'Usuário não autenticado.')
  if (isVotingGlobalAdmin(req.user)) {
    req.votingAccess = { scope: 'global_admin', global: true, canWrite: true }
    return next()
  }
  return deny(req, res, 'Ação restrita a administradores da votação (SEMIT).', {
    reason: 'write_requires_global_admin',
  })
}

async function loadActiveMembership(userId, votationId) {
  return VotingPleitoMembership.findOne({
    userId,
    votationId,
    status: 'active',
  }).lean()
}

/**
 * Leitura no contexto do pleito (:id).
 * Global admin: ok. Auditor: só com membership active neste pleito.
 */
async function requireVotingPleitoRead(req, res, next) {
  try {
    if (!req.user) return deny(req, res, 'Usuário não autenticado.')
    const votationId = req.params.id
    if (!votationId) return deny(req, res, 'Pleito não informado.', { reason: 'missing_pleito' })

    if (isVotingGlobalAdmin(req.user)) {
      req.votingAccess = {
        scope: 'global_admin',
        global: true,
        canWrite: true,
        votationId,
      }
      return next()
    }

    const membership = await loadActiveMembership(userIdOf(req.user), votationId)
    if (!membership) {
      return deny(req, res, 'Sem autorização para este pleito.', {
        reason: 'pleito_out_of_scope',
        votationId,
      })
    }

    req.votingAccess = {
      scope: membership.role,
      global: false,
      canWrite: false,
      votationId,
      membershipId: membership._id,
    }

    // Marca último acesso (não bloqueia a resposta)
    void VotingPleitoMembership.updateOne(
      { _id: membership._id },
      { $set: { lastAccessAt: new Date() } },
    )

    return next()
  } catch (e) {
    console.error('[voting-authz.requireVotingPleitoRead]', e)
    return res.status(500).json({ message: 'Erro de autorização.' })
  }
}

/**
 * Escrita no contexto do pleito — somente admin global.
 * (Gestor por pleito pode ser adicionado depois sem mudar o contrato do auditor.)
 */
function requireVotingPleitoWrite(req, res, next) {
  return requireVotingWrite(req, res, () => {
    req.votingAccess = {
      ...(req.votingAccess || {}),
      votationId: req.params.id,
      canWrite: true,
    }
    return next()
  })
}

module.exports = {
  VOTING_GLOBAL_ADMIN_ROLES,
  VOTING_AUDITOR_ROLE,
  isVotingGlobalAdmin,
  isVotingAuditorRole,
  requireVotingStaff,
  requireVotingWrite,
  requireVotingPleitoRead,
  requireVotingPleitoWrite,
  loadActiveMembership,
}
