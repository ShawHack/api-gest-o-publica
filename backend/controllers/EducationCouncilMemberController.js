const ObjectId = require('mongoose').Types.ObjectId

const EducationCouncilMember = require('../models/EducationCouncilMember')
const EducationEntity = require('../models/EducationEntity')
const { MEMBER_ROLES, MEMBER_SEGMENTS } = require('../helpers/education-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const { parsePagination, paginatedResponse, ok, err } = require('../helpers/education-service')

async function resolveCouncilEntity(slug) {
  return EducationEntity.findOne({ slug, type: 'conselho', isActive: true }).select('_id type')
}

module.exports = class EducationCouncilMemberController {
  static async listPublic(req, res) {
    try {
      const { entitySlug } = req.query
      if (!entitySlug) return err(res, 422, 'entitySlug é obrigatório')
      const entity = await resolveCouncilEntity(entitySlug)
      if (!entity) return err(res, 404, 'Conselho não encontrado')

      const items = await EducationCouncilMember.find({
        educationEntityId: entity._id,
        isActive: true,
      })
        .sort({ order: 1, name: 1 })
        .lean()

      return ok(res, 200, { data: items })
    } catch (error) {
      console.error('[EducationCouncilMemberController.listPublic]', error)
      return err(res, 500, 'Erro ao listar membros')
    }
  }

  static async listAdmin(req, res) {
    try {
      const ctx = req.educationContext
      const { page, limit, skip } = parsePagination(req.query)
      const filter = {}
      if (req.query.entityId) {
        if (!ObjectId.isValid(req.query.entityId)) return err(res, 422, 'ID inválido')
        filter.educationEntityId = req.query.entityId
      }

      if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
        const ids = (ctx.assignments || [])
          .filter((a) => a.educationEntityId)
          .map((a) => a.educationEntityId)
        if (filter.educationEntityId && !ids.some((id) => String(id) === String(filter.educationEntityId))) {
          return err(res, 403, 'Sem permissão')
        }
        if (!filter.educationEntityId) filter.educationEntityId = { $in: ids }
      }

      const [items, total] = await Promise.all([
        EducationCouncilMember.find(filter)
          .populate('educationEntityId', 'name slug councilCode')
          .sort({ order: 1, name: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationCouncilMember.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationCouncilMemberController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar membros')
    }
  }

  static async create(req, res) {
    try {
      const { educationEntityId, name, role, segment, isTitular, mandateStart, mandateEnd, email, phone, order } = req.body
      if (!educationEntityId || !name) return err(res, 422, 'Conselho e nome são obrigatórios')
      if (!ObjectId.isValid(educationEntityId)) return err(res, 422, 'ID do conselho inválido')

      const entity = await EducationEntity.findById(educationEntityId).select('type')
      if (!entity || entity.type !== 'conselho') return err(res, 422, 'Entidade deve ser um conselho')
      if (!canAccessEntity(req.educationContext, educationEntityId, { action: 'create', entityType: 'conselho' })) {
        return err(res, 403, 'Sem permissão')
      }

      const member = await EducationCouncilMember.create({
        educationEntityId,
        name,
        role: MEMBER_ROLES.includes(role) ? role : 'membro_titular',
        segment: MEMBER_SEGMENTS.includes(segment) ? segment : 'outro',
        isTitular: isTitular !== false,
        mandateStart: mandateStart ? new Date(mandateStart) : null,
        mandateEnd: mandateEnd ? new Date(mandateEnd) : null,
        email: email || '',
        phone: phone || '',
        order: Number(order) || 0,
        createdBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'education.council_member.create',
        resourceType: 'education_council_member',
        resourceId: member._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: member })
    } catch (error) {
      console.error('[EducationCouncilMemberController.create]', error)
      return err(res, 500, 'Erro ao criar membro')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const member = await EducationCouncilMember.findById(id)
      if (!member) return err(res, 404, 'Membro não encontrado')
      if (!canAccessEntity(req.educationContext, member.educationEntityId, { action: 'write', entityType: 'conselho' })) {
        return err(res, 403, 'Sem permissão')
      }

      const before = member.toObject()
      const fields = ['name', 'email', 'phone', 'order']
      for (const field of fields) {
        if (req.body[field] !== undefined) member[field] = req.body[field]
      }
      if (req.body.role && MEMBER_ROLES.includes(req.body.role)) member.role = req.body.role
      if (req.body.segment && MEMBER_SEGMENTS.includes(req.body.segment)) member.segment = req.body.segment
      if (req.body.isTitular !== undefined) member.isTitular = Boolean(req.body.isTitular)
      if (req.body.isActive !== undefined) member.isActive = Boolean(req.body.isActive)
      if (req.body.mandateStart !== undefined) {
        member.mandateStart = req.body.mandateStart ? new Date(req.body.mandateStart) : null
      }
      if (req.body.mandateEnd !== undefined) {
        member.mandateEnd = req.body.mandateEnd ? new Date(req.body.mandateEnd) : null
      }

      await member.save()
      await recordChange(req, {
        before,
        after: member.toObject(),
        resourceType: 'education_council_member',
        resourceId: member._id,
        module: 'education',
      })

      return ok(res, 200, { data: member })
    } catch (error) {
      console.error('[EducationCouncilMemberController.update]', error)
      return err(res, 500, 'Erro ao atualizar membro')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const member = await EducationCouncilMember.findById(id)
      if (!member) return err(res, 404, 'Membro não encontrado')
      if (!canAccessEntity(req.educationContext, member.educationEntityId, { action: 'delete', entityType: 'conselho' })) {
        return err(res, 403, 'Sem permissão')
      }

      member.isActive = false
      await member.save()

      await recordAudit(req, {
        action: 'education.council_member.deactivate',
        resourceType: 'education_council_member',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Membro removido' })
    } catch (error) {
      console.error('[EducationCouncilMemberController.remove]', error)
      return err(res, 500, 'Erro ao remover membro')
    }
  }
}
