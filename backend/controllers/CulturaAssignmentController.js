const ObjectId = require('mongoose').Types.ObjectId

const CulturaUserAssignment = require('../models/CulturaUserAssignment')
const CulturaPost = require('../models/CulturaPost')
const CulturaCategory = require('../models/CulturaCategory')
const User = require('../models/User')
const { CULTURA_ROLES } = require('../helpers/cultura-constants')
const { recordAudit } = require('../helpers/audit-log')
const { parsePagination, paginatedResponse, ok, err } = require('../helpers/cultura-service')

module.exports = class CulturaAssignmentController {
  static async list(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query)
      const filter = { isActive: true }
      if (req.query.userId) filter.userId = req.query.userId

      const [items, total] = await Promise.all([
        CulturaUserAssignment.find(filter)
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CulturaUserAssignment.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[CulturaAssignmentController.list]', error)
      return err(res, 500, 'Erro ao listar vínculos')
    }
  }

  static async create(req, res) {
    try {
      const { userId, role } = req.body
      if (!userId || !role) return err(res, 422, 'Usuário e perfil são obrigatórios')
      if (!ObjectId.isValid(userId)) return err(res, 422, 'ID do usuário inválido')
      if (!CULTURA_ROLES.includes(role)) return err(res, 422, 'Perfil inválido')

      const user = await User.findById(userId).select('_id')
      if (!user) return err(res, 404, 'Usuário não encontrado')

      const assignment = await CulturaUserAssignment.create({
        userId,
        role,
        assignedBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'cultura.assignment.create',
        resourceType: 'cultura_user_assignment',
        resourceId: assignment._id,
        module: 'cultura',
        eventType: 'PERMISSION_CHANGE',
      })

      return ok(res, 201, { data: assignment })
    } catch (error) {
      if (error?.code === 11000) {
        return err(res, 409, 'Vínculo já existe para este usuário')
      }
      console.error('[CulturaAssignmentController.create]', error)
      return err(res, 500, 'Erro ao criar vínculo')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const assignment = await CulturaUserAssignment.findById(id)
      if (!assignment) return err(res, 404, 'Vínculo não encontrado')

      assignment.isActive = false
      await assignment.save()

      await recordAudit(req, {
        action: 'cultura.assignment.deactivate',
        resourceType: 'cultura_user_assignment',
        resourceId: id,
        module: 'cultura',
        eventType: 'PERMISSION_CHANGE',
      })

      return ok(res, 200, { message: 'Vínculo desativado' })
    } catch (error) {
      console.error('[CulturaAssignmentController.remove]', error)
      return err(res, 500, 'Erro ao remover vínculo')
    }
  }

  static async createByEmail(req, res) {
    try {
      const { email, role = 'admin_cultura' } = req.body
      if (!email) return err(res, 422, 'E-mail é obrigatório')
      if (!CULTURA_ROLES.includes(role)) return err(res, 422, 'Perfil inválido')

      const User = require('../models/User')
      const user = await User.findOne({ email: String(email).toLowerCase().trim() })
      if (!user) {
        return err(res, 404, 'Usuário não encontrado. Cadastre-o primeiro em /register.')
      }

      req.body.userId = user._id.toString()
      req.body.role = role
      return CulturaAssignmentController.create(req, res)
    } catch (error) {
      console.error('[CulturaAssignmentController.createByEmail]', error)
      return err(res, 500, 'Erro ao vincular usuário')
    }
  }

  static async dashboard(req, res) {
    try {
      const ctx = req.culturaContext
      const [posts, categories, users, admins] = await Promise.all([
        CulturaPost.countDocuments({ status: 'published' }),
        CulturaCategory.countDocuments({ isActive: true }),
        User.countDocuments({}),
        CulturaUserAssignment.countDocuments({ role: 'admin_cultura', isActive: true }),
      ])

      return ok(res, 200, {
        data: {
          posts,
          categories,
          users,
          admins,
          assignments: ctx.assignments || [],
          isCulturaAdmin: ctx.isCulturaAdmin,
          isGlobalAdmin: ctx.isGlobalAdmin,
        },
      })
    } catch (error) {
      console.error('[CulturaAssignmentController.dashboard]', error)
      return err(res, 500, 'Erro ao carregar dashboard')
    }
  }
}
