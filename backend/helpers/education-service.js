const EducationUserAssignment = require('../models/EducationUserAssignment')
const { SCHOOL_UNIT_TYPES, EDUCATION_ROLES } = require('./education-constants')

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value
  return String(value).toLowerCase() === 'true'
}

function parsePagination(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || String(defaultLimit), 10)))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function uniqueSlug(Model, baseSlug, excludeId = null) {
  let slug = slugify(baseSlug)
  if (!slug) slug = 'item'
  let candidate = slug
  let counter = 1
  while (true) {
    const filter = { slug: candidate }
    if (excludeId) filter._id = { $ne: excludeId }
    const exists = await Model.findOne(filter).select('_id').lean()
    if (!exists) return candidate
    counter += 1
    candidate = `${slug}-${counter}`
  }
}

function isGlobalAdmin(user) {
  return user?.role === 'admin' || !!user?.isAdmin
}

async function loadEducationContext(user) {
  if (!user) {
    return { isGlobalAdmin: false, isEducationAdmin: false, assignments: [] }
  }
  if (isGlobalAdmin(user)) {
    return { isGlobalAdmin: true, isEducationAdmin: true, assignments: [] }
  }
  const assignments = await EducationUserAssignment.find({
    userId: user.id || user._id,
    isActive: true,
  }).lean()
  const isEducationAdmin = assignments.some((a) => a.role === 'education_admin')
  return { isGlobalAdmin: false, isEducationAdmin, assignments }
}

function getAssignedEntityIds(context) {
  return (context.assignments || [])
    .filter((a) => a.educationEntityId)
    .map((a) => String(a.educationEntityId))
}

function hasRole(context, ...roles) {
  if (context.isGlobalAdmin || context.isEducationAdmin) return true
  return (context.assignments || []).some((a) => roles.includes(a.role))
}

/**
 * Verifica acesso por entidade.
 * @param {object} context - contexto carregado por loadEducationContext
 * @param {string|null} entityId - ID da entidade alvo
 * @param {object} options
 * @param {string} options.action - read | write | approve | delete
 * @param {string} [options.entityType] - tipo da entidade (ex: conselho)
 */
function canAccessEntity(context, entityId, { action = 'read', entityType = null } = {}) {
  if (context.isGlobalAdmin || context.isEducationAdmin) return true

  const entityIdStr = entityId ? String(entityId) : null
  const assignments = context.assignments || []

  for (const assignment of assignments) {
    const assignedEntityId = assignment.educationEntityId
      ? String(assignment.educationEntityId)
      : null

    if (assignment.role === 'education_secretary') {
      if (action === 'read' || action === 'approve') return true
      if (entityIdStr && assignedEntityId === entityIdStr) return true
      if (!entityIdStr && action === 'write') return true
    }

    if (entityIdStr && assignedEntityId === entityIdStr) {
      if (assignment.role === 'education_manager') {
        return ['read', 'write', 'create', 'delete'].includes(action)
      }
      if (assignment.role === 'education_council') {
        if (entityType && entityType !== 'conselho') return false
        return ['read', 'write', 'create', 'delete'].includes(action)
      }
    }
  }

  return false
}

function canManageModule(context) {
  return (
    context.isGlobalAdmin ||
    context.isEducationAdmin ||
    hasRole(context, 'education_secretary')
  )
}

function canApproveEducationContent(context) {
  return (
    context.isGlobalAdmin ||
    context.isEducationAdmin ||
    hasRole(context, 'education_secretary', 'education_admin')
  )
}

function canManageLessonAssignments(context) {
  return canManageModule(context) || hasRole(context, 'education_manager')
}

function applyLegislationAdminScope(context, filter = {}) {
  if (context.isGlobalAdmin || context.isEducationAdmin) return filter
  if (hasRole(context, 'education_secretary')) return filter

  const ids = getAssignedEntityIds(context)
  if (!ids.length) {
    filter._id = { $in: [] }
    return filter
  }
  if (filter.educationEntityId) {
    const requested = String(filter.educationEntityId)
    if (!ids.map(String).includes(requested)) {
      filter._id = { $in: [] }
    }
    return filter
  }
  filter.educationEntityId = { $in: ids }
  return filter
}

function normalizeEntityIdRef(value) {
  if (!value) return null
  if (typeof value === 'object' && value._id) return String(value._id)
  return String(value)
}

function collectLessonAssignmentEntityIds({ teachers = [], vacancies = [] } = {}) {
  const ids = new Set()
  for (const teacher of teachers) {
    const entityId = normalizeEntityIdRef(teacher?.educationEntityId)
    if (entityId) ids.add(entityId)
  }
  for (const vacancy of vacancies) {
    const entityId = normalizeEntityIdRef(vacancy?.educationEntityId)
    if (entityId) ids.add(entityId)
  }
  return [...ids]
}

function applyLessonAssignmentAdminScope(context, filter = {}) {
  if (context.isGlobalAdmin || context.isEducationAdmin) return filter
  if (hasRole(context, 'education_secretary')) return filter

  const ids = getAssignedEntityIds(context)
  if (!ids.length) {
    filter._id = { $in: [] }
    return filter
  }

  const entityScope = {
    $or: [
      { 'vacancies.educationEntityId': { $in: ids } },
      { 'teachers.educationEntityId': { $in: ids } },
    ],
  }

  if (filter.$or) {
    filter.$and = [...(filter.$and || []), { $or: filter.$or }, entityScope]
    delete filter.$or
  } else {
    Object.assign(filter, entityScope)
  }
  return filter
}

function validateEducationAssignment({ role, educationEntityId, entity }) {
  const errors = []
  if (!EDUCATION_ROLES.includes(role)) {
    return { valid: false, errors: ['Perfil inválido'] }
  }

  if (role === 'education_admin' && educationEntityId) {
    errors.push('Administrador do módulo não deve ser vinculado a uma unidade específica')
  }

  if (role === 'education_manager') {
    if (!educationEntityId) {
      errors.push('Gestor deve ser vinculado a uma unidade escolar no momento da criação')
    } else if (!entity) {
      errors.push('Unidade escolar não encontrada')
    } else if (!SCHOOL_UNIT_TYPES.includes(entity.type)) {
      errors.push('Gestor só pode ser vinculado a unidades escolares (escola, creche, EMEI, etc.)')
    }
  }

  if (role === 'education_council') {
    if (!educationEntityId) {
      errors.push('Usuário de conselho deve ser vinculado a um conselho municipal')
    } else if (!entity) {
      errors.push('Conselho não encontrado')
    } else if (entity.type !== 'conselho') {
      errors.push('Perfil de conselho só pode ser vinculado a conselhos municipais')
    }
  }

  if (role === 'education_secretary' && educationEntityId && entity && entity.type !== 'secretaria') {
    errors.push('Secretaria deve ser vinculada à entidade Secretaria Municipal de Educação')
  }

  return { valid: errors.length === 0, errors }
}

function canAccessLessonAssignment(context, item, action = 'write') {
  if (context.isGlobalAdmin || context.isEducationAdmin) return true
  if (hasRole(context, 'education_secretary')) return true

  const entityIds = collectLessonAssignmentEntityIds(item)
  if (!entityIds.length) return false

  return entityIds.some((entityId) => canAccessEntity(context, entityId, { action }))
}

function buildEducationCapabilities(context) {
  const assignments = context.assignments || []
  const roles = assignments.map((a) => a.role)
  return {
    isGlobalAdmin: !!context.isGlobalAdmin,
    isEducationAdmin: !!context.isEducationAdmin,
    isSecretary: roles.includes('education_secretary'),
    isManager: roles.includes('education_manager'),
    isCouncil: roles.includes('education_council'),
    canManageAssignments: !!context.isGlobalAdmin || !!context.isEducationAdmin,
    canManageEntities: !!context.isGlobalAdmin || !!context.isEducationAdmin,
    canManageSchoolUnits: !!context.isGlobalAdmin || !!context.isEducationAdmin,
    canManagePartnerEntities: !!context.isGlobalAdmin || !!context.isEducationAdmin || roles.includes('education_secretary'),
    canManageGlobalLegislation: !!context.isGlobalAdmin || !!context.isEducationAdmin || roles.includes('education_secretary'),
    canApproveContent: canApproveEducationContent(context),
    canManageLessonAssignments: canManageLessonAssignments(context),
  }
}

function getFileUrlFromMulter(req, fieldName = 'file') {
  if (req.file?.filename) {
    const base = (req.baseUrl || '').includes('education') ? 'education' : 'misc'
    return `/images/${base}/${req.file.filename}`
  }
  if (Array.isArray(req.files)) {
    const file = req.files.find((f) => f.fieldname === fieldName) || req.files[0]
    if (file?.filename) return `/images/education/${file.filename}`
  }
  return null
}

function getSavedImagePaths(req) {
  const files = []
  if (req.file) files.push(req.file)
  if (Array.isArray(req.files)) {
    files.push(...req.files)
  } else if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      if (Array.isArray(req.files[key])) files.push(...req.files[key])
    }
  }
  return files
    .filter((f) => f?.filename)
    .map((f) => `/images/education/${f.filename}`)
}

async function uniquePostSlug(educationEntityId, baseSlug, excludeId = null) {
  let slug = slugify(baseSlug)
  if (!slug) slug = 'post'
  let candidate = slug
  const EducationPost = require('../models/EducationPost')
  let counter = 1
  while (true) {
    const filter = { educationEntityId, slug: candidate }
    if (excludeId) filter._id = { $ne: excludeId }
    const exists = await EducationPost.findOne(filter).select('_id').lean()
    if (!exists) return candidate
    counter += 1
    candidate = `${slug}-${counter}`
  }
}

function paginatedResponse(items, total, page, limit) {
  return {
    success: true,
    data: items,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  }
}

function ok(res, status, data = {}) {
  return res.status(status).json({ success: true, ...data })
}

function err(res, status, message, extra = {}) {
  return res.status(status).json({ success: false, error: message, message, ...extra })
}

function validationErr(res, errors, message = 'Erro de validação') {
  return res.status(422).json({
    success: false,
    message,
    error: message,
    errors,
  })
}

function unauthorized(res, message = 'Usuário não autenticado.') {
  return res.status(401).json({ success: false, message, error: message })
}

module.exports = {
  escapeRegex,
  parseBoolean,
  parsePagination,
  slugify,
  uniqueSlug,
  isGlobalAdmin,
  loadEducationContext,
  getAssignedEntityIds,
  hasRole,
  canAccessEntity,
  canManageModule,
  canApproveEducationContent,
  canManageLessonAssignments,
  applyLegislationAdminScope,
  applyLessonAssignmentAdminScope,
  canAccessLessonAssignment,
  collectLessonAssignmentEntityIds,
  validateEducationAssignment,
  buildEducationCapabilities,
  getFileUrlFromMulter,
  getSavedImagePaths,
  uniquePostSlug,
  paginatedResponse,
  ok,
  err,
  validationErr,
  unauthorized,
}
