const { requireRole } = require('./authz')

const ROTAS_ADMIN_ROLES = ['admin', 'rotas_admin']
const ROTAS_OPERATOR_ROLES = ['admin', 'rotas_admin', 'rotas_operador']

const isRotasAdmin = (user) => ROTAS_ADMIN_ROLES.includes(user?.role)

const requireRotasAdmin = requireRole(...ROTAS_ADMIN_ROLES)
const requireRotasOperator = requireRole(...ROTAS_OPERATOR_ROLES)

module.exports = {
  ROTAS_ADMIN_ROLES,
  ROTAS_OPERATOR_ROLES,
  isRotasAdmin,
  requireRotasAdmin,
  requireRotasOperator,
}
