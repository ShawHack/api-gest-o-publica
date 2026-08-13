/**
 * JWT exclusivo do módulo de votação: payload deve conter scope === 'votacao'.
 * Evita confundir com token de User (mesmo JWT_SECRET, payload diferente).
 */
const jwt = require('jsonwebtoken')
const getToken = require('./get-token')
const VotingServidor = require('../models/VotingServidor')
const VotingElector = require('../models/VotingElector')
const { recordVoteEvent } = require('./vote-audit-bridge')

const JWT_SECRET = process.env.JWT_SECRET

const verifyVotingJwt = async (req, res, next) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ message: 'Servidor sem JWT_SECRET configurado.' })
    }
    const authHeader = req.headers.authorization
    if (!authHeader) {
      void recordVoteEvent(req, {
        action: 'auth.invalid_token',
        resourceType: 'session',
        eventType: 'SECURITY',
        status: 'denied',
        meta: { reason: 'missing_authorization' },
      })
      return res.status(401).json({ message: 'Acesso negado. Faça login (CPF + matrícula).' })
    }
    const token = getToken(req)
    if (!token) {
      void recordVoteEvent(req, {
        action: 'auth.invalid_token',
        resourceType: 'session',
        eventType: 'SECURITY',
        status: 'denied',
        meta: { reason: 'missing_token' },
      })
      return res.status(401).json({ message: 'Token ausente.' })
    }
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.scope !== 'votacao' || !decoded.sid) {
      void recordVoteEvent(req, {
        action: 'auth.invalid_token',
        resourceType: 'session',
        eventType: 'SECURITY',
        status: 'denied',
        meta: { reason: 'wrong_scope' },
      })
      return res.status(401).json({ message: 'Token inválido para votação.' })
    }
    const isImported = decoded.electorateType === 'imported'
    const doc = isImported
      ? await VotingElector.findById(decoded.sid).select('_id identityHash name electorateBaseId')
      : await VotingServidor.findById(decoded.sid).select('_id matriculaHash nome')
    if (!doc) {
      void recordVoteEvent(req, {
        action: 'auth.invalid_token',
        resourceType: 'session',
        resourceId: decoded.sid,
        eventType: 'SECURITY',
        status: 'denied',
        meta: { reason: 'servidor_not_found' },
      })
      return res.status(401).json({ message: 'Sessão inválida.' })
    }
    req.votingUser = {
      _id: doc._id.toString(),
      sid: doc._id.toString(),
      userHash: doc.identityHash || doc.matriculaHash,
      nome: doc.name || doc.nome || '',
      votationId: decoded.votationId || '',
      electorateType: isImported ? 'imported' : 'legacy_servidores',
    }
    return next()
  } catch (err) {
    const status = err?.name === 'TokenExpiredError' ? 401 : 400
    void recordVoteEvent(req, {
      action: 'auth.invalid_token',
      resourceType: 'session',
      eventType: 'SECURITY',
      status: 'denied',
      meta: { reason: err?.name || 'verify_error' },
    })
    return res.status(status).json({
      message:
        err.name === 'TokenExpiredError'
          ? 'Sessão expirada. Faça login novamente.'
          : 'Token inválido!',
    })
  }
}

module.exports = verifyVotingJwt
