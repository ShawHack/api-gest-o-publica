const bcrypt = require('bcrypt')
const Votation = require('../models/Votation')
const VotingCandidate = require('../models/VotingCandidate')
const VotingServidor = require('../models/VotingServidor')
const Vote = require('../models/Vote')
const VotingPleitoMembership = require('../models/VotingPleitoMembership')
const validateCPF = require('../helpers/validate-cpf')
const {
  onlyDigits,
  normalizeMatricula,
  computeServidorIdentityHash,
  computeCpfHash,
  cpfLast4,
  maskCpfDisplay,
} = require('../helpers/voting-identity-hash')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')
const { buildVotationSlug, landingPath } = require('../helpers/voting-slug')
const { votingBannerPublicUrl } = require('../helpers/voting-upload')

function normalizeThemeColor(value) {
  const raw = String(value || '').trim()
  if (!raw) return '#1e3a8a'
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : '#1e3a8a'
}

function csvEscape(s) {
  const t = String(s ?? '')
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

module.exports = {
  async createVotation(req, res) {
    try {
      const { title, description, startDate, endDate, status, allowPartialResults } = req.body || {}
      if (!title) return res.status(422).json({ message: 'Título obrigatório.' })
      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate) : null
      if (!start || !end || Number.isNaN(+start) || Number.isNaN(+end)) {
        return res.status(422).json({ message: 'Datas de início e fim inválidas.' })
      }
      if (end <= start) return res.status(422).json({ message: 'Data fim deve ser após início.' })
      const slug = await buildVotationSlug(Votation, title)
      const doc = await Votation.create({
        title: String(title).trim(),
        description: String(description || '').trim(),
        startDate: start,
        endDate: end,
        status: status || 'draft',
        allowPartialResults: !!allowPartialResults,
        slug,
      })
      void recordVoteEvent(req, {
        action: 'admin.votation_create',
        resourceType: 'votation',
        resourceId: doc._id,
        eventType: 'CREATE',
        meta: { status: doc.status, title: doc.title, slug: doc.slug },
      })
      return res.status(201).json({
        votation: doc,
        landingUrl: landingPath(doc.slug),
      })
    } catch (e) {
      console.error('[VotingAdmin.createVotation]', e)
      return res.status(500).json({ message: 'Erro ao criar votação.' })
    }
  },

  async listVotations(req, res) {
    try {
      const globalAdmin = ['admin', 'admin-votacao'].includes(req.user?.role)
      let filter = {}
      if (!globalAdmin) {
        const memberships = await VotingPleitoMembership.find({
          userId: req.user?._id || req.user?.id,
          status: 'active',
        }).select('votationId').lean()
        filter = { _id: { $in: memberships.map((row) => row.votationId) } }
      }
      const list = await Votation.find(filter).sort({ createdAt: -1 }).lean()
      void recordVoteEvent(req, {
        action: 'admin.votation_list',
        resourceType: 'votation',
        eventType: 'VIEW',
        meta: { count: list.length, scope: globalAdmin ? 'global_admin' : 'auditor' },
      })
      return res.json({
        votations: list,
        access: { globalAdmin, canWrite: globalAdmin },
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao listar.' })
    }
  },

  async getVotation(req, res) {
    try {
      const v = await Votation.findById(req.params.id)
      if (!v) return res.status(404).json({ message: 'Votação não encontrada.' })
      const candidates = await VotingCandidate.find({ votationId: v._id }).sort({ order: 1, name: 1 }).lean()
      void recordVoteEvent(req, {
        votationId: v._id,
        action: 'admin.votation_view',
        resourceType: 'votation',
        resourceId: v._id,
        eventType: 'VIEW',
        meta: { candidateCount: candidates.length },
      })
      return res.json({ votation: v, candidates })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao carregar.' })
    }
  },

  async patchVotation(req, res) {
    try {
      const v = await Votation.findById(req.params.id)
      if (!v) return res.status(404).json({ message: 'Votação não encontrada.' })
      const {
        title,
        description,
        startDate,
        endDate,
        status,
        allowPartialResults,
        voterInstructions,
        themeColor,
        whatsappNotifyEnabled,
      } = req.body || {}
      const before = {
        title: v.title,
        status: v.status,
        startDate: v.startDate,
        endDate: v.endDate,
        allowPartialResults: v.allowPartialResults,
        voterInstructions: v.voterInstructions,
        themeColor: v.themeColor,
        bannerUrl: v.bannerUrl,
        whatsappNotifyEnabled: v.whatsappNotifyEnabled !== false,
      }
      if (title != null) {
        v.title = String(title).trim()
        if (!v.slug) v.slug = await buildVotationSlug(Votation, v.title, v._id)
      }
      if (description != null) v.description = String(description).trim()
      if (startDate) v.startDate = new Date(startDate)
      if (endDate) v.endDate = new Date(endDate)
      if (status) v.status = status
      if (allowPartialResults != null) v.allowPartialResults = !!allowPartialResults
      if (voterInstructions != null) v.voterInstructions = String(voterInstructions).trim()
      if (themeColor != null) v.themeColor = normalizeThemeColor(themeColor)
      if (whatsappNotifyEnabled != null) v.whatsappNotifyEnabled = !!whatsappNotifyEnabled
      if (req.file) v.bannerUrl = votingBannerPublicUrl(req.file.filename)
      if (v.endDate <= v.startDate) {
        return res.status(422).json({ message: 'Data fim deve ser após início.' })
      }
      const closedNow = status === 'closed' && before.status !== 'closed'
      await v.save()
      void recordVoteEvent(req, {
        votationId: v._id,
        action: 'admin.votation_update',
        resourceType: 'votation',
        resourceId: v._id,
        before,
        after: {
          title: v.title,
          status: v.status,
          startDate: v.startDate,
          endDate: v.endDate,
          allowPartialResults: v.allowPartialResults,
          voterInstructions: v.voterInstructions,
          themeColor: v.themeColor,
          bannerUrl: v.bannerUrl,
          whatsappNotifyEnabled: v.whatsappNotifyEnabled !== false,
        },
        fields: [
          'title',
          'status',
          'startDate',
          'endDate',
          'allowPartialResults',
          'voterInstructions',
          'themeColor',
          'bannerUrl',
          'whatsappNotifyEnabled',
        ],
        eventType: status && status !== before.status ? 'UPDATE' : 'UPDATE',
      })

      let whatsappClosed = null
      if (closedNow) {
        try {
          const { notifyElectionClosed } = require('../helpers/votacao-notifier')
          whatsappClosed = await notifyElectionClosed({ votation: v.toObject() })
        } catch (err) {
          console.error('[VotingAdmin.patchVotation] whatsapp closed:', err?.message || err)
          whatsappClosed = { error: true, message: err?.message || String(err) }
        }
      }

      return res.json({
        votation: v,
        landingUrl: v.slug ? landingPath(v.slug) : null,
        whatsappClosed,
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao atualizar.' })
    }
  },

  async addCandidate(req, res) {
    try {
      const { candidateId, name, photoUrl, order } = req.body || {}
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Votação não encontrada.' })
      if (!candidateId || !name) return res.status(422).json({ message: 'candidateId e name são obrigatórios.' })
      const c = await VotingCandidate.create({
        votationId: vot._id,
        candidateId: String(candidateId).trim(),
        name: String(name).trim(),
        photoUrl: String(photoUrl || '').trim(),
        order: order != null ? Number(order) : 0,
      })
      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.candidate_create',
        resourceType: 'voting_candidate',
        resourceId: c._id,
        eventType: 'CREATE',
        meta: { candidateId: c.candidateId, name: c.name },
      })
      return res.status(201).json({ candidate: c })
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Já existe candidato com esse id nesta votação.' })
      }
      console.error('[VotingAdmin.addCandidate]', e)
      return res.status(500).json({ message: 'Erro ao adicionar candidato.' })
    }
  },

  async removeCandidate(req, res) {
    try {
      const c = await VotingCandidate.findOneAndDelete({
        votationId: req.params.id,
        _id: req.params.candidateDocId,
      })
      if (!c) return res.status(404).json({ message: 'Candidato não encontrado.' })
      void recordVoteEvent(req, {
        votationId: req.params.id,
        action: 'admin.candidate_delete',
        resourceType: 'voting_candidate',
        resourceId: c._id,
        eventType: 'DELETE',
        meta: { candidateId: c.candidateId, name: c.name },
      })
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao remover.' })
    }
  },

  async createServidor(req, res) {
    try {
      const { cpf, matricula, nome, whatsapp, whatsappOptIn } = req.body || {}
      const cpfClean = onlyDigits(cpf)
      if (!cpfClean || !validateCPF(cpfClean)) {
        return res.status(422).json({ message: 'CPF inválido.' })
      }
      if (!matricula) {
        return res.status(422).json({ message: 'Matrícula é obrigatória.' })
      }
      const matNorm = normalizeMatricula(matricula)
      const existingMat = await VotingServidor.findOne({ matricula: matNorm })
      if (existingMat) {
        return res.status(409).json({ message: 'Matrícula já cadastrada na base de votação.' })
      }
      const matriculaHash = computeServidorIdentityHash(cpfClean, matricula)
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(`auto:${Date.now()}:${matriculaHash}`, salt)
      const phoneDigits = String(whatsapp || '').replace(/\D/g, '')
      const doc = await VotingServidor.create({
        matricula: matNorm,
        cpfHash: computeCpfHash(cpfClean),
        cpfLast4: cpfLast4(cpfClean),
        matriculaHash,
        password: passwordHash,
        nome: String(nome || '').trim(),
        whatsapp: phoneDigits.length >= 10 ? phoneDigits : '',
        whatsappOptIn: whatsappOptIn !== false,
        active: true,
      })
      void recordVoteEvent(req, {
        action: 'admin.servidor_create',
        resourceType: 'voting_servidor',
        resourceId: doc._id,
        eventType: 'CREATE',
        meta: { cpfLast4: doc.cpfLast4, nome: doc.nome, hasWhatsapp: !!doc.whatsapp },
      })
      return res.status(201).json({
        servidor: {
          id: doc._id,
          cpf: maskCpfDisplay(doc),
          nome: doc.nome,
          whatsapp: doc.whatsapp || '',
          whatsappOptIn: doc.whatsappOptIn !== false,
        },
      })
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Matrícula já cadastrada na base de votação.' })
      }
      console.error('[VotingAdmin.createServidor]', e)
      return res.status(500).json({ message: 'Erro ao cadastrar servidor.' })
    }
  },

  async listServidores(req, res) {
    try {
      const list = await VotingServidor.find()
        .select('matricula cpfHash cpfLast4 nome setor cargoFuncao whatsapp whatsappOptIn active createdAt')
        .sort({ createdAt: -1 })
        .lean()
      void recordVoteEvent(req, {
        action: 'admin.servidor_list',
        resourceType: 'voting_servidor',
        eventType: 'VIEW',
        meta: { count: list.length },
      })
      return res.json({
        servidores: list.map((s) => ({
          id: s._id,
          matricula: s.matricula || '',
          cpf: maskCpfDisplay(s),
          nome: s.nome,
          setor: s.setor || '',
          cargo: s.cargoFuncao || '',
          whatsapp: s.whatsapp || '',
          whatsappOptIn: s.whatsappOptIn !== false,
          active: s.active !== false,
          createdAt: s.createdAt,
        })),
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao listar.' })
    }
  },

  async exportCsv(req, res) {
    try {
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Votação não encontrada.' })
      const votes = await Vote.find({ votationId: vot._id }).sort({ createdAt: 1 }).lean()
      const candMap = {}
      const cands = await VotingCandidate.find({ votationId: vot._id }).lean()
      cands.forEach((c) => {
        candMap[c.candidateId] = c.name
      })
      const lines = ['timestamp,candidate_id,candidate_name,user_hash']
      for (const v of votes) {
        lines.push(
          [
            csvEscape(v.createdAt?.toISOString?.() || ''),
            csvEscape(v.candidateId),
            csvEscape(candMap[v.candidateId] || ''),
            csvEscape(v.userHash),
          ].join(',')
        )
      }
      const body = lines.join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="votacao-${vot._id}.csv"`)
      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.export_csv',
        resourceType: 'votation',
        resourceId: vot._id,
        eventType: 'DOWNLOAD',
        meta: { voteCount: votes.length },
      })
      return res.send('\uFEFF' + body)
    } catch (e) {
      console.error('[VotingAdmin.exportCsv]', e)
      return res.status(500).json({ message: 'Erro ao exportar.' })
    }
  },

  async dashboard(req, res) {
    try {
      const globalAdmin = ['admin', 'admin-votacao'].includes(req.user?.role)
      let filter = {}
      if (!globalAdmin) {
        const memberships = await VotingPleitoMembership.find({
          userId: req.user?._id || req.user?.id,
          status: 'active',
        }).select('votationId').lean()
        filter = { _id: { $in: memberships.map((row) => row.votationId) } }
      }
      const totalVotations = await Votation.countDocuments(filter)
      const active = await Votation.countDocuments({ ...filter, status: 'active' })
      const servidores = globalAdmin ? await VotingServidor.countDocuments() : null
      void recordVoteEvent(req, {
        action: 'admin.dashboard_view',
        resourceType: 'votation',
        eventType: 'VIEW',
        meta: { totalVotations, activeVotations: active, servidoresCadastrados: servidores, scope: globalAdmin ? 'global_admin' : 'auditor' },
      })
      return res.json({
        totalVotations,
        activeVotations: active,
        servidoresCadastrados: servidores,
        access: { globalAdmin, canWrite: globalAdmin },
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao carregar dashboard.' })
    }
  },

  /** Reenvio manual do WhatsApp de encerramento (só quem votou).
   * Query/body `force=1` remove as chaves de idempotência `closed` do pleito
   * (necessário quando o job foi enfileirado mas a Evolution falhou com Connection Closed).
   */
  async notifyClosedWhatsapp(req, res) {
    try {
      const v = await Votation.findById(req.params.id)
      if (!v) return res.status(404).json({ message: 'Votação não encontrada.' })
      if (v.status !== 'closed') {
        return res.status(422).json({
          message: 'Só é possível notificar resultado após o pleito estar encerrado.',
        })
      }

      const forceRaw = req.query?.force ?? req.body?.force
      const force =
        forceRaw === true ||
        forceRaw === 1 ||
        String(forceRaw || '').toLowerCase() === '1' ||
        String(forceRaw || '').toLowerCase() === 'true'

      let cleared = 0
      if (force) {
        const VotacaoNotifyDelivery = require('../models/VotacaoNotifyDelivery')
        const del = await VotacaoNotifyDelivery.deleteMany({
          votationId: String(v._id),
          event: 'closed',
        })
        cleared = del?.deletedCount || 0
      }

      const { notifyElectionClosed } = require('../helpers/votacao-notifier')
      const whatsapp = await notifyElectionClosed({ votation: v.toObject() })
      void recordVoteEvent(req, {
        votationId: v._id,
        action: 'admin.notify_closed_whatsapp',
        resourceType: 'votation',
        resourceId: v._id,
        eventType: 'CREATE',
        meta: {
          force,
          cleared,
          sent: whatsapp?.sent ?? 0,
          total: whatsapp?.total ?? 0,
          skipped: whatsapp?.skipped ?? 0,
        },
      })
      return res.json({ ok: true, force, cleared, whatsapp })
    } catch (e) {
      console.error('[VotingAdmin.notifyClosedWhatsapp]', e)
      return res.status(500).json({ message: 'Erro ao notificar encerramento.' })
    }
  },
}
