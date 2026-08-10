const Votation = require('../models/Votation')
const VotingCategory = require('../models/VotingCategory')
const VotingCandidate = require('../models/VotingCandidate')
const VotingServidor = require('../models/VotingServidor')
const VoterParticipation = require('../models/VoterParticipation')
const Vote = require('../models/Vote')
const { importVotersFromCsv } = require('../helpers/voting-csv-import')
const { tallyElection } = require('../helpers/voting-election-service')
const { votingPhotoPublicUrl } = require('../helpers/voting-upload')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')

function csvEscape(s) {
  const t = String(s ?? '')
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

module.exports = {
  async listCategories(req, res) {
    try {
      const cats = await VotingCategory.find({ votationId: req.params.id })
        .sort({ order: 1, name: 1 })
        .lean()
      return res.json({ categories: cats })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao listar categorias.' })
    }
  },

  async createCategory(req, res) {
    try {
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const { name, description, order, active, winnersCount } = req.body || {}
      if (!name) return res.status(422).json({ message: 'Nome da categoria obrigatório.' })
      const { normalizeWinnersCount } = require('../helpers/voting-election-service')
      const cat = await VotingCategory.create({
        votationId: vot._id,
        name: String(name).trim(),
        description: String(description || '').trim(),
        order: order != null ? Number(order) : 0,
        winnersCount: normalizeWinnersCount(winnersCount, 1),
        active: active !== false,
      })
      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.category_create',
        resourceType: 'voting_category',
        resourceId: cat._id,
        eventType: 'CREATE',
        meta: { winnersCount: cat.winnersCount },
      })
      return res.status(201).json({ category: cat })
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Categoria já existe neste pleito.' })
      return res.status(500).json({ message: 'Erro ao criar categoria.' })
    }
  },

  async patchCategory(req, res) {
    try {
      const cat = await VotingCategory.findOne({ _id: req.params.categoryId, votationId: req.params.id })
      if (!cat) return res.status(404).json({ message: 'Categoria não encontrada.' })
      const { name, description, order, active, winnersCount } = req.body || {}
      const { normalizeWinnersCount } = require('../helpers/voting-election-service')
      if (name != null) cat.name = String(name).trim()
      if (description != null) cat.description = String(description).trim()
      if (order != null) cat.order = Number(order)
      if (active != null) cat.active = !!active
      if (winnersCount != null) cat.winnersCount = normalizeWinnersCount(winnersCount, cat.winnersCount || 1)
      await cat.save()
      return res.json({ category: cat })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao atualizar categoria.' })
    }
  },

  async deleteCategory(req, res) {
    try {
      const cat = await VotingCategory.findOneAndDelete({
        _id: req.params.categoryId,
        votationId: req.params.id,
      })
      if (!cat) return res.status(404).json({ message: 'Categoria não encontrada.' })
      await VotingCandidate.deleteMany({ votationId: req.params.id, categoryId: cat._id })
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao excluir categoria.' })
    }
  },

  async addCandidateV2(req, res) {
    try {
      const { categoryId, number, name, photoUrl, description, order, active } = req.body || {}
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })
      if (!categoryId || !name || number == null) {
        return res.status(422).json({ message: 'categoryId, number e name são obrigatórios.' })
      }
      const cat = await VotingCategory.findOne({ _id: categoryId, votationId: vot._id })
      if (!cat) return res.status(422).json({ message: 'Categoria inválida.' })
      const num = Number(number)
      if (!Number.isInteger(num) || num < 1) {
        return res.status(422).json({ message: 'Número do candidato inválido.' })
      }
      const uploadedPhoto = req.file ? votingPhotoPublicUrl(req.file.filename) : ''
      const c = await VotingCandidate.create({
        votationId: vot._id,
        categoryId: cat._id,
        candidateId: `v2-${cat._id}-n${num}`,
        number: num,
        name: String(name).trim(),
        photoUrl: uploadedPhoto || String(photoUrl || '').trim(),
        description: String(description || '').trim(),
        order: order != null ? Number(order) : 0,
        active: active !== false,
      })
      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.candidate_create_v2',
        resourceType: 'voting_candidate',
        resourceId: c._id,
        eventType: 'CREATE',
        meta: { number: c.number, categoryId: String(cat._id) },
      })
      return res.status(201).json({ candidate: c })
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Número já usado nesta categoria.' })
      }
      return res.status(500).json({ message: 'Erro ao adicionar candidato.' })
    }
  },

  async patchCandidateV2(req, res) {
    try {
      const c = await VotingCandidate.findOne({
        _id: req.params.candidateDocId,
        votationId: req.params.id,
      })
      if (!c) return res.status(404).json({ message: 'Candidato não encontrado.' })
      const { name, photoUrl, description, order, active, number, categoryId } = req.body || {}
      if (name != null) c.name = String(name).trim()
      if (req.file) c.photoUrl = votingPhotoPublicUrl(req.file.filename)
      else if (photoUrl != null) c.photoUrl = String(photoUrl).trim()
      if (description != null) c.description = String(description).trim()
      if (order != null) c.order = Number(order)
      if (active != null) c.active = active === true || active === 'true'
      if (categoryId != null) {
        const cat = await VotingCategory.findOne({ _id: categoryId, votationId: req.params.id })
        if (!cat) return res.status(422).json({ message: 'Categoria inválida.' })
        c.categoryId = cat._id
      }
      if (number != null) {
        const num = Number(number)
        if (!Number.isInteger(num) || num < 1) {
          return res.status(422).json({ message: 'Número inválido.' })
        }
        c.number = num
      }
      if (c.categoryId && c.number) {
        c.candidateId = `v2-${c.categoryId}-n${c.number}`
      }
      await c.save()
      return res.json({ candidate: c })
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Número já usado nesta categoria.' })
      return res.status(500).json({ message: 'Erro ao atualizar candidato.' })
    }
  },

  async deleteCandidateV2(req, res) {
    try {
      const c = await VotingCandidate.findOneAndDelete({
        _id: req.params.candidateDocId,
        votationId: req.params.id,
      })
      if (!c) return res.status(404).json({ message: 'Candidato não encontrado.' })
      void recordVoteEvent(req, {
        votationId: req.params.id,
        action: 'admin.candidate_delete_v2',
        resourceType: 'voting_candidate',
        resourceId: c._id,
        eventType: 'DELETE',
        meta: { name: c.name, number: c.number },
      })
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao excluir candidato.' })
    }
  },

  async importVoters(req, res) {
    try {
      const content = req.body?.csv
      const result = await importVotersFromCsv(VotingServidor, content ? { content } : {})
      void recordVoteEvent(req, {
        action: 'admin.voters_import',
        resourceType: 'voting_servidor',
        eventType: 'CREATE',
        meta: {
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors.length,
        },
      })
      return res.json(result)
    } catch (e) {
      console.error('[VotingElectionAdmin.importVoters]', e)
      return res.status(500).json({ message: 'Erro ao importar eleitores.' })
    }
  },

  async resultsV2(req, res) {
    try {
      const v = await Votation.findById(req.params.id).lean()
      if (!v) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const tally = await tallyElection(v._id)
      void recordVoteEvent(req, {
        votationId: v._id,
        action: 'admin.results_v2',
        resourceType: 'votation',
        resourceId: v._id,
        eventType: 'VIEW',
      })
      return res.json({
        votation: { id: v._id, title: v.title, status: v.status },
        partial: v.status !== 'closed',
        ...tally,
      })
    } catch (e) {
      console.error('[VotingElectionAdmin.resultsV2]', e)
      return res.status(500).json({ message: 'Erro na apuração.' })
    }
  },

  async exportVotesV2(req, res) {
    try {
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const votes = await Vote.find({ votationId: vot._id, ballotVersion: 2 })
        .sort({ createdAt: 1 })
        .lean()
      const categories = await VotingCategory.find({ votationId: vot._id }).lean()
      const candidates = await VotingCandidate.find({ votationId: vot._id }).lean()
      const catMap = Object.fromEntries(categories.map((c) => [String(c._id), c.name]))
      const candMap = Object.fromEntries(candidates.map((c) => [String(c._id), c.name]))

      const lines = ['timestamp,category_id,category_name,vote_type,candidate_id,candidate_name']
      for (const v of votes) {
        const catName = catMap[String(v.categoryId)] || ''
        const candName =
          v.voteType === 'candidate' && v.candidateId ? candMap[String(v.candidateId)] || '' : ''
        lines.push(
          [
            csvEscape(v.createdAt?.toISOString?.() || ''),
            csvEscape(String(v.categoryId || '')),
            csvEscape(catName),
            csvEscape(v.voteType || ''),
            csvEscape(v.candidateId ? String(v.candidateId) : ''),
            csvEscape(candName),
          ].join(',')
        )
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="pleito-${vot._id}-votos.csv"`)
      return res.send('\uFEFF' + lines.join('\n'))
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao exportar votos.' })
    }
  },

  async exportParticipation(req, res) {
    try {
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const rows = await VoterParticipation.find({ votationId: vot._id })
        .populate('servidorId', 'matricula nome setor cargoFuncao cpfLast4')
        .sort({ votedAt: 1 })
        .lean()
      const lines = ['voted_at,matricula,nome,setor,cargo,cpf_masked']
      for (const r of rows) {
        const s = r.servidorId || {}
        lines.push(
          [
            csvEscape(r.votedAt?.toISOString?.() || ''),
            csvEscape(s.matricula || ''),
            csvEscape(s.nome || ''),
            csvEscape(s.setor || ''),
            csvEscape(s.cargoFuncao || ''),
            csvEscape(s.cpfLast4 ? `***.***.***-${s.cpfLast4}` : ''),
          ].join(',')
        )
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="pleito-${vot._id}-comparecimento.csv"`)
      return res.send('\uFEFF' + lines.join('\n'))
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao exportar comparecimento.' })
    }
  },

  async getElectionDetail(req, res) {
    try {
      const v = await Votation.findById(req.params.id).lean()
      if (!v) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const categories = await VotingCategory.find({ votationId: v._id }).sort({ order: 1, name: 1 }).lean()
      const candidates = await VotingCandidate.find({ votationId: v._id }).sort({ order: 1, number: 1 }).lean()
      const participants = await VoterParticipation.countDocuments({ votationId: v._id })
      const eligible = await VotingServidor.countDocuments({ active: { $ne: false } })
      return res.json({
        votation: v,
        categories,
        candidates,
        stats: { participants, eligible, abstentions: Math.max(0, eligible - participants) },
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao carregar pleito.' })
    }
  },
}
