const { requireRole } = require('./authz')

const ROTAS_ADMIN_ROLES = ['admin', 'rotas_admin']

const isRotasAdmin = (user) => ROTAS_ADMIN_ROLES.includes(user?.role)

const requireRotasAdmin = requireRole(...ROTAS_ADMIN_ROLES)

module.exports = { ROTAS_ADMIN_ROLES, isRotasAdmin, requireRotasAdmin }
