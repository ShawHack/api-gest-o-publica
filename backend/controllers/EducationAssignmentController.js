const ObjectId = require('mongoose').Types.ObjectId

const EducationUserAssignment = require('../models/EducationUserAssignment')
const EducationEntity = require('../models/EducationEntity')
const { EDUCATION_ROLES } = require('../helpers/education-constants')
const { recordAudit } = require('../helpers/audit-log')
const { parsePagination, paginatedResponse, ok, err, buildEducationCapabilities, validateEducationAssignment } = require('../helpers/education-service')

module.exports = class EducationAssignmentController {
  static async list(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query)
      const filter = { isActive: true }
      if (req.query.userId) filter.userId = req.query.userId
      if (req.query.entityId) filter.educationEntityId = req.query.entityId
      if (req.query.role) filter.role = req.query.role

      const [items, total] = await Promise.all([
        EducationUserAssignment.find(filter)
          .populate('userId', 'name email')
          .populate('educationEntityId', 'name slug type')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationUserAssignment.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationAssignmentController.list]', error)
      return err(res, 500, 'Erro ao listar vínculos')
    }
  }

  static async create(req, res) {
    try {
      const { userId, educationEntityId, role } = req.body
      if (!userId || !role) return err(res, 422, 'Usuário e perfil são obrigatórios')
      if (!ObjectId.isValid(userId)) return err(res, 422, 'ID do usuário inválido')
      if (!EDUCATION_ROLES.includes(role)) return err(res, 422, 'Perfil inválido')

      if (educationEntityId && !ObjectId.isValid(educationEntityId)) {
        return err(res, 422, 'ID da entidade inválido')
      }

      const entity = educationEntityId
        ? await EducationEntity.findById(educationEntityId).select('type name')
        : null

      const validation = validateEducationAssignment({ role, educationEntityId, entity })
      if (!validation.valid) {
        return err(res, 422, validation.errors[0])
      }

      const assignment = await EducationUserAssignment.create({
        userId,
        educationEntityId: educationEntityId || null,
        role,
        assignedBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'education.assignment.create',
        resourceType: 'education_user_assignment',
        resourceId: assignment._id,
        module: 'education',
        eventType: 'PERMISSION_CHANGE',
      })

      return ok(res, 201, { data: assignment })
    } catch (error) {
      if (error?.code === 11000) {
        return err(res, 409, 'Vínculo já existe para este usuário e entidade')
      }
      console.error('[EducationAssignmentController.create]', error)
      return err(res, 500, 'Erro ao criar vínculo')
    }
  }

  static async createByEmail(req, res) {
    try {
      const { email, role, educationEntityId } = req.body
      if (!email) return err(res, 422, 'E-mail é obrigatório')
      if (!role) return err(res, 422, 'Perfil é obrigatório')

      const User = require('../models/User')
      const user = await User.findOne({ email: String(email).toLowerCase().trim() })
      if (!user) {
        return err(res, 404, 'Usuário não encontrado. Cadastre-o primeiro no sistema.')
      }

      req.body.userId = user._id.toString()
      return EducationAssignmentController.create(req, res)
    } catch (error) {
      console.error('[EducationAssignmentController.createByEmail]', error)
      return err(res, 500, 'Erro ao vincular usuário')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const assignment = await EducationUserAssignment.findById(id)
      if (!assignment) return err(res, 404, 'Vínculo não encontrado')

      assignment.isActive = false
      await assignment.save()

      await recordAudit(req, {
        action: 'education.assignment.deactivate',
        resourceType: 'education_user_assignment',
        resourceId: id,
        module: 'education',
        eventType: 'PERMISSION_CHANGE',
      })

      return ok(res, 200, { message: 'Vínculo desativado' })
    } catch (error) {
      console.error('[EducationAssignmentController.remove]', error)
      return err(res, 500, 'Erro ao remover vínculo')
    }
  }

  static async dashboard(req, res) {
    try {
      const ctx = req.educationContext
      const entityFilter = {}
      if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
        const ids = (ctx.assignments || [])
          .filter((a) => a.educationEntityId)
          .map((a) => a.educationEntityId)
        entityFilter._id = { $in: ids }
      }

      const EducationPost = require('../models/EducationPost')
      const EducationDocument = require('../models/EducationDocument')
      const EducationCalendarEvent = require('../models/EducationCalendarEvent')

      const [entities, pendingPosts, pendingDocuments, recentDocs, upcomingEvents] = await Promise.all([
        EducationEntity.countDocuments({ ...entityFilter, isActive: true }),
        EducationPost.countDocuments({
          status: 'pending_review',
          ...(entityFilter._id ? { educationEntityId: entityFilter._id } : {}),
        }),
        EducationDocument.countDocuments({
          status: 'pending_review',
          ...(entityFilter._id ? { educationEntityId: entityFilter._id } : {}),
        }),
        EducationDocument.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          ...(entityFilter._id ? { educationEntityId: entityFilter._id } : {}),
        }),
        EducationCalendarEvent.countDocuments({
          startDate: { $gte: new Date() },
          ...(entityFilter._id ? { educationEntityId: entityFilter._id } : {}),
        }),
      ])

      return ok(res, 200, {
        data: {
          entities,
          pendingPosts,
          pendingDocuments,
          recentDocuments: recentDocs,
          upcomingEvents,
          assignments: ctx.assignments || [],
          capabilities: buildEducationCapabilities(ctx),
        },
      })
    } catch (error) {
      console.error('[EducationAssignmentController.dashboard]', error)
      return err(res, 500, 'Erro ao carregar dashboard')
    }
  }
}
