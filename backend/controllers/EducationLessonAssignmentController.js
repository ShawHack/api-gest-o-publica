const ObjectId = require('mongoose').Types.ObjectId

const EducationLessonAssignment = require('../models/EducationLessonAssignment')
const EducationEntity = require('../models/EducationEntity')
const {
  LESSON_ASSIGNMENT_PROCESS_STATUSES,
  LESSON_ASSIGNMENT_PUBLICATION_STATUSES,
  LESSON_ASSIGNMENT_CATEGORIES,
  LESSON_TEACHER_TYPES,
  LESSON_VACANCY_STATUSES,
  LESSON_DOCUMENT_TYPES,
} = require('../helpers/education-constants')
const { combineDateAndTime } = require('../helpers/calendar-event-fields')
const { documentPublicUrl } = require('../helpers/education-upload')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const {
  escapeRegex,
  parseBoolean,
  parsePagination,
  paginatedResponse,
  ok,
  err,
  canManageModule,
  applyLessonAssignmentAdminScope,
  canAccessLessonAssignment,
  canManageLessonAssignments,
  collectLessonAssignmentEntityIds,
} = require('../helpers/education-service')

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function getUploadedFiles(req) {
  const files = []
  if (req.file) files.push(req.file)
  if (Array.isArray(req.files)) files.push(...req.files)
  else if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      if (Array.isArray(req.files[key])) files.push(...req.files[key])
    }
  }
  return files.filter((f) => f?.filename)
}

function normalizeTeachers(raw = []) {
  const list = parseJsonField(raw, [])
  if (!Array.isArray(list)) return []
  return list
    .map((t) => ({
      name: String(t.name || '').trim(),
      registration: String(t.registration || '').trim(),
      teacherType: LESSON_TEACHER_TYPES.includes(t.teacherType) ? t.teacherType : 'selecionado',
      educationEntityId: t.educationEntityId && ObjectId.isValid(t.educationEntityId)
        ? t.educationEntityId
        : null,
      subject: String(t.subject || '').trim(),
      position: String(t.position || '').trim(),
      notes: String(t.notes || '').trim(),
      _id: t._id && ObjectId.isValid(t._id) ? t._id : undefined,
    }))
    .filter((t) => t.name)
}

function normalizeVacancies(raw = []) {
  const list = parseJsonField(raw, [])
  if (!Array.isArray(list)) return []
  return list
    .map((v) => ({
      educationEntityId: v.educationEntityId && ObjectId.isValid(v.educationEntityId)
        ? v.educationEntityId
        : null,
      position: String(v.position || '').trim(),
      subject: String(v.subject || '').trim(),
      workload: String(v.workload || '').trim(),
      period: String(v.period || '').trim(),
      classCount: Math.max(0, parseInt(v.classCount, 10) || 0),
      vacancyStatus: LESSON_VACANCY_STATUSES.includes(v.vacancyStatus) ? v.vacancyStatus : 'disponivel',
      _id: v._id && ObjectId.isValid(v._id) ? v._id : undefined,
    }))
    .filter((v) => v.educationEntityId && v.position && v.subject)
}

function buildDocumentsFromRequest(req, existing = []) {
  const meta = parseJsonField(req.body.documentsMeta, [])
  const keep = parseJsonField(req.body.existingDocuments, existing)
  const kept = Array.isArray(keep) ? keep.filter((d) => d.fileUrl) : []

  const uploaded = getUploadedFiles(req)
  const newDocs = uploaded.map((file, index) => {
    const info = meta[index] || {}
    return {
      title: String(info.title || file.originalname || 'Documento').trim(),
      documentType: LESSON_DOCUMENT_TYPES.includes(info.documentType) ? info.documentType : 'outro',
      fileUrl: documentPublicUrl(file.filename),
      originalName: file.originalname || file.filename,
    }
  })

  return [...kept, ...newDocs]
}

function applySort(query = {}) {
  const sortBy = query.sortBy || 'date'
  if (sortBy === 'unit') {
    return { title: 1, assignmentDate: 1 }
  }
  return { assignmentDate: 1, title: 1 }
}

function buildPublicFilter(query = {}) {
  const filter = { publicationStatus: 'published' }

  if (query.processStatus && LESSON_ASSIGNMENT_PROCESS_STATUSES.includes(query.processStatus)) {
    filter.processStatus = query.processStatus
  }
  if (query.category && LESSON_ASSIGNMENT_CATEGORIES.includes(query.category)) {
    filter.category = query.category
  }
  if (query.entityId && ObjectId.isValid(query.entityId)) {
    filter.$or = [
      { 'vacancies.educationEntityId': query.entityId },
      { 'teachers.educationEntityId': query.entityId },
    ]
  }
  if (query.subject) {
    const re = new RegExp(escapeRegex(query.subject), 'i')
    filter.$or = filter.$or || []
    filter.$or.push({ 'vacancies.subject': re }, { 'teachers.subject': re })
  }
  if (query.period) {
    filter.period = new RegExp(escapeRegex(query.period), 'i')
  }
  if (query.fromDate) {
    const from = new Date(query.fromDate)
    if (!Number.isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0)
      filter.assignmentDate = { ...(filter.assignmentDate || {}), $gte: from }
    }
  }
  if (query.toDate) {
    const to = new Date(query.toDate)
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999)
      filter.assignmentDate = { ...(filter.assignmentDate || {}), $lte: to }
    }
  }
  if (parseBoolean(query.upcoming)) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    filter.assignmentDate = { $gte: start }
    filter.processStatus = { $in: ['aberta', 'em_andamento'] }
  }
  if (query.q) {
    const re = new RegExp(escapeRegex(query.q), 'i')
    const searchOr = [
      { title: re },
      { description: re },
      { observations: re },
      { location: re },
      { period: re },
      { 'teachers.name': re },
      { 'teachers.subject': re },
      { 'teachers.position': re },
      { 'vacancies.subject': re },
      { 'vacancies.position': re },
    ]
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }]
      delete filter.$or
    } else {
      filter.$or = searchOr
    }
  }

  return filter
}

function populateAssignment(query) {
  return query
    .populate('teachers.educationEntityId', 'name slug type')
    .populate('vacancies.educationEntityId', 'name slug type')
}

module.exports = class EducationLessonAssignmentController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 })
      const filter = buildPublicFilter(req.query)
      const sort = applySort(req.query)

      const [items, total] = await Promise.all([
        populateAssignment(
          EducationLessonAssignment.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
        ).lean(),
        EducationLessonAssignment.countDocuments(filter),
      ])

      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationLessonAssignmentController.listPublic]', error)
      return err(res, 500, 'Erro ao listar atribuições de aulas')
    }
  }

  static async listUpcoming(req, res) {
    try {
      const limit = Math.min(12, Math.max(1, parseInt(req.query.limit, 10) || 6))
      const start = new Date()
      start.setHours(0, 0, 0, 0)

      const items = await populateAssignment(
        EducationLessonAssignment.find({
          publicationStatus: 'published',
          processStatus: { $in: ['aberta', 'em_andamento'] },
          assignmentDate: { $gte: start },
        })
          .sort({ assignmentDate: 1 })
          .limit(limit)
      ).lean()

      return ok(res, 200, { data: items })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.listUpcoming]', error)
      return err(res, 500, 'Erro ao listar próximas atribuições')
    }
  }

  static async getByIdPublic(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await populateAssignment(
        EducationLessonAssignment.findOne({ _id: id, publicationStatus: 'published' })
      ).lean()

      if (!item) return err(res, 404, 'Atribuição não encontrada')
      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.getByIdPublic]', error)
      return err(res, 500, 'Erro ao carregar atribuição')
    }
  }

  static async listAdmin(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 })
      const filter = {}

      if (req.query.publicationStatus && LESSON_ASSIGNMENT_PUBLICATION_STATUSES.includes(req.query.publicationStatus)) {
        filter.publicationStatus = req.query.publicationStatus
      }
      if (req.query.processStatus && LESSON_ASSIGNMENT_PROCESS_STATUSES.includes(req.query.processStatus)) {
        filter.processStatus = req.query.processStatus
      }
      if (req.query.category && LESSON_ASSIGNMENT_CATEGORIES.includes(req.query.category)) {
        filter.category = req.query.category
      }
      if (req.query.entityId && ObjectId.isValid(req.query.entityId)) {
        filter.$or = [
          { 'vacancies.educationEntityId': req.query.entityId },
          { 'teachers.educationEntityId': req.query.entityId },
        ]
      }
      if (req.query.q) {
        const re = new RegExp(escapeRegex(req.query.q), 'i')
        filter.$or = [
          { title: re },
          { description: re },
          { 'teachers.name': re },
          { 'vacancies.subject': re },
          { 'vacancies.position': re },
        ]
      }

      applyLessonAssignmentAdminScope(req.educationContext, filter)

      const sort = applySort(req.query)

      const [items, total] = await Promise.all([
        populateAssignment(
          EducationLessonAssignment.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
        ).lean(),
        EducationLessonAssignment.countDocuments(filter),
      ])

      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationLessonAssignmentController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar atribuições')
    }
  }

  static async getByIdAdmin(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await populateAssignment(
        EducationLessonAssignment.findById(id)
      ).lean()

      if (!item) return err(res, 404, 'Atribuição não encontrada')
      if (!canAccessLessonAssignment(req.educationContext, item, 'read')) {
        return err(res, 403, 'Sem permissão')
      }
      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.getByIdAdmin]', error)
      return err(res, 500, 'Erro ao carregar atribuição')
    }
  }

  static async create(req, res) {
    try {
      const ctx = req.educationContext
      if (!canManageLessonAssignments(ctx)) {
        return err(res, 403, 'Sem permissão')
      }

      const { title, description, category, processStatus, assignmentDateOnly, assignmentTime, assignmentEndTime, location, observations, period, showEffectiveTeachers } = req.body

      if (!title?.trim()) return err(res, 422, 'Título é obrigatório')
      if (category && !LESSON_ASSIGNMENT_CATEGORIES.includes(category)) {
        return err(res, 422, 'Categoria inválida')
      }

      const teachers = normalizeTeachers(req.body.teachers)
      const vacancies = normalizeVacancies(req.body.vacancies)
      const documents = buildDocumentsFromRequest(req, [])

      if (!canManageModule(ctx)) {
        const entityIds = collectLessonAssignmentEntityIds({ teachers, vacancies })
        if (!entityIds.length) {
          return err(res, 422, 'Informe pelo menos uma unidade vinculada à atribuição')
        }
        if (!canAccessLessonAssignment(ctx, { teachers, vacancies }, 'write')) {
          return err(res, 403, 'Sem permissão para estas unidades')
        }
      }

      const assignmentDate = assignmentDateOnly
        ? combineDateAndTime(assignmentDateOnly, assignmentTime || '08:00')
        : null

      const item = await EducationLessonAssignment.create({
        title: title.trim(),
        description: description || '',
        category: category || 'atribuicao_anual',
        processStatus: LESSON_ASSIGNMENT_PROCESS_STATUSES.includes(processStatus) ? processStatus : 'aberta',
        publicationStatus: 'draft',
        assignmentDate,
        assignmentDateOnly: assignmentDateOnly || '',
        assignmentTime: assignmentTime || '',
        assignmentEndTime: assignmentEndTime || '',
        location: location || '',
        observations: observations || '',
        period: period || '',
        showEffectiveTeachers: parseBoolean(showEffectiveTeachers),
        teachers,
        vacancies,
        documents,
        createdBy: req.user?.id,
      })

      await recordAudit(req, {
        action: 'education.lesson_assignment.create',
        resourceType: 'education_lesson_assignment',
        resourceId: item._id,
        module: 'education',
        eventType: 'CREATE',
      })

      const populated = await populateAssignment(EducationLessonAssignment.findById(item._id)).lean()
      return ok(res, 201, { data: populated })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.create]', error)
      return err(res, 500, 'Erro ao criar atribuição')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await EducationLessonAssignment.findById(id)
      if (!item) return err(res, 404, 'Atribuição não encontrada')
      if (!canAccessLessonAssignment(req.educationContext, item, 'write')) {
        return err(res, 403, 'Sem permissão')
      }

      const before = item.toObject()

      if (req.body.title !== undefined) item.title = String(req.body.title).trim()
      if (req.body.description !== undefined) item.description = String(req.body.description || '')
      if (req.body.category !== undefined && LESSON_ASSIGNMENT_CATEGORIES.includes(req.body.category)) {
        item.category = req.body.category
      }
      if (req.body.processStatus !== undefined && LESSON_ASSIGNMENT_PROCESS_STATUSES.includes(req.body.processStatus)) {
        item.processStatus = req.body.processStatus
      }
      if (req.body.location !== undefined) item.location = String(req.body.location || '')
      if (req.body.observations !== undefined) item.observations = String(req.body.observations || '')
      if (req.body.period !== undefined) item.period = String(req.body.period || '')
      if (req.body.showEffectiveTeachers !== undefined) {
        item.showEffectiveTeachers = parseBoolean(req.body.showEffectiveTeachers)
      }

      if (req.body.assignmentDateOnly !== undefined) {
        item.assignmentDateOnly = req.body.assignmentDateOnly || ''
        item.assignmentTime = req.body.assignmentTime || item.assignmentTime || ''
        item.assignmentEndTime = req.body.assignmentEndTime || item.assignmentEndTime || ''
        item.assignmentDate = item.assignmentDateOnly
          ? combineDateAndTime(item.assignmentDateOnly, item.assignmentTime || '08:00')
          : null
      }

      if (req.body.teachers !== undefined) {
        item.teachers = normalizeTeachers(req.body.teachers)
      }
      if (req.body.vacancies !== undefined) {
        item.vacancies = normalizeVacancies(req.body.vacancies)
      }

      const ctx = req.educationContext
      if (!canManageModule(ctx) && !canAccessLessonAssignment(ctx, item, 'write')) {
        return err(res, 403, 'Sem permissão para estas unidades')
      }

      if (req.body.existingDocuments !== undefined || getUploadedFiles(req).length) {
        item.documents = buildDocumentsFromRequest(req, item.documents || [])
      }

      await item.save()

      await recordChange(req, {
        before,
        after: item.toObject(),
        resourceType: 'education_lesson_assignment',
        resourceId: item._id,
        module: 'education',
      })

      const populated = await populateAssignment(EducationLessonAssignment.findById(item._id)).lean()
      return ok(res, 200, { data: populated })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.update]', error)
      return err(res, 500, 'Erro ao atualizar atribuição')
    }
  }

  static async publish(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await EducationLessonAssignment.findById(id)
      if (!item) return err(res, 404, 'Atribuição não encontrada')

      const ctx = req.educationContext
      if (!canManageModule(ctx) && !canAccessLessonAssignment(ctx, item, 'write')) {
        return err(res, 403, 'Sem permissão')
      }

      item.publicationStatus = 'published'
      await item.save()

      await recordAudit(req, {
        action: 'education.lesson_assignment.publish',
        resourceType: 'education_lesson_assignment',
        resourceId: item._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.publish]', error)
      return err(res, 500, 'Erro ao publicar atribuição')
    }
  }

  static async archive(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await EducationLessonAssignment.findById(id)
      if (!item) return err(res, 404, 'Atribuição não encontrada')

      const ctx = req.educationContext
      if (!canManageModule(ctx) && !canAccessLessonAssignment(ctx, item, 'write')) {
        return err(res, 403, 'Sem permissão')
      }

      item.publicationStatus = 'archived'
      await item.save()

      await recordAudit(req, {
        action: 'education.lesson_assignment.archive',
        resourceType: 'education_lesson_assignment',
        resourceId: item._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.archive]', error)
      return err(res, 500, 'Erro ao arquivar atribuição')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await EducationLessonAssignment.findById(id)
      if (!item) return err(res, 404, 'Atribuição não encontrada')

      const ctx = req.educationContext
      if (!canManageModule(ctx) && !canAccessLessonAssignment(ctx, item, 'write')) {
        return err(res, 403, 'Sem permissão')
      }

      await EducationLessonAssignment.findByIdAndDelete(id)

      await recordAudit(req, {
        action: 'education.lesson_assignment.delete',
        resourceType: 'education_lesson_assignment',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { data: { deleted: true } })
    } catch (error) {
      console.error('[EducationLessonAssignmentController.remove]', error)
      return err(res, 500, 'Erro ao excluir atribuição')
    }
  }
}
