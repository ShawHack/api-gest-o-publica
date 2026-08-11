const jwt = require('jsonwebtoken')
const getToken = require('./get-token')
const RuralAccount = require('../models/RuralAccount')

module.exports = async function verifyRuralToken(req, res, next) {
  try {
    const decoded = jwt.verify(getToken(req), process.env.JWT_SECRET)
    if (decoded.scope !== 'rotas-rurais' || !decoded.id) throw new Error('invalid_scope')
    const account = await RuralAccount.findById(decoded.id)
    if (!account || account.status !== 'active') return res.status(401).json({ message: 'Acesso inválido.' })
    req.ruralAccount = account
    next()
  } catch (_) {
    return res.status(401).json({ message: 'Usuário não autenticado.' })
  }
}
