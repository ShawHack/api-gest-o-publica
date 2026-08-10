const ObjectId = require('mongoose').Types.ObjectId

const EducationEntity = require('../models/EducationEntity')
const EducationPost = require('../models/EducationPost')
const EducationDocument = require('../models/EducationDocument')
const EducationGallery = require('../models/EducationGallery')
const EducationCouncilMember = require('../models/EducationCouncilMember')
const EducationCalendarEvent = require('../models/EducationCalendarEvent')
const EducationLegislation = require('../models/EducationLegislation')
const { ENTITY_TYPES } = require('../helpers/education-constants')
const { applySchoolUnitFields, serializeSchoolUnit, isSchoolUnitType } = require('../helpers/education-entity-fields')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const {
  escapeRegex,
  parseBoolean,
  parsePagination,
  uniqueSlug,
  paginatedResponse,
  ok,
  err,
  getSavedImagePaths,
} = require('../helpers/education-service')

/** Atribui logo/capa conforme o campo enviado no multipart (evita capa ir para logoUrl). */
function applyEntityImages(entity, req) {
  const logo = req.files?.logo?.[0]
  const cover = req.files?.cover?.[0]
  const managerPhoto = req.files?.managerPhoto?.[0]

  if (logo?.filename) {
    entity.logoUrl = `/images/education/${logo.filename}`
  }
  if (cover?.filename) {
    entity.coverImageUrl = `/images/education/${cover.filename}`
  }
  if (managerPhoto?.filename) {
    entity.managerPhotoUrl = `/images/education/${managerPhoto.filename}`
  }

  if (cover?.filename || managerPhoto?.filename) return

  const images = getSavedImagePaths(req)
  if (images.length === 0) return

  if (!logo?.filename) {
    entity.coverImageUrl = images[0]
  }
}

module.exports = class EducationEntityController {
  static async overview(_req, res) {
    try {
      const [entities, news, councils] = await Promise.all([
        EducationEntity.countDocuments({ isActive: true }),
        EducationPost.countDocuments({ status: 'published' }),
        EducationEntity.countDocuments({ type: 'conselho', isActive: true }),
      ])
      return ok(res, 200, {
        data: {
          module: 'education',
          activeEntities: entities,
          publishedPosts: news,
          councils,
        },
      })
    } catch (error) {
      console.error('[EducationEntityController.overview]', error)
      return err(res, 500, 'Erro ao carregar visão geral')
    }
  }

  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query)
      const filter = { isActive: true }
      if (req.query.type && ENTITY_TYPES.includes(req.query.type)) {
        filter.type = req.query.type
      }
      if (req.query.neighborhood) {
        filter.neighborhood = new RegExp(escapeRegex(req.query.neighborhood), 'i')
      }
      if (req.query.q) {
        filter.name = new RegExp(escapeRegex(req.query.q), 'i')
      }
      const [items, total] = await Promise.all([
        EducationEntity.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
        EducationEntity.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationEntityController.listPublic]', error)
      return err(res, 500, 'Erro ao listar unidades')
    }
  }

  static async getBySlug(req, res) {
    try {
      const entity = await EducationEntity.findOne({
        slug: req.params.slug,
        isActive: true,
      }).lean()
      if (!entity) return err(res, 404, 'Unidade não encontrada')

      const entityId = entity._id
      const isCouncil = entity.type === 'conselho'

      const queries = [
        EducationPost.find({
          educationEntityId: entityId,
          status: 'published',
        })
          .sort({ publishedAt: -1 })
          .limit(10)
          .select('title slug summary type coverImageUrl publishedAt featured')
          .lean(),
        EducationGallery.find({ educationEntityId: entityId })
          .sort({ eventDate: -1 })
          .limit(6)
          .select('title description eventDate items')
          .lean(),
        EducationDocument.find({
          educationEntityId: entityId,
          status: 'published',
          visibility: 'public',
        })
          .sort({ publishedAt: -1 })
          .limit(10)
          .select('title description documentType category meetingType meetingDate sessionNumber referenceYear fileUrl publishedAt')
          .lean(),
        EducationPost.find({
          educationEntityId: entityId,
          status: 'published',
          type: 'projeto',
        })
          .sort({ publishedAt: -1 })
          .limit(6)
          .select('title slug summary coverImageUrl publishedAt')
          .lean(),
      ]

      if (isCouncil) {
        queries.push(
          EducationCouncilMember.find({ educationEntityId: entityId, isActive: true })
            .sort({ order: 1, name: 1 })
            .lean(),
          EducationCalendarEvent.find({
            educationEntityId: entityId,
            isPublic: true,
            startDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          })
            .sort({ startDate: 1 })
            .limit(8)
            .select('title startDate endDate location type')
            .lean(),
          EducationLegislation.find({
            educationEntityId: entityId,
            status: 'published',
          })
            .sort({ publicationDate: -1 })
            .limit(10)
            .select('title category number year publicationDate fileUrl')
            .lean()
        )
      }

      const results = await Promise.all(queries)
      const [news, galleries, documents, projects] = results
      const members = isCouncil ? results[4] : []
      const upcomingMeetings = isCouncil ? results[5] : []
      const legislation = isCouncil ? results[6] : []

      return ok(res, 200, {
        data: {
          ...entity,
          news,
          galleries,
          documents,
          projects,
          ...(isCouncil ? { members, upcomingMeetings, legislation } : {}),
        },
      })
    } catch (error) {
      console.error('[EducationEntityController.getBySlug]', error)
      return err(res, 500, 'Erro ao carregar unidade')
    }
  }

  static async listCouncils(_req, res) {
    try {
      const items = await EducationEntity.find({
        type: 'conselho',
        isActive: true,
      })
        .sort({ name: 1 })
        .lean()
      return ok(res, 200, { data: items })
    } catch (error) {
      console.error('[EducationEntityController.listCouncils]', error)
      return err(res, 500, 'Erro ao listar conselhos')
    }
  }

  static async listAdmin(req, res) {
    try {
      const ctx = req.educationContext
      const { page, limit, skip } = parsePagination(req.query)
      const filter = {}
      if (req.query.type) filter.type = req.query.type
      if (req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), 'i')
      if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
        const ids = (ctx.assignments || [])
          .filter((a) => a.educationEntityId)
          .map((a) => a.educationEntityId)
        filter._id = { $in: ids }
      }
      const [items, total] = await Promise.all([
        EducationEntity.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
        EducationEntity.countDocuments(filter),
      ])
      const data = items.map((item) => (
        isSchoolUnitType(item.type) ? serializeSchoolUnit(item) : item
      ))
      return res.json(paginatedResponse(data, total, page, limit))
    } catch (error) {
      console.error('[EducationEntityController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar entidades')
    }
  }

  static async create(req, res) {
    try {
      const { name, type, description, address, neighborhood, phone, email, openingHours, managerName, managerRole, councilCode, competencies, legalBasis, institutionalAbout } = req.body
      if (!name || !type) return err(res, 422, 'Nome e tipo são obrigatórios')
      if (!ENTITY_TYPES.includes(type)) return err(res, 422, 'Tipo de entidade inválido')

      const slug = await uniqueSlug(EducationEntity, req.body.slug || name)
      const entity = new EducationEntity({
        name,
        slug,
        type,
        description: description || '',
        address: address || '',
        neighborhood: neighborhood || '',
        phone: phone || '',
        email: email || '',
        openingHours: openingHours || '',
        managerName: managerName || '',
        managerRole: managerRole || '',
        councilCode: councilCode || '',
        competencies: competencies || '',
        legalBasis: legalBasis || '',
        institutionalAbout: institutionalAbout || '',
        logoUrl: req.body.logoUrl || '',
        coverImageUrl: req.body.coverImageUrl || '',
        isActive: parseBoolean(req.body.isActive, true),
        createdBy: req.user.id,
      })

      if (isSchoolUnitType(type)) {
        applySchoolUnitFields(entity, req.body)
      }
      applyEntityImages(entity, req)

      await entity.save()

      await recordAudit(req, {
        action: 'education.entity.create',
        resourceType: 'education_entity',
        resourceId: entity._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, {
        data: isSchoolUnitType(entity.type) ? serializeSchoolUnit(entity) : entity,
      })
    } catch (error) {
      console.error('[EducationEntityController.create]', error)
      return err(res, 500, 'Erro ao criar entidade')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const entity = await EducationEntity.findById(id)
      if (!entity) return err(res, 404, 'Entidade não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, id, { action: 'write', entityType: entity.type })) {
        return err(res, 403, 'Sem permissão para esta unidade')
      }

      const before = entity.toObject()
      const fields = [
        'name', 'description', 'address', 'neighborhood', 'phone', 'email',
        'openingHours', 'managerName', 'managerRole', 'councilCode',
        'competencies', 'legalBasis', 'institutionalAbout',
      ]
      for (const field of fields) {
        if (req.body[field] !== undefined) entity[field] = req.body[field]
      }
      if (req.body.type && ENTITY_TYPES.includes(req.body.type)) {
        const nextType = req.body.type
        if (entity.type === 'conselho' || nextType === 'conselho') {
          return err(res, 422, 'Alteração de tipo para ou a partir de conselho deve ser feita na aba Conselhos.')
        }
        entity.type = nextType
      }
      if (isSchoolUnitType(entity.type)) {
        applySchoolUnitFields(entity, req.body)
      }
      if (req.body.isActive !== undefined) entity.isActive = parseBoolean(req.body.isActive)
      if (req.body.logoUrl) entity.logoUrl = req.body.logoUrl
      if (req.body.coverImageUrl) entity.coverImageUrl = req.body.coverImageUrl
      if (req.body.managerPhotoUrl) entity.managerPhotoUrl = req.body.managerPhotoUrl
      applyEntityImages(entity, req)
      if (req.body.slug) entity.slug = await uniqueSlug(EducationEntity, req.body.slug, id)

      await entity.save()
      await recordChange(req, {
        before,
        after: entity.toObject(),
        resourceType: 'education_entity',
        resourceId: entity._id,
        module: 'education',
      })

      return ok(res, 200, {
        data: isSchoolUnitType(entity.type) ? serializeSchoolUnit(entity) : entity,
      })
    } catch (error) {
      console.error('[EducationEntityController.update]', error)
      return err(res, 500, 'Erro ao atualizar entidade')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, id, { action: 'delete' }) && !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      const entity = await EducationEntity.findByIdAndDelete(id)
      if (!entity) return err(res, 404, 'Entidade não encontrada')

      await recordAudit(req, {
        action: 'education.entity.delete',
        resourceType: 'education_entity',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Entidade removida' })
    } catch (error) {
      console.error('[EducationEntityController.remove]', error)
      return err(res, 500, 'Erro ao remover entidade')
    }
  }

  static async listPartnerEntitiesPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query)
      const filter = {
        isActive: true,
        isPartnerEntity: true,
        type: { $ne: 'conselho' },
      }
      if (req.query.q) {
        filter.name = new RegExp(escapeRegex(req.query.q), 'i')
      }
      const [items, total] = await Promise.all([
        EducationEntity.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
        EducationEntity.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationEntityController.listPartnerEntitiesPublic]', error)
      return err(res, 500, 'Erro ao listar entidades conveniadas')
    }
  }

  static async getPartnerBySlug(req, res) {
    try {
      const entity = await EducationEntity.findOne({
        slug: req.params.slug,
        isActive: true,
        isPartnerEntity: true,
      }).lean()
      if (!entity) return err(res, 404, 'Entidade conveniada não encontrada')
      return ok(res, 200, { data: entity })
    } catch (error) {
      console.error('[EducationEntityController.getPartnerBySlug]', error)
      return err(res, 500, 'Erro ao carregar entidade conveniada')
    }
  }

  static async listPartnerEntitiesAdmin(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 200, maxLimit: 500 })
      const filter = { type: { $ne: 'conselho' } }
      if (req.query.q) {
        filter.name = new RegExp(escapeRegex(req.query.q), 'i')
      }
      const [items, total] = await Promise.all([
        EducationEntity.find(filter)
          .sort({ name: 1 })
          .select('name slug type neighborhood phone email isActive isPartnerEntity coverImageUrl logoUrl imageUrl')
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationEntity.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationEntityController.listPartnerEntitiesAdmin]', error)
      return err(res, 500, 'Erro ao listar unidades')
    }
  }

  static async setPartnerStatus(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const entity = await EducationEntity.findById(id)
      if (!entity) return err(res, 404, 'Unidade não encontrada')
      if (entity.type === 'conselho') {
        return err(res, 422, 'Conselhos não podem ser marcados como entidade conveniada')
      }

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, id, { action: 'write', entityType: entity.type })) {
        if (!ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
          return err(res, 403, 'Sem permissão para esta unidade')
        }
      }

      const before = entity.toObject()
      entity.isPartnerEntity = parseBoolean(req.body.isPartnerEntity)
      await entity.save()

      await recordChange(req, {
        before,
        after: entity.toObject(),
        resourceType: 'education_entity',
        resourceId: entity._id,
        module: 'education',
      })

      return ok(res, 200, { data: entity })
    } catch (error) {
      console.error('[EducationEntityController.setPartnerStatus]', error)
      return err(res, 500, 'Erro ao atualizar entidade conveniada')
    }
  }
}
