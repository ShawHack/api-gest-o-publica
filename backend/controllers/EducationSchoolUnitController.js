const ObjectId = require('mongoose').Types.ObjectId

const EducationEntity = require('../models/EducationEntity')
const { ENTITY_TYPES } = require('../helpers/education-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const {
  SCHOOL_UNIT_TYPES,
  applySchoolUnitFields,
  serializeSchoolUnit,
  isSchoolUnitType,
} = require('../helpers/education-entity-fields')
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

function schoolUnitTypeFilter() {
  return { type: { $in: SCHOOL_UNIT_TYPES } }
}

function assertSchoolUnitType(type) {
  if (!type || !isSchoolUnitType(type)) {
    return { valid: false, message: `Tipo inválido. Use: ${SCHOOL_UNIT_TYPES.join(', ')}` }
  }
  return { valid: true }
}

function applyUploadedImages(entity, req) {
  const logo = req.files?.logo?.[0]
  const cover = req.files?.cover?.[0]
  const photo = req.files?.photo?.[0]
  const managerPhoto = req.files?.managerPhoto?.[0]
  if (logo?.filename) entity.logoUrl = `/images/education/${logo.filename}`
  const coverFile = cover || photo
  if (coverFile?.filename) {
    entity.coverImageUrl = `/images/education/${coverFile.filename}`
  } else {
    const images = getSavedImagePaths(req)
    if (images[1]) entity.coverImageUrl = images[1]
    else if (images[0] && !logo && !managerPhoto) entity.coverImageUrl = images[0]
  }
  if (managerPhoto?.filename) {
    entity.managerPhotoUrl = `/images/education/${managerPhoto.filename}`
  }
}

module.exports = class EducationSchoolUnitController {
  /** GET /education/school-units — listagem pública */
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query)
      const filter = { ...schoolUnitTypeFilter(), isActive: true }

      if (req.query.type && SCHOOL_UNIT_TYPES.includes(req.query.type)) {
        filter.type = req.query.type
      }
      if (req.query.neighborhood) {
        filter.neighborhood = new RegExp(escapeRegex(req.query.neighborhood), 'i')
      }
      if (req.query.city) {
        filter['addressDetails.city'] = new RegExp(escapeRegex(req.query.city), 'i')
      }
      if (req.query.q) {
        const regex = new RegExp(escapeRegex(req.query.q), 'i')
        filter.$or = [
          { name: regex },
          { neighborhood: regex },
          { 'addressDetails.street': regex },
          { 'addressDetails.city': regex },
        ]
      }

      const [items, total] = await Promise.all([
        EducationEntity.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
        EducationEntity.countDocuments(filter),
      ])

      return res.json(paginatedResponse(items.map(serializeSchoolUnit), total, page, limit))
    } catch (error) {
      console.error('[EducationSchoolUnitController.listPublic]', error)
      return err(res, 500, 'Erro ao listar unidades escolares')
    }
  }

  /** GET /education/school-units/:slug — detalhe público */
  static async getBySlug(req, res) {
    try {
      const entity = await EducationEntity.findOne({
        slug: req.params.slug,
        isActive: true,
        ...schoolUnitTypeFilter(),
      }).lean()

      if (!entity) return err(res, 404, 'Unidade escolar não encontrada')
      return ok(res, 200, { data: serializeSchoolUnit(entity) })
    } catch (error) {
      console.error('[EducationSchoolUnitController.getBySlug]', error)
      return err(res, 500, 'Erro ao carregar unidade escolar')
    }
  }

  /** GET /education/admin/school-units — listagem administrativa */
  static async listAdmin(req, res) {
    try {
      const ctx = req.educationContext
      const { page, limit, skip } = parsePagination(req.query)
      const filter = { ...schoolUnitTypeFilter() }

      if (req.query.type && SCHOOL_UNIT_TYPES.includes(req.query.type)) {
        filter.type = req.query.type
      }
      if (req.query.isActive !== undefined && req.query.isActive !== '') {
        filter.isActive = parseBoolean(req.query.isActive)
      }
      if (req.query.q) {
        const regex = new RegExp(escapeRegex(req.query.q), 'i')
        filter.$or = [
          { name: regex },
          { neighborhood: regex },
          { email: regex },
          { phone: regex },
          { whatsapp: regex },
        ]
      }
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

      return res.json(paginatedResponse(items.map(serializeSchoolUnit), total, page, limit))
    } catch (error) {
      console.error('[EducationSchoolUnitController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar unidades escolares')
    }
  }

  /** GET /education/admin/school-units/:id — detalhe administrativo */
  static async getById(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const entity = await EducationEntity.findOne({ _id: id, ...schoolUnitTypeFilter() }).lean()
      if (!entity) return err(res, 404, 'Unidade escolar não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, id, { action: 'read', entityType: entity.type }) &&
          !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      return ok(res, 200, { data: serializeSchoolUnit(entity) })
    } catch (error) {
      console.error('[EducationSchoolUnitController.getById]', error)
      return err(res, 500, 'Erro ao carregar unidade escolar')
    }
  }

  /** POST /education/admin/school-units — cadastro */
  static async create(req, res) {
    try {
      const type = req.body.type || 'escola'
      const { name } = req.body
      if (!name?.trim()) return err(res, 422, 'Nome da unidade é obrigatório')

      const typeCheck = assertSchoolUnitType(type)
      if (!typeCheck.valid) return err(res, 422, typeCheck.message)
      if (!ENTITY_TYPES.includes(type)) return err(res, 422, 'Tipo de entidade inválido')

      const slug = await uniqueSlug(EducationEntity, req.body.slug || name)

      const entity = new EducationEntity({
        name: name.trim(),
        slug,
        type,
        isActive: parseBoolean(req.body.isActive, true),
        createdBy: req.user.id,
      })

      applySchoolUnitFields(entity, req.body)
      applyUploadedImages(entity, req)

      await entity.save()

      await recordAudit(req, {
        action: 'education.school_unit.create',
        resourceType: 'education_school_unit',
        resourceId: entity._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: serializeSchoolUnit(entity) })
    } catch (error) {
      console.error('[EducationSchoolUnitController.create]', error)
      return err(res, 500, 'Erro ao cadastrar unidade escolar')
    }
  }

  /** PUT /education/admin/school-units/:id — atualização completa */
  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const entity = await EducationEntity.findOne({ _id: id, ...schoolUnitTypeFilter() })
      if (!entity) return err(res, 404, 'Unidade escolar não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, id, { action: 'write', entityType: entity.type })) {
        return err(res, 403, 'Sem permissão para esta unidade')
      }

      if (req.body.type) {
        const typeCheck = assertSchoolUnitType(req.body.type)
        if (!typeCheck.valid) return err(res, 422, typeCheck.message)
        entity.type = req.body.type
      }

      const before = entity.toObject()
      applySchoolUnitFields(entity, req.body)
      applyUploadedImages(entity, req)

      if (req.body.slug) entity.slug = await uniqueSlug(EducationEntity, req.body.slug, id)
      if (req.body.isActive !== undefined) entity.isActive = parseBoolean(req.body.isActive)

      await entity.save()

      await recordChange(req, {
        before,
        after: entity.toObject(),
        resourceType: 'education_school_unit',
        resourceId: entity._id,
        module: 'education',
      })

      return ok(res, 200, { data: serializeSchoolUnit(entity) })
    } catch (error) {
      console.error('[EducationSchoolUnitController.update]', error)
      return err(res, 500, 'Erro ao atualizar unidade escolar')
    }
  }

  /** PATCH /education/admin/school-units/:id/activate */
  static async activate(req, res) {
    return EducationSchoolUnitController.setActive(req, res, true)
  }

  /** PATCH /education/admin/school-units/:id/deactivate */
  static async deactivate(req, res) {
    return EducationSchoolUnitController.setActive(req, res, false)
  }

  static async setActive(req, res, active) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const entity = await EducationEntity.findOne({ _id: id, ...schoolUnitTypeFilter() })
      if (!entity) return err(res, 404, 'Unidade escolar não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, id, { action: 'write', entityType: entity.type }) &&
          !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      entity.isActive = active
      await entity.save()

      await recordAudit(req, {
        action: active ? 'education.school_unit.activate' : 'education.school_unit.deactivate',
        resourceType: 'education_school_unit',
        resourceId: entity._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: serializeSchoolUnit(entity) })
    } catch (error) {
      console.error('[EducationSchoolUnitController.setActive]', error)
      return err(res, 500, 'Erro ao alterar status da unidade')
    }
  }

  /** DELETE /education/admin/school-units/:id */
  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const entity = await EducationEntity.findOne({ _id: id, ...schoolUnitTypeFilter() })
      if (!entity) return err(res, 404, 'Unidade escolar não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, id, { action: 'delete', entityType: entity.type }) &&
          !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      await entity.deleteOne()

      await recordAudit(req, {
        action: 'education.school_unit.delete',
        resourceType: 'education_school_unit',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Unidade escolar removida' })
    } catch (error) {
      console.error('[EducationSchoolUnitController.remove]', error)
      return err(res, 500, 'Erro ao remover unidade escolar')
    }
  }
}
