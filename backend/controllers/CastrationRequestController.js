const CastrationRequest = require('../models/CastrationRequest')
const CastrationCampaign = require('../models/CastrationCampaign')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const { recordAudit } = require('../helpers/audit-log')
const { nextCastrationProtocol } = require('../helpers/castration-protocol')
const {
  getOpenCampaignForRequests,
  reserveCampaignSlots,
  releaseCampaignSlots,
  toPublicCampaign,
} = require('../helpers/castration-campaign-service')
const {
  buildApplicantSnapshot,
  validateAnimals,
  canTransition,
  parseClientMeta,
} = require('../helpers/castration-request-service')
const {
  notifyApplicantSubmitted,
  notifySamaNewRequest,
  notifyApplicantStatusChange,
} = require('../helpers/castration-notifier')
const { buildReceiptHtml } = require('../helpers/castration-receipt')
const { STATUS_LABELS } = require('../helpers/castration-constants')

function csvEscape(v) {
  const s = String(v ?? '')
  if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

function speciesLabel(a) {
  if (a.species === 'outro') return a.speciesOther || 'outro'
  return a.species
}

module.exports = class CastrationRequestController {
  static async prefill(req, res) {
    try {
      const token = getToken(req)
      const user = await getUserByToken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado.' })
      return res.status(200).json({
        userId: user._id,
        applicant: buildApplicantSnapshot(user),
      })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao carregar dados do solicitante.' })
    }
  }

  static async create(req, res) {
    try {
      const token = getToken(req)
      const user = await getUserByToken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado.' })

      const campaign = await getOpenCampaignForRequests()
      if (!campaign) {
        return res.status(403).json({ message: 'Campanha de castração encerrada ou sem vagas disponíveis.' })
      }

      const { errors, normalized } = validateAnimals(req.body?.animals)
      if (errors.length) return res.status(422).json({ message: errors.join(' ') })

      const count = normalized.length
      const reserved = await reserveCampaignSlots(campaign._id, count)
      if (!reserved) {
        return res.status(409).json({ message: 'Vagas insuficientes para a quantidade de animais informada.' })
      }

      const protocol = await nextCastrationProtocol()
      const applicant = buildApplicantSnapshot(user)

      let request
      try {
        request = await CastrationRequest.create({
          protocol,
          campaignId: campaign._id,
          userId: user._id,
          applicant,
          animals: normalized,
          animalCount: count,
          status: 'pendente',
          statusHistory: [{ status: 'pendente', changedBy: user._id, note: 'Solicitação enviada' }],
          ip: req.ip || req.headers['x-forwarded-for'] || '',
          userAgent: req.headers['user-agent'] || '',
          client: parseClientMeta(req),
        })
      } catch (err) {
        await releaseCampaignSlots(campaign._id, count)
        throw err
      }

      void recordAudit(req, {
        action: 'castration_request.create',
        resourceType: 'castration_request',
        resourceId: request._id,
        module: 'sama',
        eventType: 'CREATE',
        metadata: { protocol, animalCount: count, campaignId: String(campaign._id) },
      })

      void notifyApplicantSubmitted({ request, campaign: reserved })
      void notifySamaNewRequest({ request })

      return res.status(201).json({
        message: 'Solicitação registrada com sucesso.',
        request: {
          id: request._id,
          protocol: request.protocol,
          status: request.status,
          animalCount: request.animalCount,
          createdAt: request.createdAt,
        },
        receiptUrl: `/castration-requests/mine/${request._id}/receipt`,
      })
    } catch (error) {
      console.error('[CastrationRequest.create]', error)
      return res.status(500).json({ message: 'Erro ao registrar solicitação.' })
    }
  }

  static async listMine(req, res) {
    try {
      const token = getToken(req)
      const user = await getUserByToken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado.' })

      const items = await CastrationRequest.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .select('protocol status animalCount createdAt campaignId scheduledAt scheduledLocation')
        .lean()

      return res.status(200).json({
        items: items.map((r) => ({
          ...r,
          statusLabel: STATUS_LABELS[r.status] || r.status,
        })),
      })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar suas solicitações.' })
    }
  }

  static async listAdmin(req, res) {
    try {
      const {
        q,
        cpf,
        phone,
        city,
        protocol,
        status,
        campaignId,
        sort = 'createdAt',
        order = 'desc',
        page = 1,
        limit = 50,
      } = req.query

      const filter = {}
      if (status) filter.status = status
      if (campaignId) filter.campaignId = campaignId
      if (protocol) filter.protocol = new RegExp(String(protocol).trim(), 'i')
      if (cpf) filter['applicant.cpf'] = new RegExp(String(cpf).replace(/\D/g, ''), 'i')
      if (phone) filter['applicant.phone'] = new RegExp(String(phone).replace(/\D/g, ''), 'i')
      if (city) filter['applicant.city'] = new RegExp(String(city).trim(), 'i')
      if (q) {
        const rx = new RegExp(String(q).trim(), 'i')
        filter.$or = [{ 'applicant.name': rx }, { protocol: rx }]
      }

      const sortField = ['createdAt', 'applicant.city', 'animalCount'].includes(sort) ? sort : 'createdAt'
      const sortOrder = order === 'asc' ? 1 : -1
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50))
      const skip = (pageNum - 1) * limitNum

      const [items, total] = await Promise.all([
        CastrationRequest.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limitNum).lean(),
        CastrationRequest.countDocuments(filter),
      ])

      void recordAudit(req, {
        action: 'castration_request.list',
        resourceType: 'castration_request',
        status: 'success',
        module: 'sama',
        eventType: 'VIEW',
        metadata: { total, page: pageNum },
      })

      return res.status(200).json({
        items,
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.max(1, Math.ceil(total / limitNum)),
      })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar solicitações.' })
    }
  }

  static async getByIdAdmin(req, res) {
    try {
      const item = await CastrationRequest.findById(req.params.id).lean()
      if (!item) return res.status(404).json({ message: 'Solicitação não encontrada.' })
      return res.status(200).json({ request: item })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar solicitação.' })
    }
  }

  static async updateStatus(req, res) {
    try {
      const { status, note, refusalReason } = req.body || {}
      if (!status) return res.status(422).json({ message: 'Status é obrigatório.' })

      const request = await CastrationRequest.findById(req.params.id)
      if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })

      if (!canTransition(request.status, status)) {
        return res.status(422).json({ message: `Transição inválida: ${request.status} → ${status}` })
      }

      const prev = request.status
      request.status = status
      if (status === 'recusada' && refusalReason) request.refusalReason = String(refusalReason).trim()
      request.statusHistory.push({
        status,
        changedBy: req.user?.id,
        note: note || '',
        changedAt: new Date(),
      })
      await request.save()

      if (status === 'cancelada' && ['pendente', 'em_analise', 'aprovada', 'lista_de_espera'].includes(prev)) {
        await releaseCampaignSlots(request.campaignId, request.animalCount)
      }

      void recordAudit(req, {
        action: 'castration_request.status_update',
        resourceType: 'castration_request',
        resourceId: request._id,
        module: 'sama',
        eventType: 'UPDATE',
        metadata: { from: prev, to: status, protocol: request.protocol },
      })

      void notifyApplicantStatusChange({ request, note })

      return res.status(200).json({ request })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao atualizar status.' })
    }
  }

  static async schedule(req, res) {
    try {
      const { scheduledAt, scheduledLocation, note } = req.body || {}
      if (!scheduledAt) return res.status(422).json({ message: 'scheduledAt é obrigatório.' })

      const request = await CastrationRequest.findById(req.params.id)
      if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })

      if (!canTransition(request.status, 'agendada') && request.status !== 'agendada') {
        return res.status(422).json({ message: 'Solicitação não pode ser agendada neste status.' })
      }

      request.status = 'agendada'
      request.scheduledAt = new Date(scheduledAt)
      request.scheduledLocation = String(scheduledLocation || '').trim()
      request.statusHistory.push({
        status: 'agendada',
        changedBy: req.user?.id,
        note: note || 'Agendamento definido',
        changedAt: new Date(),
      })
      await request.save()

      void recordAudit(req, {
        action: 'castration_request.schedule',
        resourceType: 'castration_request',
        resourceId: request._id,
        module: 'sama',
        eventType: 'UPDATE',
        metadata: { scheduledAt: request.scheduledAt, protocol: request.protocol },
      })

      void notifyApplicantStatusChange({ request, note: note || 'Sua castração foi agendada.' })

      return res.status(200).json({ request })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao agendar solicitação.' })
    }
  }

  static async receiptMine(req, res) {
    try {
      const token = getToken(req)
      const user = await getUserByToken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado.' })

      const request = await CastrationRequest.findOne({ _id: req.params.id, userId: user._id }).lean()
      if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })

      const campaign = await CastrationCampaign.findById(request.campaignId).lean()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      return res.send(buildReceiptHtml({ request, campaign }))
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao gerar comprovante.' })
    }
  }

  static async receiptAdmin(req, res) {
    try {
      const request = await CastrationRequest.findById(req.params.id).lean()
      if (!request) return res.status(404).json({ message: 'Solicitação não encontrada.' })
      const campaign = await CastrationCampaign.findById(request.campaignId).lean()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.send(buildReceiptHtml({ request, campaign }))
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao gerar comprovante.' })
    }
  }

  static async exportCsv(req, res) {
    try {
      const filter = {}
      if (req.query.campaignId) filter.campaignId = req.query.campaignId
      if (req.query.status) filter.status = req.query.status

      const items = await CastrationRequest.find(filter).sort({ createdAt: -1 }).limit(5000).lean()
      const header = [
        'protocol',
        'createdAt',
        'status',
        'applicantName',
        'cpf',
        'phone',
        'city',
        'animalCount',
        'species',
        'animalName',
        'breed',
        'sex',
        'weightKg',
      ]
      const lines = [header.join(',')]
      for (const row of items) {
        for (const animal of row.animals || []) {
          lines.push(
            [
              row.protocol,
              row.createdAt,
              row.status,
              row.applicant?.name,
              row.applicant?.cpf,
              row.applicant?.phone,
              row.applicant?.city,
              row.animalCount,
              speciesLabel(animal),
              animal.name,
              animal.breed,
              animal.sex,
              animal.weightKg,
            ]
              .map(csvEscape)
              .join(',')
          )
        }
      }

      void recordAudit(req, {
        action: 'castration_request.export_csv',
        resourceType: 'castration_request',
        module: 'sama',
        eventType: 'DOWNLOAD',
        metadata: { rows: items.length },
      })

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="castracao-solicitacoes.csv"')
      return res.send(`\uFEFF${lines.join('\n')}`)
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao exportar CSV.' })
    }
  }
}
