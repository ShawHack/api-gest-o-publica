const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const VotingRefreshToken = require('../models/VotingRefreshToken')

const JWT_SECRET = process.env.JWT_SECRET
const ACCESS_TTL = process.env.VOTACAO_ACCESS_TTL || '15m'
const REFRESH_TTL_DAYS = parseInt(process.env.VOTACAO_REFRESH_DAYS || '7', 10)

function hashRefresh(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex')
}

function signAccess(servidorId, context = {}) {
  return jwt.sign({ scope: 'votacao', sid: String(servidorId), ...context }, JWT_SECRET, { expiresIn: ACCESS_TTL })
}

async function issueVotingSession(servidorId, nome = '', context = {}) {
  const accessToken = signAccess(servidorId, context)
  const rawRefresh = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashRefresh(rawRefresh)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000)
  await VotingRefreshToken.create({ servidorId, tokenHash, expiresAt, votationId: context.votationId, electorateType: context.electorateType || 'legacy_servidores' })
  return {
    accessToken,
    refreshToken: rawRefresh,
    expiresIn: ACCESS_TTL,
    nome: nome || '',
  }
}

module.exports = {
  hashRefresh,
  signAccess,
  issueVotingSession,
}
