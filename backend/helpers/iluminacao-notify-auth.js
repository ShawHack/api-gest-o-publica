/**
 * Auth para endpoints de notificação da Iluminação.
 * Aceita: JWT (via verifyToken), X-API-Key, ou ILUMINACAO_NOTIFY_SECRET.
 */
const verifyToken = require('./verify-token')

function extractNotifySecret(req) {
  return String(
    req.headers['x-iluminacao-notify-key'] ||
      req.headers['x-notify-key'] ||
      req.body?.notifyKey ||
      '',
  ).trim()
}

function verifyNotifySecret(req) {
  const expected = String(process.env.ILUMINACAO_NOTIFY_SECRET || '').trim()
  if (!expected) return false
  return extractNotifySecret(req) === expected
}

/**
 * Middleware: JWT/API-Key (verifyToken) OU segredo de notificação do app cidadão.
 */
function verifyIluminacaoNotifyAccess(req, res, next) {
  if (verifyNotifySecret(req)) {
    req.user = {
      id: 'iluminacao-notify',
      _id: 'iluminacao-notify',
      role: 'iluminacao_admin',
      name: 'Iluminacao Notify',
      authType: 'notify_secret',
    }
    return next()
  }
  return verifyToken(req, res, next)
}

module.exports = {
  verifyIluminacaoNotifyAccess,
  verifyNotifySecret,
}
