const ObjectId = require('mongoose').Types.ObjectId

const EducationDocumentCategory = require('../models/EducationDocumentCategory')
const EducationEntity = require('../models/EducationEntity')
const { DOCUMENT_TYPES } = require('../helpers/education-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const { parsePagination, paginatedResponse, ok, err } = require('../helpers/education-service')

module.exports = class EducationDocumentCategoryController {
  static async listPublic(req, res) {
    try {
      const filter = { isActive: true }
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({
          slug: req.query.entitySlug,
          type: 'conselho',
          isActive: true,
        }).select('_id')
        if (!entity) return err(res, 404, 'Conselho não encontrado')
        filter.$or = [{ educationEntityId: entity._id }, { educationEntityId: null }]
      }
      const items = await EducationDocumentCategory.find(filter)
        .sort({ order: 1, label: 1 })
        .lean()
      return ok(res, 200, { data: items })
    } catch (error) {
      console.error('[EducationDocumentCategoryController.listPublic]', error)
      return err(res, 500, 'Erro ao listar categorias')
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
        if (!filter.educationEntityId) filter.educationEntityId = { $in: [...ids, null] }
      }

      const [items, total] = await Promise.all([
        EducationDocumentCategory.find(filter)
          .populate('educationEntityId', 'name slug councilCode')
          .sort({ order: 1, label: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationDocumentCategory.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationDocumentCategoryController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar categorias')
    }
  }

  static async create(req, res) {
    try {
      const { educationEntityId, slug, label, documentTypes, order } = req.body
      if (!slug || !label) return err(res, 422, 'Slug e nome são obrigatórios')

      if (educationEntityId) {
        if (!ObjectId.isValid(educationEntityId)) return err(res, 422, 'ID do conselho inválido')
        const entity = await EducationEntity.findById(educationEntityId).select('type')
        if (!entity || entity.type !== 'conselho') return err(res, 422, 'Entidade deve ser um conselho')
        if (!canAccessEntity(req.educationContext, educationEntityId, { action: 'create', entityType: 'conselho' })) {
          return err(res, 403, 'Sem permissão')
        }
      } else if (!req.educationContext.isGlobalAdmin && !req.educationContext.isEducationAdmin) {
        return err(res, 403, 'Sem permissão para categorias globais')
      }

      const types = Array.isArray(documentTypes)
        ? documentTypes.filter((t) => DOCUMENT_TYPES.includes(t))
        : []

      const category = await EducationDocumentCategory.create({
        educationEntityId: educationEntityId || null,
        slug: String(slug).trim().toLowerCase(),
        label,
        documentTypes: types,
        order: Number(order) || 0,
        createdBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'education.document_category.create',
        resourceType: 'education_document_category',
        resourceId: category._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: category })
    } catch (error) {
      if (error?.code === 11000) return err(res, 409, 'Categoria já existe para este conselho')
      console.error('[EducationDocumentCategoryController.create]', error)
      return err(res, 500, 'Erro ao criar categoria')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const category = await EducationDocumentCategory.findById(id)
      if (!category) return err(res, 404, 'Categoria não encontrada')

      if (category.educationEntityId) {
        if (!canAccessEntity(req.educationContext, category.educationEntityId, { action: 'write', entityType: 'conselho' })) {
          return err(res, 403, 'Sem permissão')
        }
      } else if (!req.educationContext.isGlobalAdmin && !req.educationContext.isEducationAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      const before = category.toObject()
      if (req.body.label) category.label = req.body.label
      if (req.body.slug) category.slug = String(req.body.slug).trim().toLowerCase()
      if (req.body.order !== undefined) category.order = Number(req.body.order) || 0
      if (req.body.isActive !== undefined) category.isActive = Boolean(req.body.isActive)
      if (Array.isArray(req.body.documentTypes)) {
        category.documentTypes = req.body.documentTypes.filter((t) => DOCUMENT_TYPES.includes(t))
      }

      await category.save()
      await recordChange(req, {
        before,
        after: category.toObject(),
        resourceType: 'education_document_category',
        resourceId: category._id,
        module: 'education',
      })

      return ok(res, 200, { data: category })
    } catch (error) {
      console.error('[EducationDocumentCategoryController.update]', error)
      return err(res, 500, 'Erro ao atualizar categoria')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const category = await EducationDocumentCategory.findById(id)
      if (!category) return err(res, 404, 'Categoria não encontrada')

      if (category.educationEntityId) {
        if (!canAccessEntity(req.educationContext, category.educationEntityId, { action: 'delete', entityType: 'conselho' })) {
          return err(res, 403, 'Sem permissão')
        }
      } else if (!req.educationContext.isGlobalAdmin && !req.educationContext.isEducationAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      category.isActive = false
      await category.save()

      return ok(res, 200, { message: 'Categoria removida' })
    } catch (error) {
      console.error('[EducationDocumentCategoryController.remove]', error)
      return err(res, 500, 'Erro ao remover categoria')
    }
  }
}
