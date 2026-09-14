const ComturMeeting = require('../models/ComturMeeting')
const mongoose = require('mongoose')
const { recordAudit, recordChange } = require('../helpers/audit-service')
const { buildPublicMeetingQuery, buildMeetingPayload, canTransitionStatus } = require('../helpers/comtur-query')

function publicProjection() {
  return '-createdBy -updatedBy -__v'
}

function actorId(req) {
  return req.user?._id || req.user?.id || null
}

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

module.exports = class ComturMeetingController {
  static async listPublic(req, res) {
    try {
      const query = buildPublicMeetingQuery(req.query)
      if (query.error) return res.status(422).json({ error: query.error })

      const [items, total] = await Promise.all([
        ComturMeeting.find(query.filter)
          .select(publicProjection())
          .sort(query.sort)
          .skip(query.skip)
          .limit(query.limit)
          .lean(),
        ComturMeeting.countDocuments(query.filter),
      ])

      return res.json({
        data: items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      })
    } catch (error) {
      console.error('[ComturMeetingController.listPublic]', error)
      return res.status(500).json({ error: 'Erro ao listar reuniões do COMTUR' })
    }
  }

  static async getBySlug(req, res) {
    try {
      const slug = String(req.params.slug || '').trim().toLowerCase()
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return res.status(422).json({ error: 'Identificador de reunião inválido' })
      }

      const item = await ComturMeeting.findOne({ slug, status: 'published' })
        .select(publicProjection())
        .lean()

      if (!item) return res.status(404).json({ error: 'Reunião não encontrada' })
      return res.json({ data: item })
    } catch (error) {
      console.error('[ComturMeetingController.getBySlug]', error)
      return res.status(500).json({ error: 'Erro ao consultar reunião do COMTUR' })
    }
  }

  static async listAdmin(req, res) {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
      const filter = {}
      if (req.query.status) filter.status = req.query.status
      if (req.query.year) filter.year = Number(req.query.year)
      const [items, total] = await Promise.all([
        ComturMeeting.find(filter).sort({ startsAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ComturMeeting.countDocuments(filter),
      ])
      return res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
    } catch (error) {
      console.error('[ComturMeetingController.listAdmin]', error)
      return res.status(500).json({ error: 'Erro ao listar reuniões do COMTUR' })
    }
  }

  static async getAdminById(req, res) {
    if (!validId(req.params.id)) return res.status(422).json({ error: 'Identificador inválido' })
    const item = await ComturMeeting.findById(req.params.id).lean()
    if (!item) return res.status(404).json({ error: 'Reunião não encontrada' })
    return res.json({ data: item })
  }

  static async create(req, res) {
    try {
      const normalized = buildMeetingPayload(req.body)
      if (normalized.error) return res.status(422).json({ error: normalized.error })
      const item = await ComturMeeting.create({ ...normalized.payload, status: 'draft', createdBy: actorId(req), updatedBy: actorId(req) })
      await recordAudit(req, { action: 'comtur.meeting.create', module: 'comtur', resourceType: 'comtur_meeting', resourceId: item._id, eventType: 'CREATE', metadata: { slug: item.slug } })
      return res.status(201).json({ data: item })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ error: 'Já existe uma reunião com este identificador ou numeração' })
      console.error('[ComturMeetingController.create]', error)
      return res.status(500).json({ error: 'Erro ao criar reunião do COMTUR' })
    }
  }

  static async update(req, res) {
    try {
      if (!validId(req.params.id)) return res.status(422).json({ error: 'Identificador inválido' })
      const item = await ComturMeeting.findById(req.params.id)
      if (!item) return res.status(404).json({ error: 'Reunião não encontrada' })
      if (item.status === 'archived') return res.status(409).json({ error: 'Arquive uma cópia nova se precisar republicar esta reunião' })
      const normalized = buildMeetingPayload(req.body, { partial: true })
      if (normalized.error) return res.status(422).json({ error: normalized.error })
      const before = item.toObject()
      Object.assign(item, normalized.payload, { updatedBy: actorId(req), revision: item.revision + 1 })
      await item.save()
      await recordChange(req, { action: 'comtur.meeting.update', module: 'comtur', resourceType: 'comtur_meeting', resourceId: item._id, before, after: item.toObject() })
      return res.json({ data: item })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ error: 'Já existe uma reunião com este identificador ou numeração' })
      console.error('[ComturMeetingController.update]', error)
      return res.status(500).json({ error: 'Erro ao atualizar reunião do COMTUR' })
    }
  }

  static async transition(req, res) {
    try {
      if (!validId(req.params.id)) return res.status(422).json({ error: 'Identificador inválido' })
      const target = String(req.body?.status || '')
      const item = await ComturMeeting.findById(req.params.id)
      if (!item) return res.status(404).json({ error: 'Reunião não encontrada' })
      if (!canTransitionStatus(item.status, target)) return res.status(409).json({ error: `Transição ${item.status} → ${target} não permitida` })
      const before = item.toObject()
      item.status = target
      item.updatedBy = actorId(req)
      item.revision += 1
      if (target === 'review') item.reviewAt = new Date()
      if (target === 'published') item.publishedAt = new Date()
      if (target === 'archived') item.archivedAt = new Date()
      await item.save()
      await recordChange(req, { action: `comtur.meeting.${target}`, module: 'comtur', resourceType: 'comtur_meeting', resourceId: item._id, before, after: item.toObject(), eventType: target === 'published' ? 'APPROVE' : 'UPDATE' })
      return res.json({ data: item })
    } catch (error) {
      console.error('[ComturMeetingController.transition]', error)
      return res.status(500).json({ error: 'Erro ao alterar estado da reunião do COMTUR' })
    }
  }
}
