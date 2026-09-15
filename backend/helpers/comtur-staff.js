const { isComturAdmin, normalizeRole } = require('./comtur-roles')

const STAFF_ROLES = ['admin_comtur', 'admin-comtur']
const PUBLIC_USER_FIELDS = 'name email phone role createdAt'

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function canAssignStaff(user) {
  return normalizeRole(user?.role) === 'admin'
}

function publicUser(user) {
  if (!user) return null
  return {
    _id: String(user._id),
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'usuario',
  }
}

function staffListFilter() {
  return { role: { $in: STAFF_ROLES } }
}

function staffSearchFilter(q) {
  const query = String(q || '').trim().slice(0, 120)
  if (query.length < 3) {
    return { error: 'Informe ao menos 3 caracteres para localizar a conta.' }
  }
  const expression = new RegExp(escapeRegex(query), 'i')
  const $or = [{ name: expression }, { email: expression }]
  const digits = query.replace(/\D/g, '')
  if (digits.length >= 3) $or.push({ cpf: new RegExp(escapeRegex(digits)) })
  return { filter: { $or } }
}

function validateStaffChange({ actor, target, action }) {
  if (!canAssignStaff(actor)) {
    return { error: 'Somente o administrador geral pode designar a gestão do COMTUR.', status: 403 }
  }
  if (!target) {
    return { error: 'Usuário não encontrado.', status: 404 }
  }
  if (String(actor._id) === String(target._id)) {
    return { error: 'Você não pode alterar o próprio papel.', status: 400 }
  }
  if (normalizeRole(target.role) === 'admin') {
    return { error: 'Não é possível alterar o papel de outro administrador geral.', status: 409 }
  }

  const normalized = String(action || '').trim().toLowerCase()
  if (normalized === 'grant') {
    return { role: 'admin_comtur' }
  }
  if (normalized === 'revoke') {
    if (!STAFF_ROLES.includes(normalizeRole(target.role))) {
      return { error: 'Este usuário não é gestor do COMTUR.', status: 409 }
    }
    return { role: 'usuario' }
  }
  return { error: 'Ação inválida. Use grant ou revoke.', status: 422 }
}

module.exports = {
  STAFF_ROLES,
  PUBLIC_USER_FIELDS,
  canAssignStaff,
  publicUser,
  staffListFilter,
  staffSearchFilter,
  validateStaffChange,
  isComturAdmin,
}
