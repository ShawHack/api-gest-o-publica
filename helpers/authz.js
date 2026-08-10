
const requireRole = (...roles) => (req,res,next)=>{
  if(!req.user || !roles.includes(req.user.role)){
    return res.status(403).json({message:'Sem permissão'})
  }
  next()
}

const requireSelfOrAdmin = (paramKey='id') => (req,res,next)=>{
  const isSelf = String(req.user?.id) === String(req.params[paramKey])
  if(isSelf || req.user?.role === 'admin') return next()
  return res.status(403).json({message:'Somente o próprio usuário ou admin'})
}

const canEditSepultado = (user, sep) => {
  if(!user) return false
  if(user.role === 'admin') return true
  if(user.role === 'concessionario'){
    const ids = (sep.concessionarios || []).map(String)
    return ids.includes(String(user.id))
  }
  return false
}

module.exports = { requireRole, requireSelfOrAdmin, canEditSepultado }
