const ObjectId = require('mongoose').Types.ObjectId

const EducationLegislation = require('../models/EducationLegislation')
const EducationEntity = require('../models/EducationEntity')
const { LEGISLATION_CATEGORIES, DOCUMENT_STATUSES } = require('../helpers/education-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const { documentPublicUrl } = require('../helpers/education-upload')
const {
  escapeRegex,
  parsePagination,
  paginatedResponse,
  ok,
  err,
  applyLegislationAdminScope,
  canManageModule,
} = require('../helpers/education-service')

module.exports = class EducationLegislationController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 200 })
      const filter = { status: 'published' }
      if (req.query.category) filter.category = req.query.category
      if (req.query.year) filter.year = parseInt(req.query.year, 10)
      if (req.query.number) filter.number = new RegExp(escapeRegex(req.query.number), 'i')
      if (req.query.q) {
        filter.$or = [
          { title: new RegExp(escapeRegex(req.query.q), 'i') },
          { number: new RegExp(escapeRegex(req.query.q), 'i') },
          { description: new RegExp(escapeRegex(req.query.q), 'i') },
        ]
      }
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({
          slug: req.query.entitySlug,
          isActive: true,
        }).select('_id')
        if (!entity) {
          return res.json(paginatedResponse([], 0, page, limit))
        }
        filter.educationEntityId = entity._id
      }
      const [items, total] = await Promise.all([
        EducationLegislation.find(filter)
          .populate('educationEntityId', 'name slug type councilCode')
          .sort({ publicationDate: -1, year: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationLegislation.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationLegislationController.listPublic]', error)
      return err(res, 500, 'Erro ao listar legislação')
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const item = await EducationLegislation.findOne({ _id: id, status: 'published' })
        .populate('educationEntityId', 'name slug type councilCode')
        .lean()
      if (!item) return err(res, 404, 'Legislação não encontrada')
      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationLegislationController.getById]', error)
      return err(res, 500, 'Erro ao carregar legislação')
    }
  }

  static async listAdmin(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 200 })
      const filter = {}
      if (req.query.category) filter.category = req.query.category
      if (req.query.status) filter.status = req.query.status
      if (req.query.entityId && ObjectId.isValid(req.query.entityId)) {
        filter.educationEntityId = req.query.entityId
      }
      if (req.query.q) {
        filter.$or = [
          { title: new RegExp(escapeRegex(req.query.q), 'i') },
          { number: new RegExp(escapeRegex(req.query.q), 'i') },
          { description: new RegExp(escapeRegex(req.query.q), 'i') },
        ]
      }
      applyLegislationAdminScope(req.educationContext, filter)
      const [items, total] = await Promise.all([
        EducationLegislation.find(filter)
          .populate('educationEntityId', 'name slug councilCode')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationLegislation.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationLegislationController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar legislação')
    }
  }

  static async create(req, res) {
    try {
      const { title, category, description, number, year, publicationDate, educationEntityId } = req.body
      if (!title || !category) return err(res, 422, 'Título e categoria são obrigatórios')
      if (!LEGISLATION_CATEGORIES.includes(category)) return err(res, 422, 'Categoria inválida')

      const ctx = req.educationContext
      if (educationEntityId) {
        if (!ObjectId.isValid(educationEntityId)) return err(res, 422, 'ID do conselho inválido')
        const entity = await EducationEntity.findById(educationEntityId).select('type')
        if (!entity || entity.type !== 'conselho') return err(res, 422, 'Legislação vinculada deve ser de um conselho')
        if (!canAccessEntity(ctx, educationEntityId, { action: 'create', entityType: 'conselho' })) {
          return err(res, 403, 'Sem permissão')
        }
      } else if (!canManageModule(ctx)) {
        return err(res, 403, 'Sem permissão para legislação global')
      }

      let fileUrl = req.body.fileUrl || ''
      if (req.file) fileUrl = documentPublicUrl(req.file.filename)
      if (!fileUrl) return err(res, 422, 'Arquivo é obrigatório')

      const item = await EducationLegislation.create({
        educationEntityId: educationEntityId && ObjectId.isValid(educationEntityId) ? educationEntityId : null,
        title,
        description: description || '',
        category,
        number: number || '',
        year: year ? parseInt(year, 10) : undefined,
        publicationDate: publicationDate ? new Date(publicationDate) : new Date(),
        fileUrl,
        status: DOCUMENT_STATUSES.includes(req.body.status) ? req.body.status : 'published',
        createdBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'education.legislation.create',
        resourceType: 'education_legislation',
        resourceId: item._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: item })
    } catch (error) {
      console.error('[EducationLegislationController.create]', error)
      return err(res, 500, 'Erro ao criar legislação')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await EducationLegislation.findById(id)
      if (!item) return err(res, 404, 'Legislação não encontrada')

      const ctx = req.educationContext
      if (item.educationEntityId) {
        if (!canAccessEntity(ctx, item.educationEntityId, { action: 'write', entityType: 'conselho' })) {
          return err(res, 403, 'Sem permissão')
        }
      } else if (!canManageModule(ctx)) {
        return err(res, 403, 'Sem permissão')
      }

      const before = item.toObject()
      if (req.body.title) item.title = req.body.title
      if (req.body.description !== undefined) item.description = req.body.description
      if (req.body.category && LEGISLATION_CATEGORIES.includes(req.body.category)) {
        item.category = req.body.category
      }
      if (req.body.number !== undefined) item.number = req.body.number
      if (req.body.year !== undefined) item.year = parseInt(req.body.year, 10)
      if (req.body.publicationDate !== undefined) {
        item.publicationDate = req.body.publicationDate ? new Date(req.body.publicationDate) : null
      }
      if (req.body.status && DOCUMENT_STATUSES.includes(req.body.status)) item.status = req.body.status
      if (req.file) item.fileUrl = documentPublicUrl(req.file.filename)

      await item.save()
      await recordChange(req, {
        before,
        after: item.toObject(),
        resourceType: 'education_legislation',
        resourceId: item._id,
        module: 'education',
      })

      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationLegislationController.update]', error)
      return err(res, 500, 'Erro ao atualizar legislação')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await EducationLegislation.findById(id)
      if (!item) return err(res, 404, 'Legislação não encontrada')

      const ctx = req.educationContext
      if (item.educationEntityId) {
        if (!canAccessEntity(ctx, item.educationEntityId, { action: 'delete', entityType: 'conselho' })) {
          return err(res, 403, 'Sem permissão')
        }
      } else if (!canManageModule(ctx)) {
        return err(res, 403, 'Sem permissão')
      }

      await item.deleteOne()
      await recordAudit(req, {
        action: 'education.legislation.delete',
        resourceType: 'education_legislation',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Legislação removida' })
    } catch (error) {
      console.error('[EducationLegislationController.remove]', error)
      return err(res, 500, 'Erro ao remover legislação')
    }
  }
}
