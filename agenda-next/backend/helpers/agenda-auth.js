const AgendaUserAssignment = require('../models/AgendaUserAssignment')
const AgendaResource = require('../models/AgendaResource')
const { recordSecurity } = require('./audit-service')

async function attachAgendaContext(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id
    const userEmail = req.user?.email ? String(req.user.email).trim().toLowerCase() : ''
    
    // 1. Assignments explícitos na tabela AgendaUserAssignment
    let assignments = userId
      ? await AgendaUserAssignment.find({ userId, active: true }).select('unitId role').lean()
      : []

    // 2. Se o usuário for um atendente cadastrado em AgendaResource
    if (userId || userEmail) {
      const resourceFilters = []
      if (userId) resourceFilters.push({ userId, active: true })
      if (userEmail) resourceFilters.push({ email: new RegExp(`^${userEmail}$`, 'i'), active: true })

      const resources = await AgendaResource.find({ $or: resourceFilters }).select('unitId').lean()
      const existingUnitIds = new Set(assignments.map((a) => String(a.unitId?._id || a.unitId)))

      for (const r of resources) {
        if (r.unitId && !existingUnitIds.has(String(r.unitId))) {
          assignments.push({
            unitId: r.unitId,
            role: 'agenda_attendant',
          })
          existingUnitIds.add(String(r.unitId))
        }
      }
    }

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

function requireAgendaManager(req, res, next) {
  if (req.agenda?.isGlobalAdmin) return next()
  if (req.agenda?.assignments?.some((assignment) => ['agenda_admin', 'agenda_manager'].includes(assignment.role))) return next()
  return deny(req, res, ['agenda_admin', 'agenda_manager'])
}

function requireAgendaOperator(req, res, next) {
  if (req.agenda?.isGlobalAdmin) return next()
  if (req.agenda?.assignments?.some((assignment) => ['agenda_admin', 'agenda_manager', 'agenda_attendant'].includes(assignment.role))) return next()
  return deny(req, res, ['agenda_admin', 'agenda_manager', 'agenda_attendant'])
}

module.exports = {
  attachAgendaContext,
  requireGlobalAgendaAdmin,
  requireAgendaAdmin,
  requireAgendaManager,
  requireAgendaOperator,
}
