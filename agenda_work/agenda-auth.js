const AgendaUserAssignment = require('../models/AgendaUserAssignment')
const { recordSecurity } = require('./audit-service')

async function attachAgendaContext(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id
    const assignments = userId
      ? await AgendaUserAssignment.find({ userId, active: true }).select('unitId role').lean()
      : []
    req.agenda = {
      isGlobalAdmin: req.user?.role === 'admin' || req.user?.isAdmin === true,
      assignments,
    }
    return next()
  } catch (error) {
    return res.status(500).json({ message: 'Não foi possível carregar as permissões da agenda.' })
  }
}

function deny(req, res, roles) {
  void recordSecurity(req, {
    action: 'agenda.authorization_denied',
    resourceType: 'agenda_authorization',
    module: 'agenda-garca',
    metadata: { requiredRoles: roles, path: req.originalUrl || req.path },
  })
  return res.status(403).json({ message: 'Sem permissão para administrar a agenda.' })
}

function requireGlobalAgendaAdmin(req, res, next) {
  if (req.agenda?.isGlobalAdmin) return next()
  return deny(req, res, ['admin'])
}

function requireAgendaAdmin(req, res, next) {
  if (req.agenda?.isGlobalAdmin) return next()
  if (req.agenda?.assignments?.some((assignment) => assignment.role === 'agenda_admin')) return next()
  return deny(req, res, ['agenda_admin'])
}

module.exports = { attachAgendaContext, requireGlobalAgendaAdmin, requireAgendaAdmin }
