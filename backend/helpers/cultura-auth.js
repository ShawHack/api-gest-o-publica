const { recordAudit } = require('./audit-log')
const {
  loadCulturaContext,
  isGlobalAdmin,
  isCulturaStaff,
  unauthorized,
} = require('./cultura-service')

async function attachCulturaContext(req, _res, next) {
  try {
    if (!req.user) {
      req.culturaContext = { isGlobalAdmin: false, isCulturaAdmin: false, assignments: [] }
      return next()
    }
    req.culturaContext = await loadCulturaContext(req.user)
    return next()
  } catch (error) {
    return next(error)
  }
}

function requireCulturaStaff(req, res, next) {
  if (!req.user) return unauthorized(res)
  const ctx = req.culturaContext || {}
  if (isCulturaStaff(ctx)) return next()
  void recordAudit(req, {
    action: 'cultura.authz.staff_denied',
    resourceType: 'authorization',
    status: 'denied',
    module: 'cultura',
    eventType: 'SECURITY',
  })
  return res.status(403).json({ success: false, message: 'Sem permissão', error: 'Sem permissão' })
}

function requireCulturaAdmin(req, res, next) {
  if (!req.user) return unauthorized(res)
  const ctx = req.culturaContext || {}
  if (isGlobalAdmin(req.user) || ctx.isCulturaAdmin) return next()
  void recordAudit(req, {
    action: 'cultura.authz.admin_denied',
    resourceType: 'authorization',
    status: 'denied',
    module: 'cultura',
    eventType: 'SECURITY',
  })
  return res.status(403).json({ success: false, message: 'Sem permissão', error: 'Sem permissão' })
}

module.exports = {
  attachCulturaContext,
  requireCulturaStaff,
  requireCulturaAdmin,
}
