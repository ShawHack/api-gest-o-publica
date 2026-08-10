const ObjectId = require('mongoose').Types.ObjectId

const EducationCalendarEvent = require('../models/EducationCalendarEvent')
const EducationEntity = require('../models/EducationEntity')
const {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_STATUSES,
} = require('../helpers/education-constants')
const {
  applyCalendarEventFields,
  serializeCalendarEvent,
  expandEventsForRange,
  validateCalendarEventPayload,
  splitDateTime,
  combineDateAndTime,
  resolveDateSlots,
  getColorForType,
} = require('../helpers/calendar-event-fields')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const { documentPublicUrl } = require('../helpers/education-upload')
const {
  parseBoolean,
  parsePagination,
  paginatedResponse,
  ok,
  err,
} = require('../helpers/education-service')

function getUploadedAttachments(req) {
  const files = []
  if (req.file) files.push(req.file)
  if (Array.isArray(req.files)) files.push(...req.files)
  else if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      if (Array.isArray(req.files[key])) files.push(...req.files[key])
    }
  }
  return files
    .filter((f) => f?.filename)
    .map((f) => ({
      filename: f.filename,
      url: documentPublicUrl(f.filename),
      originalName: f.originalname || f.filename,
      mimeType: f.mimetype || '',
      size: f.size || 0,
      uploadedAt: new Date(),
    }))
}

function buildPeriodFilter(query = {}) {
  const filter = {}
  let rangeStart = null
  let rangeEnd = null

  if (query.fromDate) {
    rangeStart = new Date(query.fromDate)
    if (Number.isNaN(rangeStart.getTime())) rangeStart = null
    else rangeStart.setHours(0, 0, 0, 0)
  }
  if (query.toDate) {
    rangeEnd = new Date(query.toDate)
    if (Number.isNaN(rangeEnd.getTime())) rangeEnd = null
    else rangeEnd.setHours(23, 59, 59, 999)
  }
  if (query.month && query.year && !rangeStart && !rangeEnd) {
    const month = parseInt(query.month, 10) - 1
    const year = parseInt(query.year, 10)
    rangeStart = new Date(year, month, 1)
    rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  }

  if (rangeStart && rangeEnd) {
    filter.$or = [
      { startDate: { $lte: rangeEnd }, endDate: { $gte: rangeStart } },
      { startDate: { $gte: rangeStart, $lte: rangeEnd }, endDate: null },
    ]
  } else if (rangeStart) {
    filter.endDate = { $gte: rangeStart }
  } else if (rangeEnd) {
    filter.startDate = { $lte: rangeEnd }
  }

  if (parseBoolean(query.upcoming)) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    filter.startDate = { $gte: start }
    filter.status = 'active'
  }
  return filter
}

async function assertEntityAccess(ctx, educationEntityId, action = 'read') {
  if (!educationEntityId) {
    if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
      const hasSecretary = ctx.assignments?.some((a) => a.role === 'education_secretary')
      if (!hasSecretary) return { ok: false, status: 403, message: 'Sem permissão' }
    }
    return { ok: true }
  }
  if (!ObjectId.isValid(educationEntityId)) {
    return { ok: false, status: 422, message: 'ID da unidade inválido' }
  }
  const entity = await EducationEntity.findById(educationEntityId).select('type')
  if (!entity) return { ok: false, status: 404, message: 'Unidade não encontrada' }
  if (!canAccessEntity(ctx, educationEntityId, { action, entityType: entity.type })) {
    return { ok: false, status: 403, message: 'Sem permissão para esta unidade' }
  }
  return { ok: true, entity }
}

function applyAdminScopeFilter(ctx, filter) {
  if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
    const hasSecretary = ctx.assignments?.some((a) => a.role === 'education_secretary')
    if (!hasSecretary) {
      const ids = (ctx.assignments || [])
        .filter((a) => a.educationEntityId)
        .map((a) => a.educationEntityId)
      filter.$or = [{ educationEntityId: { $in: ids } }, { educationEntityId: null }]
    }
  }
  return filter
}

module.exports = class EducationCalendarController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 })
      const filter = {
        isPublic: true,
        status: { $nin: ['inactive'] },
        ...buildPeriodFilter(req.query),
      }

      if (req.query.type && CALENDAR_EVENT_TYPES.includes(req.query.type)) {
        filter.type = req.query.type
      }
      if (req.query.status && CALENDAR_EVENT_STATUSES.includes(req.query.status)) {
        filter.status = req.query.status
      }
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({ slug: req.query.entitySlug, isActive: true }).select('_id')
        if (!entity) {
          return res.json(paginatedResponse([], 0, page, limit))
        }
        filter.educationEntityId = entity._id
      }
      if (req.query.entityId && ObjectId.isValid(req.query.entityId)) {
        filter.educationEntityId = req.query.entityId
      }

      const [items, total] = await Promise.all([
        EducationCalendarEvent.find(filter)
          .populate('educationEntityId', 'name slug type color')
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationCalendarEvent.countDocuments(filter),
      ])

      let data = items.map(serializeCalendarEvent)
      if (parseBoolean(req.query.expandRecurrence) && (req.query.fromDate || req.query.month)) {
        const from = req.query.fromDate
          ? new Date(req.query.fromDate)
          : new Date(parseInt(req.query.year, 10), parseInt(req.query.month, 10) - 1, 1)
        const to = req.query.toDate
          ? new Date(req.query.toDate)
          : new Date(parseInt(req.query.year, 10), parseInt(req.query.month, 10), 0, 23, 59, 59, 999)
        data = expandEventsForRange(items, from, to)
      }

      return res.json(paginatedResponse(data, parseBoolean(req.query.expandRecurrence) ? data.length : total, page, limit))
    } catch (error) {
      console.error('[EducationCalendarController.listPublic]', error)
      return err(res, 500, 'Erro ao listar calendário')
    }
  }

  static async getByIdPublic(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const event = await EducationCalendarEvent.findOne({
        _id: id,
        isPublic: true,
        status: { $ne: 'cancelled' },
      })
        .populate('educationEntityId', 'name slug type')
        .lean()

      if (!event) return err(res, 404, 'Evento não encontrado')
      return ok(res, 200, { data: serializeCalendarEvent(event) })
    } catch (error) {
      console.error('[EducationCalendarController.getByIdPublic]', error)
      return err(res, 500, 'Erro ao carregar evento')
    }
  }

  static async listAdmin(req, res) {
    try {
      const ctx = req.educationContext
      const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 500 })
      const filter = applyAdminScopeFilter(ctx, { ...buildPeriodFilter(req.query) })

      if (req.query.type && CALENDAR_EVENT_TYPES.includes(req.query.type)) {
        filter.type = req.query.type
      }
      if (req.query.status && CALENDAR_EVENT_STATUSES.includes(req.query.status)) {
        filter.status = req.query.status
      }
      if (req.query.entityId && ObjectId.isValid(req.query.entityId)) {
        filter.educationEntityId = req.query.entityId
      }

      const [items, total] = await Promise.all([
        EducationCalendarEvent.find(filter)
          .populate('educationEntityId', 'name slug type')
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationCalendarEvent.countDocuments(filter),
      ])

      let data = items.map(serializeCalendarEvent)
      if (parseBoolean(req.query.expandRecurrence) && (req.query.fromDate || req.query.month)) {
        const from = req.query.fromDate
          ? new Date(req.query.fromDate)
          : new Date(parseInt(req.query.year, 10), parseInt(req.query.month, 10) - 1, 1)
        const to = req.query.toDate
          ? new Date(req.query.toDate)
          : new Date(parseInt(req.query.year, 10), parseInt(req.query.month, 10), 0, 23, 59, 59, 999)
        data = expandEventsForRange(items, from, to)
      }

      return res.json(paginatedResponse(data, parseBoolean(req.query.expandRecurrence) ? data.length : total, page, limit))
    } catch (error) {
      console.error('[EducationCalendarController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar calendário')
    }
  }

  static async getByIdAdmin(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const event = await EducationCalendarEvent.findById(id)
        .populate('educationEntityId', 'name slug type')
      if (!event) return err(res, 404, 'Evento não encontrado')

      const ctx = req.educationContext
      const access = await assertEntityAccess(ctx, event.educationEntityId, 'read')
      if (!access.ok) return err(res, access.status, access.message)

      return ok(res, 200, { data: serializeCalendarEvent(event) })
    } catch (error) {
      console.error('[EducationCalendarController.getByIdAdmin]', error)
      return err(res, 500, 'Erro ao carregar evento')
    }
  }

  static async upcomingNotifications(req, res) {
    try {
      const ctx = req.educationContext
      const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 7))
      const now = new Date()
      const until = new Date()
      until.setDate(until.getDate() + days)
      until.setHours(23, 59, 59, 999)

      const filter = applyAdminScopeFilter(ctx, {
        status: 'active',
        startDate: { $gte: now, $lte: until },
      })

      const items = await EducationCalendarEvent.find(filter)
        .populate('educationEntityId', 'name slug')
        .sort({ startDate: 1 })
        .limit(50)
        .lean()

      const data = items.map((event) => {
        const serialized = serializeCalendarEvent(event)
        const msUntil = new Date(event.startDate).getTime() - now.getTime()
        const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24))
        return {
          ...serialized,
          daysUntil,
          shouldNotify: daysUntil <= (event.notifyBeforeDays ?? 1),
        }
      }).filter((event) => event.shouldNotify)

      return ok(res, 200, { data, days })
    } catch (error) {
      console.error('[EducationCalendarController.upcomingNotifications]', error)
      return err(res, 500, 'Erro ao listar notificações')
    }
  }

  static async create(req, res) {
    try {
      const validationErrors = validateCalendarEventPayload(req.body)
      if (validationErrors.length) return err(res, 422, validationErrors.join('; '))

      const { type, educationEntityId } = req.body
      if (!CALENDAR_EVENT_TYPES.includes(type)) return err(res, 422, 'Tipo de evento inválido')

      const ctx = req.educationContext
      const access = await assertEntityAccess(ctx, educationEntityId, 'create')
      if (!access.ok) return err(res, access.status, access.message)

      const event = new EducationCalendarEvent({
        educationEntityId,
        type,
        createdBy: req.user.id,
        isPublic: parseBoolean(req.body.isPublic, true),
        status: CALENDAR_EVENT_STATUSES.includes(req.body.status) ? req.body.status : 'active',
      })

      applyCalendarEventFields(event, req.body)
      const uploaded = getUploadedAttachments(req)
      if (uploaded.length) event.attachments = uploaded

      await event.save()

      await recordAudit(req, {
        action: 'education.calendar.create',
        resourceType: 'education_calendar_event',
        resourceId: event._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: serializeCalendarEvent(event) })
    } catch (error) {
      console.error('[EducationCalendarController.create]', error)
      return err(res, 500, 'Erro ao criar evento')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const event = await EducationCalendarEvent.findById(id)
      if (!event) return err(res, 404, 'Evento não encontrado')

      const ctx = req.educationContext
      const access = await assertEntityAccess(ctx, event.educationEntityId, 'write')
      if (!access.ok) return err(res, access.status, access.message)

      const validationErrors = validateCalendarEventPayload(req.body, { isUpdate: true })
      if (validationErrors.length) return err(res, 422, validationErrors.join('; '))

      if (req.body.educationEntityId && ObjectId.isValid(req.body.educationEntityId)) {
        const newAccess = await assertEntityAccess(ctx, req.body.educationEntityId, 'write')
        if (!newAccess.ok) return err(res, newAccess.status, newAccess.message)
        event.educationEntityId = req.body.educationEntityId
      }

      const before = event.toObject()
      applyCalendarEventFields(event, req.body)

      if (req.body.type && CALENDAR_EVENT_TYPES.includes(req.body.type)) {
        event.type = req.body.type
      }
      if (req.body.isPublic !== undefined) event.isPublic = parseBoolean(req.body.isPublic)

      const uploaded = getUploadedAttachments(req)
      if (uploaded.length) {
        event.attachments = [...(event.attachments || []), ...uploaded]
      }
      if (req.body.removeAttachments) {
        let removeList = req.body.removeAttachments
        if (typeof removeList === 'string') {
          try { removeList = JSON.parse(removeList) } catch { removeList = [removeList] }
        }
        if (Array.isArray(removeList)) {
          event.attachments = (event.attachments || []).filter((a) => !removeList.includes(a.filename))
        }
      }

      await event.save()
      await recordChange(req, {
        before,
        after: event.toObject(),
        resourceType: 'education_calendar_event',
        resourceId: event._id,
        module: 'education',
      })

      return ok(res, 200, { data: serializeCalendarEvent(event) })
    } catch (error) {
      console.error('[EducationCalendarController.update]', error)
      return err(res, 500, 'Erro ao atualizar evento')
    }
  }

  static async duplicate(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const source = await EducationCalendarEvent.findById(id).lean()
      if (!source) return err(res, 404, 'Evento não encontrado')

      const ctx = req.educationContext
      const access = await assertEntityAccess(ctx, source.educationEntityId, 'create')
      if (!access.ok) return err(res, access.status, access.message)

      const copy = new EducationCalendarEvent({
        educationEntityId: source.educationEntityId,
        title: `${source.title} (cópia)`,
        description: source.description,
        type: source.type,
        location: source.location,
        responsible: source.responsible,
        dateSlots: resolveDateSlots(source),
        color: source.color || getColorForType(source.type),
        notifyBeforeDays: source.notifyBeforeDays,
        isPublic: source.isPublic,
        status: 'active',
        duplicatedFrom: source._id,
        createdBy: req.user.id,
        attachments: [],
      })

      const body = req.body || {}
      if (body.startDateOnly) {
        applyCalendarEventFields(copy, body)
      } else {
        const start = splitDateTime(source.startDate)
        const end = splitDateTime(source.endDate || source.startDate)
        copy.startDateOnly = start.dateOnly
        copy.startTime = start.time
        copy.endDateOnly = end.dateOnly
        copy.endTime = end.time
        copy.startDate = combineDateAndTime(start.dateOnly, start.time)
        copy.endDate = combineDateAndTime(end.dateOnly, end.time)
      }

      await copy.save()

      await recordAudit(req, {
        action: 'education.calendar.duplicate',
        resourceType: 'education_calendar_event',
        resourceId: copy._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: serializeCalendarEvent(copy) })
    } catch (error) {
      console.error('[EducationCalendarController.duplicate]', error)
      return err(res, 500, 'Erro ao duplicar evento')
    }
  }

  static async cancel(req, res) {
    return EducationCalendarController.setStatus(req, res, 'cancelled')
  }

  static async complete(req, res) {
    return EducationCalendarController.setStatus(req, res, 'completed')
  }

  static async activate(req, res) {
    return EducationCalendarController.setStatus(req, res, 'active')
  }

  static async deactivate(req, res) {
    return EducationCalendarController.setStatus(req, res, 'inactive')
  }

  static async reactivate(req, res) {
    return EducationCalendarController.setStatus(req, res, 'active')
  }

  static async setStatus(req, res, status) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const event = await EducationCalendarEvent.findById(id)
      if (!event) return err(res, 404, 'Evento não encontrado')

      const ctx = req.educationContext
      const access = await assertEntityAccess(ctx, event.educationEntityId, 'write')
      if (!access.ok) return err(res, access.status, access.message)

      event.status = status
      event.cancelledAt = status === 'cancelled' ? new Date() : null
      event.completedAt = status === 'completed' ? new Date() : null
      if (status === 'active' || status === 'in_progress') {
        event.cancelledAt = null
        event.completedAt = null
      }
      await event.save()

      await recordAudit(req, {
        action: `education.calendar.${status}`,
        resourceType: 'education_calendar_event',
        resourceId: event._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: serializeCalendarEvent(event) })
    } catch (error) {
      console.error('[EducationCalendarController.setStatus]', error)
      return err(res, 500, 'Erro ao alterar status do evento')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const event = await EducationCalendarEvent.findById(id)
      if (!event) return err(res, 404, 'Evento não encontrado')

      const ctx = req.educationContext
      const access = await assertEntityAccess(ctx, event.educationEntityId, 'delete')
      if (!access.ok && !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, access.status, access.message)
      }

      await event.deleteOne()
      await recordAudit(req, {
        action: 'education.calendar.delete',
        resourceType: 'education_calendar_event',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Evento removido' })
    } catch (error) {
      console.error('[EducationCalendarController.remove]', error)
      return err(res, 500, 'Erro ao remover evento')
    }
  }
}
