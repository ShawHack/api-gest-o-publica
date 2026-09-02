// helpers/verify-token.js
const jwt = require('jsonwebtoken')
const getToken = require('./get-token')
const User = require('../models/User')
const { verifyApiKey } = require('./verify-api-key')
const { recordSecurity } = require('./audit-service')

// Garante que a variável esteja definida no ambiente
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  const msg = 'JWT_SECRET não está definido. Configure JWT_SECRET no arquivo .env do backend.'
  if (process.env.NODE_ENV === 'test') {
    throw new Error(msg)
  }
  console.error(`❌ ERRO: ${msg}`)
  process.exit(1)
}

const verifyToken = async (req, res, next) => {
  try {
    // 1) Aceitar API Key (X-API-Key) como alternativa ao JWT
    const apiKeyUser = await verifyApiKey(req)
    if (apiKeyUser) {
      req.user = apiKeyUser
      return next()
    }

    // 2) Fallback: JWT Bearer
    const authHeader = req.headers.authorization

    if (!authHeader) {
      void recordSecurity(req, {
        action: 'auth.token_missing',
        resourceType: 'authorization',
        module: 'auth',
        metadata: { reason: 'no_authorization_header' },
      })
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
        error: 'Usuário não autenticado.',
      })
    }

    const token = getToken(req)
    if (!token) {
      void recordSecurity(req, {
        action: 'auth.token_missing',
        resourceType: 'authorization',
        module: 'auth',
        metadata: { reason: 'empty_bearer' },
      })
      return res.status(401).json({ message: 'Acesso Negado!' })
    }

    // Verifica o token com o segredo correto
    const decoded = jwt.verify(token, JWT_SECRET)

    const userId = String(decoded.id || decoded._id || '')
    if (!userId) {
      void recordSecurity(req, {
        action: 'auth.token_invalid',
        resourceType: 'authorization',
        module: 'auth',
        metadata: { reason: 'missing_subject' },
      })
      return res.status(401).json({ message: 'Token inválido!' })
    }

    const userDoc = await User.findById(userId).select('_id name email role isSamaMember isAdmin')
    if (!userDoc) {
      void recordSecurity(req, {
        action: 'auth.session_invalid',
        resourceType: 'user',
        resourceId: userId,
        module: 'auth',
        metadata: { reason: 'user_not_found' },
      })
      return res.status(401).json({ message: 'Usuário não encontrado / sessão inválida.' })
    }

    req.user = {
      _id: userDoc._id.toString(),
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: (userDoc.role || 'usuario').toString(),
      isSamaMember: !!userDoc.isSamaMember,
      isAdmin: !!userDoc.isAdmin,
    }

    return next()

  } catch (err) {
    const expired = err?.name === 'TokenExpiredError'
    void recordSecurity(req, {
      action: expired ? 'auth.token_expired' : 'auth.token_invalid',
      resourceType: 'authorization',
      module: 'auth',
      metadata: { reason: err?.name || 'verify_failed' },
    })
    const status = expired ? 401 : 400
    const message = expired
      ? 'Usuário não autenticado.'
      : 'Token inválido!'
    return res.status(status).json({
      success: false,
      message,
      error: message,
    })
  }
}

module.exports = verifyToken
