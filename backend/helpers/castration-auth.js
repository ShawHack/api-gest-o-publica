/**
 * Permissões do módulo de castração — alinhado ao Garça Pet React (isSamaMember + role).
 */
function isCastrationStaffUser(user) {
  if (!user) return false
  if (user.role === 'sama') return true
  if (user.isSamaMember === true) return true
  return false
}

const requireCastrationStaff = (req, res, next) => {
  if (!isCastrationStaffUser(req.user)) {
    const { recordAudit } = require('./audit-log')
    void recordAudit(req, {
      action: 'authz.castration_staff_denied',
      resourceType: 'authorization',
      status: 'denied',
      module: 'sama',
      eventType: 'SECURITY',
      metadata: { method: req.method, path: req.originalUrl || req.path },
    })
    return res.status(403).json({ message: 'Sem permissão' })
  }
  next()
}

module.exports = { isCastrationStaffUser, requireCastrationStaff }
