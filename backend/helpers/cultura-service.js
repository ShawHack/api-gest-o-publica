const CulturaUserAssignment = require('../models/CulturaUserAssignment')

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

function isGlobalAdmin(user) {
  return user?.role === 'admin' || !!user?.isAdmin
}

async function loadCulturaContext(user) {
  if (!user) {
    return { isGlobalAdmin: false, isCulturaAdmin: false, assignments: [] }
  }
  if (isGlobalAdmin(user)) {
    return { isGlobalAdmin: true, isCulturaAdmin: true, assignments: [] }
  }
  const assignments = await CulturaUserAssignment.find({
    userId: user.id || user._id,
    isActive: true,
  }).lean()
  const isCulturaAdmin = assignments.some((a) => a.role === 'admin_cultura')
  return { isGlobalAdmin: false, isCulturaAdmin, assignments }
}

function isCulturaStaff(context) {
  return context.isGlobalAdmin || context.isCulturaAdmin
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

function unauthorized(res, message = 'Usuário não autenticado.') {
  return res.status(401).json({ success: false, message, error: message })
}

function getCulturaImagePaths(req) {
  const paths = []
  const pushFile = (file) => {
    if (file?.filename) paths.push(`/images/cultura/${file.filename}`)
  }
  if (req.file) pushFile(req.file)
  if (Array.isArray(req.files)) {
    req.files.forEach(pushFile)
  } else if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      if (Array.isArray(req.files[key])) req.files[key].forEach(pushFile)
    }
  }
  return paths
}

module.exports = {
  parseBoolean,
  parsePagination,
  isGlobalAdmin,
  loadCulturaContext,
  isCulturaStaff,
  paginatedResponse,
  ok,
  err,
  unauthorized,
  getCulturaImagePaths,
}
