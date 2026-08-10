const jwt = require('jsonwebtoken')
const getToken = require('./get-token')
const User = require('../models/User')
const { loadCulturaContext } = require('./cultura-service')

async function optionalCulturaAuth(req, _res, next) {
  req.culturaContext = { isGlobalAdmin: false, isCulturaAdmin: false, assignments: [] }
  try {
    const token = getToken(req)
    if (!token) return next()
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (user) {
      req.user = user
      req.culturaContext = await loadCulturaContext(user)
    }
  } catch (_) {}
  return next()
}

module.exports = { optionalCulturaAuth }
