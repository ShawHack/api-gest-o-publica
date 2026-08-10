
const { recordAudit } = require('./audit-log')

const VOTING_ADMIN_ROLES = ['admin', 'admin-votacao']

const requireRole = (...roles) => (req,res,next)=>{
  if(!req.user || !roles.includes(req.user.role)){
    recordAudit(req, {
      action: 'authz.require_role_denied',
      resourceType: 'authorization',
      status: 'denied',
      module: 'auth',
      eventType: 'SECURITY',
      metadata: { requiredRoles: roles, method: req.method, path: req.originalUrl || req.path },
    })
    return res.status(403).json({message:'Sem permissão'})
  }
  next()
}

const requireSelfOrAdmin = (paramKey='id') => (req,res,next)=>{
  const isSelf = String(req.user?.id) === String(req.params[paramKey])
  if(isSelf || req.user?.role === 'admin') return next()
  recordAudit(req, {
    action: 'authz.require_self_or_admin_denied',
    resourceType: 'authorization',
    status: 'denied',
    module: 'auth',
    eventType: 'SECURITY',
    metadata: { paramKey, method: req.method, path: req.originalUrl || req.path },
  })
  return res.status(403).json({message:'Somente o próprio usuário ou admin'})
}

const canEditSepultado = (user, sep) => {
  if(!user) return false
  if(user.role === 'admin') return true
  if(user.role === 'concessionario'){
    const ids = (sep.concessionarios || []).map(String)
    return ids.includes(String(user.id))
  }
  return false
}

const requireVotingAdmin = requireRole(...VOTING_ADMIN_ROLES)

module.exports = { requireRole, requireVotingAdmin, requireSelfOrAdmin, canEditSepultado, VOTING_ADMIN_ROLES }

// Compat: voting-authz é a fonte de verdade do módulo votação (staff / auditor / write).
module.exports.votingAuthz = require('./voting-authz')
