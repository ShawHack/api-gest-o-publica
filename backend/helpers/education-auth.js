const { recordAudit } = require('./audit-log')
const {
  loadEducationContext,
  canAccessEntity,
  canManageModule,
  hasRole,
  isGlobalAdmin,
  unauthorized,
} = require('./education-service')
const { EDUCATION_ROLES } = require('./education-constants')

async function attachEducationContext(req, _res, next) {
  try {
    if (!req.user) {
      req.educationContext = { isGlobalAdmin: false, isEducationAdmin: false, assignments: [] }
      return next()
    }
    req.educationContext = await loadEducationContext(req.user)
    return next()
  } catch (error) {
    return next(error)
  }
}

function requireEducationStaff(req, res, next) {
  if (!req.user) {
    return unauthorized(res)
  }
  const ctx = req.educationContext || {}
  if (
    isGlobalAdmin(req.user) ||
    ctx.isEducationAdmin ||
    (ctx.assignments && ctx.assignments.length > 0)
  ) {
    return next()
  }
  void recordAudit(req, {
    action: 'education.authz.staff_denied',
    resourceType: 'authorization',
    status: 'denied',
    module: 'education',
    eventType: 'SECURITY',
  })
  return res.status(403).json({ message: 'Sem permissão' })
}

function requireEducationAdmin(req, res, next) {
  if (!req.user) {
    return unauthorized(res)
  }
  const ctx = req.educationContext || {}
  if (isGlobalAdmin(req.user) || ctx.isEducationAdmin) {
    return next()
  }
  void recordAudit(req, {
    action: 'education.authz.admin_denied',
    resourceType: 'authorization',
    status: 'denied',
    module: 'education',
    eventType: 'SECURITY',
  })
  return res.status(403).json({ message: 'Sem permissão' })
}

function requireEducationRoles(...roles) {
  const allowed = roles.length ? roles : EDUCATION_ROLES
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res)
    }
    const ctx = req.educationContext || {}
    if (isGlobalAdmin(req.user) || ctx.isEducationAdmin) {
      return next()
    }
    if (hasRole(ctx, ...allowed)) {
      return next()
    }
    void recordAudit(req, {
      action: 'education.authz.role_denied',
      resourceType: 'authorization',
      status: 'denied',
      module: 'education',
      eventType: 'SECURITY',
      metadata: { requiredRoles: allowed },
    })
    return res.status(403).json({ message: 'Sem permissão' })
  }
}

/**
 * Middleware que valida acesso à entidade informada no body ou params.
 * @param {object} options
 * @param {string} options.source - body | params
 * @param {string} options.field - nome do campo com entityId
 * @param {string} options.action - read | write | create | delete | approve
 */
function requireEntityAccess({ source = 'body', field = 'educationEntityId', action = 'write' } = {}) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res)
    }
    const ctx = req.educationContext || {}
    const entityId =
      source === 'params'
        ? req.params[field] || req.params.id
        : req.body?.[field] || req.params[field] || req.params.id

    if (canManageModule(ctx) && action !== 'delete') {
      return next()
    }

    if (!entityId && action === 'create' && canManageModule(ctx)) {
      return next()
    }

    if (!entityId) {
      return res.status(422).json({ message: 'Entidade educacional não informada' })
    }

    const entityType = req.body?.type || req.educationEntityType || null
    if (canAccessEntity(ctx, entityId, { action, entityType })) {
      return next()
    }

    void recordAudit(req, {
      action: 'education.authz.entity_denied',
      resourceType: 'education_entity',
      resourceId: String(entityId),
      status: 'denied',
      module: 'education',
      eventType: 'SECURITY',
      metadata: { action },
    })
    return res.status(403).json({ message: 'Sem permissão para esta unidade educacional' })
  }
}

module.exports = {
  attachEducationContext,
  requireEducationStaff,
  requireEducationAdmin,
  requireEducationRoles,
  requireEntityAccess,
  canAccessEntity,
  canManageModule,
}
