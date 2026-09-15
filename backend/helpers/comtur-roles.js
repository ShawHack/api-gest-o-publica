const COMTUR_ADMIN_ROLES = ['admin', 'admin_comtur', 'admin-comtur']

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

function isComturAdmin(user) {
  const role = normalizeRole(user?.role)
  return COMTUR_ADMIN_ROLES.includes(role) || role.replace(/-/g, '_') === 'admin_comtur'
}

module.exports = { COMTUR_ADMIN_ROLES, isComturAdmin, normalizeRole }
