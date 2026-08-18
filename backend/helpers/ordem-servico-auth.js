function canAccessOrdemServico(user) {
  if (!user) return false
  if (user.isAdmin) return true
  const role = String(user.role || '').toLowerCase()
  return role === 'admin' || role === 'smsu'
}

function requireOrdemServicoAccess(req, res, next) {
  if (!canAccessOrdemServico(req.user)) {
    return res.status(403).json({
      message: 'Sem permissão para o Sistema de Ordem de Serviços.',
    })
  }
  return next()
}

module.exports = {
  canAccessOrdemServico,
  requireOrdemServicoAccess,
}
