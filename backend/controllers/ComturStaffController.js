const mongoose = require('mongoose')
const User = require('../models/User')
const { recordAudit } = require('../helpers/audit-service')
const {
  PUBLIC_USER_FIELDS,
  canAssignStaff,
  publicUser,
  staffListFilter,
  staffSearchFilter,
  validateStaffChange,
} = require('../helpers/comtur-staff')

module.exports = class ComturStaffController {
  static async list(req, res) {
    try {
      const assign = canAssignStaff(req.user)
      const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
      let filter = staffListFilter()
      if (query) {
        if (!assign) {
          return res.status(403).json({ error: 'Somente o administrador geral pode buscar contas para designar.' })
        }
        const parsed = staffSearchFilter(query)
        if (parsed.error) return res.status(422).json({ error: parsed.error })
        filter = parsed.filter
      }
      const data = await User.find(filter)
        .select(PUBLIC_USER_FIELDS)
        .sort({ name: 1 })
        .limit(50)
        .lean()
      return res.json({
        data: data.map(publicUser),
        canAssign: assign,
        searching: Boolean(query),
      })
    } catch (error) {
      console.error('[ComturStaff.list]', error)
      return res.status(500).json({ error: 'Erro ao listar a equipe do COMTUR.' })
    }
  }

  static async update(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(422).json({ error: 'ID inválido.' })
      }
      const target = await User.findById(req.params.id)
      const decision = validateStaffChange({
        actor: req.user,
        target,
        action: req.body?.action,
      })
      if (decision.error) return res.status(decision.status).json({ error: decision.error })

      const before = target.role
      target.role = decision.role
      await target.save()
      await recordAudit(req, {
        action: decision.role === 'admin_comtur' ? 'comtur.staff.grant' : 'comtur.staff.revoke',
        module: 'comtur',
        resourceType: 'user',
        resourceId: target._id,
        eventType: 'UPDATE',
        metadata: { before, after: target.role },
      })
      return res.json({
        data: publicUser(target),
        message: decision.role === 'admin_comtur'
          ? 'Conta designada para a gestão do COMTUR.'
          : 'Acesso de gestão do COMTUR removido.',
      })
    } catch (error) {
      console.error('[ComturStaff.update]', error)
      return res.status(500).json({ error: 'Erro ao atualizar o papel.' })
    }
  }
}
