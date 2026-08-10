const ObjectId = require('mongoose').Types.ObjectId

const EducationGallery = require('../models/EducationGallery')
const EducationEntity = require('../models/EducationEntity')
const { MEDIA_TYPES } = require('../helpers/education-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const {
  parsePagination,
  paginatedResponse,
  ok,
  err,
  getSavedImagePaths,
} = require('../helpers/education-service')

module.exports = class EducationGalleryController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query)
      const filter = {}
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({ slug: req.query.entitySlug, isActive: true }).select('_id')
        if (!entity) return err(res, 404, 'Unidade não encontrada')
        filter.educationEntityId = entity._id
      }
      const [items, total] = await Promise.all([
        EducationGallery.find(filter)
          .populate('educationEntityId', 'name slug type')
          .sort({ eventDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationGallery.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationGalleryController.listPublic]', error)
      return err(res, 500, 'Erro ao listar galerias')
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const gallery = await EducationGallery.findById(id)
        .populate('educationEntityId', 'name slug type')
        .lean()
      if (!gallery) return err(res, 404, 'Galeria não encontrada')
      return ok(res, 200, { data: gallery })
    } catch (error) {
      console.error('[EducationGalleryController.getById]', error)
      return err(res, 500, 'Erro ao carregar galeria')
    }
  }

  static async listAdmin(req, res) {
    try {
      const ctx = req.educationContext
      const { page, limit, skip } = parsePagination(req.query)
      const filter = {}
      if (req.query.entityId && ObjectId.isValid(req.query.entityId)) {
        filter.educationEntityId = req.query.entityId
      }

      if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
        const hasSecretary = ctx.assignments?.some((a) => a.role === 'education_secretary')
        if (!hasSecretary) {
          const ids = (ctx.assignments || [])
            .filter((a) => a.educationEntityId)
            .map((a) => a.educationEntityId)
          filter.educationEntityId = { $in: ids }
        }
      }

      const [items, total] = await Promise.all([
        EducationGallery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        EducationGallery.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationGalleryController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar galerias')
    }
  }

  static async create(req, res) {
    try {
      const { educationEntityId, title, description, eventDate, educationPostId } = req.body
      if (!educationEntityId || !title) {
        return err(res, 422, 'Entidade e título são obrigatórios')
      }
      if (!ObjectId.isValid(educationEntityId)) return err(res, 422, 'ID da entidade inválido')

      const entity = await EducationEntity.findById(educationEntityId).select('type')
      if (!entity) return err(res, 404, 'Entidade não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, educationEntityId, { action: 'create', entityType: entity.type })) {
        return err(res, 403, 'Sem permissão para esta unidade')
      }

      const imagePaths = getSavedImagePaths(req)
      let items = []
      if (req.body.items) {
        try {
          items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items
        } catch {
          items = []
        }
      }
      for (const path of imagePaths) {
        items.push({ mediaUrl: path, mediaType: 'image', caption: '', order: items.length })
      }

      const gallery = await EducationGallery.create({
        educationEntityId,
        educationPostId: educationPostId && ObjectId.isValid(educationPostId) ? educationPostId : null,
        title,
        description: description || '',
        eventDate: eventDate ? new Date(eventDate) : null,
        items: items.filter((i) => i.mediaUrl && MEDIA_TYPES.includes(i.mediaType || 'image')),
        createdBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'education.gallery.create',
        resourceType: 'education_gallery',
        resourceId: gallery._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: gallery })
    } catch (error) {
      console.error('[EducationGalleryController.create]', error)
      return err(res, 500, 'Erro ao criar galeria')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const gallery = await EducationGallery.findById(id)
      if (!gallery) return err(res, 404, 'Galeria não encontrada')

      const entity = await EducationEntity.findById(gallery.educationEntityId).select('type')
      const ctx = req.educationContext
      if (!canAccessEntity(ctx, gallery.educationEntityId, { action: 'write', entityType: entity?.type })) {
        return err(res, 403, 'Sem permissão')
      }

      const before = gallery.toObject()
      if (req.body.title) gallery.title = req.body.title
      if (req.body.description !== undefined) gallery.description = req.body.description
      if (req.body.eventDate !== undefined) {
        gallery.eventDate = req.body.eventDate ? new Date(req.body.eventDate) : null
      }

      const imagePaths = getSavedImagePaths(req)
      if (imagePaths.length) {
        for (const path of imagePaths) {
          gallery.items.push({
            mediaUrl: path,
            mediaType: 'image',
            caption: '',
            order: gallery.items.length,
          })
        }
      }
      if (req.body.items) {
        try {
          const parsed = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items
          if (Array.isArray(parsed)) gallery.items = parsed
        } catch {
          // mantém items existentes
        }
      }

      await gallery.save()
      await recordChange(req, {
        before,
        after: gallery.toObject(),
        resourceType: 'education_gallery',
        resourceId: gallery._id,
        module: 'education',
      })

      return ok(res, 200, { data: gallery })
    } catch (error) {
      console.error('[EducationGalleryController.update]', error)
      return err(res, 500, 'Erro ao atualizar galeria')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const gallery = await EducationGallery.findById(id)
      if (!gallery) return err(res, 404, 'Galeria não encontrada')

      const entity = await EducationEntity.findById(gallery.educationEntityId).select('type')
      const ctx = req.educationContext
      if (!canAccessEntity(ctx, gallery.educationEntityId, { action: 'delete', entityType: entity?.type }) &&
          !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      await gallery.deleteOne()
      await recordAudit(req, {
        action: 'education.gallery.delete',
        resourceType: 'education_gallery',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Galeria removida' })
    } catch (error) {
      console.error('[EducationGalleryController.remove]', error)
      return err(res, 500, 'Erro ao remover galeria')
    }
  }
}
