const ObjectId = require('mongoose').Types.ObjectId

const EducationDocument = require('../models/EducationDocument')
const EducationEntity = require('../models/EducationEntity')
const EducationCalendarEvent = require('../models/EducationCalendarEvent')
const { DOCUMENT_TYPES, DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } = require('../helpers/education-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const { documentPublicUrl } = require('../helpers/education-upload')
const {
  escapeRegex,
  parseBoolean,
  parsePagination,
  paginatedResponse,
  ok,
  err,
} = require('../helpers/education-service')

const TRANSPARENCY_CATEGORIES = new Set([
  'prestacao_contas',
  'aplicacao_recursos',
  'fundeb',
  'alimentacao_escolar',
  'relatorio_institucional',
  'indicador_educacional',
  'documento_publico',
])

function buildDocumentSort(query) {
  const dir = query.sortDir === 'asc' ? 1 : -1
  if (query.sort === 'meetingDate') return { meetingDate: dir, publishedAt: -1 }
  if (query.sort === 'createdAt') return { createdAt: dir }
  return { publishedAt: dir, createdAt: -1 }
}

function applyYearFilter(filter, year) {
  const y = parseInt(year, 10)
  if (!Number.isFinite(y)) return
  filter.$or = [
    { referenceYear: y },
    {
      referenceYear: { $exists: false },
      $or: [
        { publishedAt: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) } },
        { meetingDate: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) } },
      ],
    },
  ]
}

function parseDocumentFields(body, doc = null) {
  const target = doc || {}
  if (body.title !== undefined) target.title = body.title
  if (body.description !== undefined) target.description = body.description
  if (body.documentType && DOCUMENT_TYPES.includes(body.documentType)) {
    target.documentType = body.documentType
  }
  if (body.category && DOCUMENT_CATEGORIES.includes(body.category)) {
    target.category = body.category
  }
  if (body.meetingType === 'ordinaria' || body.meetingType === 'extraordinaria') {
    target.meetingType = body.meetingType
  } else if (body.meetingType === '' || body.meetingType === null) {
    target.meetingType = null
  }
  if (body.meetingDate !== undefined) {
    target.meetingDate = body.meetingDate ? new Date(body.meetingDate) : null
  }
  if (body.sessionNumber !== undefined) target.sessionNumber = body.sessionNumber || ''
  if (body.referenceYear !== undefined && body.referenceYear !== '') {
    target.referenceYear = parseInt(body.referenceYear, 10) || null
  }
  if (body.categoryId !== undefined) {
    target.categoryId = body.categoryId && ObjectId.isValid(body.categoryId) ? body.categoryId : null
  }
  if (body.calendarEventId !== undefined) {
    if (body.calendarEventId === '' || body.calendarEventId === null) {
      target.calendarEventId = null
    } else if (ObjectId.isValid(body.calendarEventId)) {
      target.calendarEventId = body.calendarEventId
    }
  }
  if (body.visibility !== undefined) {
    target.visibility = body.visibility === 'internal' ? 'internal' : 'public'
  }
  return target
}

async function assertDocumentAccess(ctx, doc, action) {
  if (!doc.educationEntityId) {
    return ctx.isGlobalAdmin || ctx.isEducationAdmin
  }
  const entity = await EducationEntity.findById(doc.educationEntityId).select('type')
  return canAccessEntity(ctx, doc.educationEntityId, { action, entityType: entity?.type })
}

async function validateCalendarEventLink(calendarEventId, educationEntityId) {
  if (!calendarEventId) return null
  if (!ObjectId.isValid(calendarEventId)) {
    const err = new Error('INVALID_EVENT')
    throw err
  }
  const event = await EducationCalendarEvent.findById(calendarEventId).select('educationEntityId title')
  if (!event) {
    const err = new Error('EVENT_NOT_FOUND')
    throw err
  }
  if (educationEntityId && event.educationEntityId &&
      String(event.educationEntityId) !== String(educationEntityId)) {
    const err = new Error('EVENT_ENTITY_MISMATCH')
    throw err
  }
  return event
}

module.exports = class EducationDocumentController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 200 })
      const filter = { status: 'published', visibility: 'public' }
      if (req.query.category) filter.category = req.query.category
      if (req.query.documentType) filter.documentType = req.query.documentType
      if (req.query.meetingType) filter.meetingType = req.query.meetingType
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
      if (req.query.categoryId && ObjectId.isValid(req.query.categoryId)) {
        filter.categoryId = req.query.categoryId
      }
      if (req.query.q) {
        filter.$or = [
          { title: new RegExp(escapeRegex(req.query.q), 'i') },
          { description: new RegExp(escapeRegex(req.query.q), 'i') },
          { sessionNumber: new RegExp(escapeRegex(req.query.q), 'i') },
        ]
      }
      if (req.query.year) applyYearFilter(filter, req.query.year)

      const [items, total] = await Promise.all([
        EducationDocument.find(filter)
          .populate('educationEntityId', 'name slug type councilCode')
          .populate('categoryId', 'slug label')
          .sort(buildDocumentSort(req.query))
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationDocument.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationDocumentController.listPublic]', error)
      return err(res, 500, 'Erro ao listar documentos')
    }
  }

  static async listTransparency(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 200 })
      const filter = {
        status: 'published',
        visibility: 'public',
        category: { $in: [...TRANSPARENCY_CATEGORIES] },
      }
      if (req.query.category && TRANSPARENCY_CATEGORIES.has(req.query.category)) {
        filter.category = req.query.category
      }
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({ slug: req.query.entitySlug }).select('_id')
        if (entity) filter.educationEntityId = entity._id
      }
      if (req.query.q) {
        filter.title = new RegExp(escapeRegex(req.query.q), 'i')
      }
      if (req.query.year) applyYearFilter(filter, req.query.year)

      const [items, total] = await Promise.all([
        EducationDocument.find(filter)
          .populate('educationEntityId', 'name slug councilCode')
          .sort(buildDocumentSort(req.query))
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationDocument.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationDocumentController.listTransparency]', error)
      return err(res, 500, 'Erro ao listar transparência')
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const doc = await EducationDocument.findOne({
        _id: id,
        status: 'published',
        visibility: 'public',
      })
        .populate('educationEntityId', 'name slug type councilCode')
        .populate('categoryId', 'slug label')
        .populate('calendarEventId', 'title startDate type')
        .lean()
      if (!doc) return err(res, 404, 'Documento não encontrado')
      return ok(res, 200, { data: doc })
    } catch (error) {
      console.error('[EducationDocumentController.getById]', error)
      return err(res, 500, 'Erro ao carregar documento')
    }
  }

  static async listAdmin(req, res) {
    try {
      const ctx = req.educationContext
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 200 })
      const filter = {}
      if (req.query.category) filter.category = req.query.category
      if (req.query.status) filter.status = req.query.status
      if (req.query.documentType) filter.documentType = req.query.documentType
      if (req.query.entityId && ObjectId.isValid(req.query.entityId)) {
        filter.educationEntityId = req.query.entityId
      }
      if (req.query.year) applyYearFilter(filter, req.query.year)
      if (req.query.q) {
        filter.$or = [
          { title: new RegExp(escapeRegex(req.query.q), 'i') },
          { description: new RegExp(escapeRegex(req.query.q), 'i') },
          { sessionNumber: new RegExp(escapeRegex(req.query.q), 'i') },
        ]
      }

      if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
        const hasSecretary = ctx.assignments?.some((a) => a.role === 'education_secretary')
        if (!hasSecretary) {
          const ids = (ctx.assignments || [])
            .filter((a) => a.educationEntityId)
            .map((a) => a.educationEntityId)
          filter.educationEntityId = filter.educationEntityId
            ? filter.educationEntityId
            : { $in: ids }
        }
      }

      const [items, total] = await Promise.all([
        EducationDocument.find(filter)
          .populate('educationEntityId', 'name slug councilCode')
          .populate('categoryId', 'slug label')
          .populate('calendarEventId', 'title startDate type')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationDocument.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationDocumentController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar documentos')
    }
  }

  static async create(req, res) {
    try {
      const { title, documentType, educationEntityId } = req.body
      if (!title || !documentType) return err(res, 422, 'Título e tipo são obrigatórios')
      if (!DOCUMENT_TYPES.includes(documentType)) return err(res, 422, 'Tipo de documento inválido')

      const ctx = req.educationContext
      let entity = null
      if (educationEntityId) {
        if (!ObjectId.isValid(educationEntityId)) return err(res, 422, 'ID da entidade inválido')
        entity = await EducationEntity.findById(educationEntityId).select('type')
        if (!entity) return err(res, 404, 'Entidade não encontrada')
        if (!canAccessEntity(ctx, educationEntityId, { action: 'create', entityType: entity.type })) {
          return err(res, 403, 'Sem permissão para esta unidade')
        }
      } else if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
        const hasSecretary = ctx.assignments?.some((a) => a.role === 'education_secretary')
        if (!hasSecretary) return err(res, 403, 'Sem permissão')
      }

      let fileUrl = req.body.fileUrl || ''
      let fileType = ''
      let fileSize = 0
      if (req.file) {
        fileUrl = documentPublicUrl(req.file.filename)
        fileType = req.file.mimetype
        fileSize = req.file.size
      }
      if (!fileUrl) return err(res, 422, 'Arquivo é obrigatório')

      let calendarEventId = null
      if (req.body.calendarEventId) {
        try {
          await validateCalendarEventLink(req.body.calendarEventId, educationEntityId || null)
          calendarEventId = req.body.calendarEventId
        } catch (e) {
          if (e.message === 'INVALID_EVENT') return err(res, 422, 'ID do evento inválido')
          if (e.message === 'EVENT_NOT_FOUND') return err(res, 422, 'Evento do calendário não encontrado')
          if (e.message === 'EVENT_ENTITY_MISMATCH') return err(res, 422, 'Evento não pertence a este conselho')
          throw e
        }
      }

      const wantsPublish = req.body.status === 'published' || parseBoolean(req.body.publish)
      const canPublish = ctx.isGlobalAdmin || ctx.isEducationAdmin ||
        ctx.assignments?.some((a) => a.role === 'education_secretary' || a.role === 'education_admin') ||
        (educationEntityId && canAccessEntity(ctx, educationEntityId, {
          action: 'write',
          entityType: entity?.type,
        }))
      const status = wantsPublish && canPublish ? 'published' : 'draft'

      const payload = parseDocumentFields(req.body, {
        educationEntityId: educationEntityId || null,
        title,
        documentType,
        fileUrl,
        fileType,
        fileSize,
        calendarEventId,
        status,
        visibility: 'public',
        publishedAt: status === 'published' ? new Date() : null,
        approvedBy: status === 'published' ? req.user.id : null,
        createdBy: req.user.id,
      })

      const doc = await EducationDocument.create(payload)

      await recordAudit(req, {
        action: status === 'published' ? 'education.document.publish' : 'education.document.create',
        resourceType: 'education_document',
        resourceId: doc._id,
        module: 'education',
        eventType: status === 'published' ? 'APPROVE' : 'CREATE',
      })

      return ok(res, 201, { data: doc })
    } catch (error) {
      console.error('[EducationDocumentController.create]', error)
      return err(res, 500, 'Erro ao criar documento')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const doc = await EducationDocument.findById(id)
      if (!doc) return err(res, 404, 'Documento não encontrado')

      if (!(await assertDocumentAccess(req.educationContext, doc, 'write'))) {
        return err(res, 403, 'Sem permissão')
      }

      const before = doc.toObject()
      if (req.body.calendarEventId !== undefined) {
        try {
          await validateCalendarEventLink(
            req.body.calendarEventId || null,
            doc.educationEntityId || req.body.educationEntityId || null
          )
        } catch (e) {
          if (e.message === 'INVALID_EVENT') return err(res, 422, 'ID do evento inválido')
          if (e.message === 'EVENT_NOT_FOUND') return err(res, 422, 'Evento do calendário não encontrado')
          if (e.message === 'EVENT_ENTITY_MISMATCH') return err(res, 422, 'Evento não pertence a este conselho')
          throw e
        }
      }
      parseDocumentFields(req.body, doc)
      if (req.body.status && DOCUMENT_STATUSES.includes(req.body.status)) {
        doc.status = req.body.status
        if (req.body.status === 'published' && !doc.publishedAt) doc.publishedAt = new Date()
        if (req.body.status === 'archived') doc.archivedAt = new Date()
      }
      if (req.file) {
        doc.previousVersions = doc.previousVersions || []
        doc.previousVersions.push({
          fileUrl: doc.fileUrl,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          version: doc.version || 1,
          replacedAt: new Date(),
        })
        doc.version = (doc.version || 1) + 1
        doc.fileUrl = documentPublicUrl(req.file.filename)
        doc.fileType = req.file.mimetype
        doc.fileSize = req.file.size
      }

      await doc.save()
      await recordChange(req, {
        before,
        after: doc.toObject(),
        resourceType: 'education_document',
        resourceId: doc._id,
        module: 'education',
      })

      return ok(res, 200, { data: doc })
    } catch (error) {
      console.error('[EducationDocumentController.update]', error)
      return err(res, 500, 'Erro ao atualizar documento')
    }
  }

  static async publish(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const doc = await EducationDocument.findById(id)
      if (!doc) return err(res, 404, 'Documento não encontrado')
      if (!(await assertDocumentAccess(req.educationContext, doc, 'write'))) {
        return err(res, 403, 'Sem permissão')
      }

      const ctx = req.educationContext
      const canApprove = ctx.isGlobalAdmin || ctx.isEducationAdmin ||
        ctx.assignments?.some((a) => a.role === 'education_secretary' || a.role === 'education_admin')

      if (!canApprove && doc.status === 'pending_review') {
        return err(res, 403, 'Aguardando aprovação da Secretaria')
      }

      doc.status = 'published'
      doc.publishedAt = new Date()
      doc.archivedAt = null
      doc.approvedBy = req.user.id
      await doc.save()

      await recordAudit(req, {
        action: 'education.document.publish',
        resourceType: 'education_document',
        resourceId: doc._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: doc })
    } catch (error) {
      console.error('[EducationDocumentController.publish]', error)
      return err(res, 500, 'Erro ao publicar documento')
    }
  }

  static async archive(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const doc = await EducationDocument.findById(id)
      if (!doc) return err(res, 404, 'Documento não encontrado')
      if (!(await assertDocumentAccess(req.educationContext, doc, 'write'))) {
        return err(res, 403, 'Sem permissão')
      }

      doc.status = 'archived'
      doc.archivedAt = new Date()
      await doc.save()

      await recordAudit(req, {
        action: 'education.document.archive',
        resourceType: 'education_document',
        resourceId: doc._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: doc })
    } catch (error) {
      console.error('[EducationDocumentController.archive]', error)
      return err(res, 500, 'Erro ao arquivar documento')
    }
  }

  static async submitReview(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const doc = await EducationDocument.findById(id)
      if (!doc) return err(res, 404, 'Documento não encontrado')
      if (!(await assertDocumentAccess(req.educationContext, doc, 'write'))) {
        return err(res, 403, 'Sem permissão')
      }
      if (doc.status !== 'draft') {
        return err(res, 422, 'Somente rascunhos podem ser enviados para revisão')
      }

      doc.status = 'pending_review'
      doc.submittedAt = new Date()
      await doc.save()

      await recordAudit(req, {
        action: 'education.document.submit_review',
        resourceType: 'education_document',
        resourceId: doc._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: doc })
    } catch (error) {
      console.error('[EducationDocumentController.submitReview]', error)
      return err(res, 500, 'Erro ao enviar para revisão')
    }
  }

  static async rejectReview(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const doc = await EducationDocument.findById(id)
      if (!doc) return err(res, 404, 'Documento não encontrado')

      const ctx = req.educationContext
      const canApprove = ctx.isGlobalAdmin || ctx.isEducationAdmin ||
        ctx.assignments?.some((a) => a.role === 'education_secretary' || a.role === 'education_admin')
      if (!canApprove) return err(res, 403, 'Sem permissão para rejeitar revisão')
      if (!(await assertDocumentAccess(ctx, doc, 'write'))) {
        return err(res, 403, 'Sem permissão')
      }
      if (doc.status !== 'pending_review') {
        return err(res, 422, 'Documento não está em revisão')
      }

      doc.status = 'draft'
      doc.submittedAt = null
      await doc.save()

      await recordAudit(req, {
        action: 'education.document.reject_review',
        resourceType: 'education_document',
        resourceId: doc._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: doc })
    } catch (error) {
      console.error('[EducationDocumentController.rejectReview]', error)
      return err(res, 500, 'Erro ao devolver revisão')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const doc = await EducationDocument.findById(id)
      if (!doc) return err(res, 404, 'Documento não encontrado')

      if (!(await assertDocumentAccess(req.educationContext, doc, 'delete'))) {
        return err(res, 403, 'Sem permissão')
      }

      await doc.deleteOne()
      await recordAudit(req, {
        action: 'education.document.delete',
        resourceType: 'education_document',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Documento removido' })
    } catch (error) {
      console.error('[EducationDocumentController.remove]', error)
      return err(res, 500, 'Erro ao remover documento')
    }
  }
}
