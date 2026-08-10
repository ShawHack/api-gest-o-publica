const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const UserRefreshToken = require('../models/UserRefreshToken')

const ACCESS_TTL = process.env.MEMORIAL_ACCESS_TTL || '15m'
const REFRESH_TTL_DAYS = parseInt(process.env.MEMORIAL_REFRESH_DAYS || '7', 10)

function normalizeRole(r) {
  return String(r ?? 'usuario').trim().toLowerCase()
}

function hashRefresh(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex')
}

function signAccess(user) {
  return jwt.sign(
    { name: user.name, id: user._id, role: normalizeRole(user.role) },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  )
}

async function issueRefreshToken(userId) {
  const rawRefresh = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashRefresh(rawRefresh)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000)
  await UserRefreshToken.create({ userId, tokenHash, expiresAt })
  return rawRefresh
}

async function rotateRefreshToken(refreshToken) {
  if (!refreshToken || typeof refreshToken !== 'string') return null
  const tokenHash = hashRefresh(refreshToken)
  const row = await UserRefreshToken.findOne({ tokenHash })
  if (!row || row.expiresAt < new Date()) return null

  await UserRefreshToken.deleteOne({ _id: row._id })
  const rawNew = crypto.randomBytes(48).toString('hex')
  const newHash = hashRefresh(rawNew)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000)
  await UserRefreshToken.create({ userId: row.userId, tokenHash: newHash, expiresAt })

  const user = await User.findById(row.userId)
  if (!user) return null

  return {
    user,
    refreshToken: rawNew,
    accessToken: signAccess(user),
  }
}

async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return
  const tokenHash = hashRefresh(refreshToken)
  await UserRefreshToken.deleteOne({ tokenHash })
}

module.exports = {
  ACCESS_TTL,
  REFRESH_TTL_DAYS,
  signAccess,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  hashRefresh,
}
