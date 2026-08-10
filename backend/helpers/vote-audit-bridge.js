/**
 * Ponte vote_audit_logs → AuditLog unificado (module: votacao).
 * Mantém escrita legada para compatibilidade e grava trilha corporativa.
 */
const VoteAuditLog = require('../models/VoteAuditLog')
const { recordAudit, recordSecurity, recordChange } = require('./audit-service')

const MODULE = 'votacao'

const LEGACY_VOTE_ACTIONS = new Set(['vote_cast', 'vote_duplicate_blocked'])

function votingActor(req) {
  const u = req?.votingUser
  if (!u) return undefined
  return {
    _id: u.sid || u._id,
    id: u.sid || u._id,
    name: u.nome || 'Servidor',
    role: 'votacao_servidor',
  }
}

function memorialActor(req) {
  const u = req?.user
  if (!u) return undefined
  return {
    _id: u._id || u.id,
    id: u._id || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  }
}

function unifiedAction(action) {
  return String(action).startsWith('votacao.') ? action : `votacao.${action}`
}

function legacyAction(action) {
  const a = String(action).replace(/^votacao\./, '')
  return LEGACY_VOTE_ACTIONS.has(a) ? a : null
}

async function writeLegacy({ votationId, userHash, action, detail, meta }) {
  const leg = legacyAction(action)
  if (!leg) return
  try {
    await VoteAuditLog.create({
      votationId: votationId || undefined,
      userHash: userHash || undefined,
      action: leg,
      detail: detail || '',
      meta: meta || {},
    })
  } catch (_e) {
    // trilha legada não deve bloquear operação
  }
}

async function recordVoteEvent(req, payload = {}) {
  const {
    votationId,
    userHash,
    action,
    detail = '',
    meta = {},
    resourceType = 'vote',
    resourceId,
    eventType,
    actor,
    status = 'success',
    before,
    after,
    fields,
  } = payload

  if (!action) return

  void writeLegacy({ votationId, userHash, action, detail, meta })

  const metadata = { ...meta }
  if (detail) metadata.detail = detail
  if (userHash) metadata.userHash = userHash

  const actorResolved = actor ?? votingActor(req) ?? memorialActor(req)
  const resourceIdResolved = resourceId || (votationId ? String(votationId) : undefined)
  const act = unifiedAction(action)

  if (before != null && after != null) {
    return recordChange(req, {
      action: act,
      module: MODULE,
      resourceType,
      resourceId: resourceIdResolved,
      before,
      after,
      fields,
      metadata,
      eventType: eventType || 'UPDATE',
      actor: actorResolved,
    })
  }

  if (status === 'denied') {
    return recordSecurity(req, {
      action: act,
      module: MODULE,
      resourceType,
      resourceId: resourceIdResolved,
      metadata,
      eventType: eventType || 'SECURITY',
      actor: actorResolved,
      status,
    })
  }

  return recordAudit(req, {
    action: act,
    module: MODULE,
    resourceType,
    resourceId: resourceIdResolved,
    metadata,
    eventType,
    actor: actorResolved,
    status,
  })
}

module.exports = {
  recordVoteEvent,
  votingActor,
  memorialActor,
  unifiedAction,
  legacyAction,
}
