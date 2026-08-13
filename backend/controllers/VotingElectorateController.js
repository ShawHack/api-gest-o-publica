const VotingElectorateBase = require('../models/VotingElectorateBase')
const VotingElector = require('../models/VotingElector')
const VotingServidor = require('../models/VotingServidor')
const Votation = require('../models/Votation')
const { parseElectorCsv } = require('../helpers/voting-electorate-service')
const validateCPF = require('../helpers/validate-cpf')
const { onlyDigits, computeCpfHash, cpfLast4 } = require('../helpers/voting-identity-hash')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')

const userIdOf = (req) => req.user?._id || req.user?.id

function electorPayload(body = {}, { requireCpf = false } = {}) {
  const name = String(body.name || '').trim()
  const identifier = String(body.identifier || '').trim()
  const cpf = onlyDigits(body.cpf)
  if (name.length < 3) return { error: 'Informe o nome completo do eleitor.' }
  if (!identifier) return { error: 'Informe o identificador ou matrÃ­cula.' }
  if (requireCpf && !cpf) return { error: 'Informe o CPF do eleitor.' }
  if (cpf && !validateCPF(cpf)) return { error: 'CPF invÃ¡lido.' }
  return {
    data: {
      name,
      identifier,
      email: String(body.email || '').trim().toLowerCase(),
      phone: onlyDigits(body.phone),
      group: String(body.group || '').trim(),
      role: String(body.role || '').trim(),
      ...(cpf ? {
        cpfHash: computeCpfHash(cpf),
        cpfLast4: cpfLast4(cpf),
        identityHash: computeCpfHash(`${cpf}|${identifier}`),
      } : {}),
    },
  }
}

function publicElector(row) {
  return {
    id: String(row._id), identifier: row.identifier, name: row.name,
    cpfLast4: row.cpfLast4, email: row.email, phone: row.phone,
    group: row.group, role: row.role, active: row.active !== false,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  }
}

function accentInsensitivePattern(value) {
  const groups = { a: '[aÃ¡Ã Ã¢Ã£Ã¤]', e: '[eÃ©Ã¨ÃªÃ«]', i: '[iÃ­Ã¬Ã®Ã¯]', o: '[oÃ³Ã²Ã´ÃµÃ¶]', u: '[uÃºÃ¹Ã»Ã¼]', c: '[cÃ§]' }
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('').map((ch) => groups[ch.toLowerCase()] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')
}

module.exports = {
  async list(req, res) {
    const bases = await VotingElectorateBase.find({ status: { $ne: 'archived' } }).sort({ createdAt: -1 }).lean()
    const importedCounts = await VotingElector.aggregate([{ $group: { _id: '$electorateBaseId', count: { $sum: 1 } } }])
    const counts = new Map(importedCounts.map((x) => [String(x._id), x.count]))
    const legacyCount = await VotingServidor.countDocuments({ active: { $ne: false } })
    return res.json({ bases: [
      { id: 'legacy-servidores', name: 'Servidores públicos municipais', type: 'legacy_servidores', electorCount: legacyCount },
      ...bases.map((b) => ({ id: String(b._id), name: b.name, description: b.description, type: b.type, electorCount: counts.get(String(b._id)) || 0, createdAt: b.createdAt })),
    ] })
  },

  async createAndImport(req, res) {
    try {
      const name = String(req.body?.name || '').trim()
      const description = String(req.body?.description || '').trim()
      const csv = String(req.body?.csv || '')
      if (name.length < 3) return res.status(422).json({ message: 'Informe o nome da base eleitoral.' })
      const parsed = parseElectorCsv(csv)
      if (!parsed.rows.length) return res.status(422).json({ message: 'Nenhum eleitor válido encontrado.', errors: parsed.errors })
      const base = await VotingElectorateBase.create({ name, description, type: 'imported', createdBy: userIdOf(req) })
      try {
        await VotingElector.insertMany(parsed.rows.map(({ line, ...row }) => ({ ...row, electorateBaseId: base._id })), { ordered: false })
      } catch (e) {
        if (e.code !== 11000) throw e
      }
      const imported = await VotingElector.countDocuments({ electorateBaseId: base._id })
      void recordVoteEvent(req, { action: 'admin.electorate_import', resourceType: 'voting_electorate_base', resourceId: base._id, eventType: 'CREATE', meta: { imported, errors: parsed.errors.length } })
      return res.status(201).json({ base: { id: String(base._id), name: base.name, type: base.type, electorCount: imported }, imported, errors: parsed.errors })
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Já existe uma base eleitoral com esse nome.' })
      console.error('[VotingElectorate.createAndImport]', e)
      return res.status(500).json({ message: 'Erro ao importar base eleitoral.' })
    }
  },

  async listElectors(req, res) {
    const base = await VotingElectorateBase.findOne({ _id: req.params.baseId, status: { $ne: 'archived' } }).lean()
    if (!base) return res.status(404).json({ message: 'Base eleitoral nÃ£o encontrada.' })
    const search = String(req.query?.search || '').trim()
    const query = { electorateBaseId: base._id, active: { $ne: false } }
    if (search) {
      const escaped = accentInsensitivePattern(search)
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { identifier: { $regex: escaped, $options: 'i' } },
      ]
    }
    const electors = await VotingElector.find(query).sort({ name: 1, identifier: 1 }).limit(500).lean()
    return res.json({ base: { id: String(base._id), name: base.name }, electors: electors.map(publicElector) })
  },

  async createElector(req, res) {
    try {
      const base = await VotingElectorateBase.findOne({ _id: req.params.baseId, status: 'active' })
      if (!base) return res.status(404).json({ message: 'Base eleitoral nÃ£o encontrada.' })
      const parsed = electorPayload(req.body, { requireCpf: true })
      if (parsed.error) return res.status(422).json({ message: parsed.error })
      const elector = await VotingElector.create({ ...parsed.data, electorateBaseId: base._id, active: true })
      void recordVoteEvent(req, { action: 'admin.electorate_elector_create', resourceType: 'voting_elector', resourceId: elector._id, eventType: 'CREATE', meta: { electorateBaseId: String(base._id) } })
      return res.status(201).json({ elector: publicElector(elector) })
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'CPF ou identificador jÃ¡ cadastrado nesta base.' })
      console.error('[VotingElectorate.createElector]', e)
      return res.status(500).json({ message: 'Erro ao adicionar eleitor.' })
    }
  },

  async updateElector(req, res) {
    try {
      const elector = await VotingElector.findOne({ _id: req.params.electorId, electorateBaseId: req.params.baseId, active: { $ne: false } })
      if (!elector) return res.status(404).json({ message: 'Eleitor nÃ£o encontrado.' })
      const parsed = electorPayload(req.body)
      if (parsed.error) return res.status(422).json({ message: parsed.error })
      const before = publicElector(elector)
      Object.assign(elector, parsed.data)
      await elector.save()
      const after = publicElector(elector)
      void recordVoteEvent(req, { action: 'admin.electorate_elector_update', resourceType: 'voting_elector', resourceId: elector._id, before, after, meta: { electorateBaseId: String(elector.electorateBaseId) } })
      return res.json({ elector: after })
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'CPF ou identificador jÃ¡ cadastrado nesta base.' })
      console.error('[VotingElectorate.updateElector]', e)
      return res.status(500).json({ message: 'Erro ao atualizar eleitor.' })
    }
  },

  async deleteElector(req, res) {
    const elector = await VotingElector.findOne({ _id: req.params.electorId, electorateBaseId: req.params.baseId, active: { $ne: false } })
    if (!elector) return res.status(404).json({ message: 'Eleitor nÃ£o encontrado.' })
    elector.active = false
    await elector.save()
    void recordVoteEvent(req, { action: 'admin.electorate_elector_deactivate', resourceType: 'voting_elector', resourceId: elector._id, eventType: 'DELETE', meta: { electorateBaseId: String(elector.electorateBaseId) } })
    return res.json({ message: 'Eleitor excluÃ­do da base ativa.' })
  },

  async assign(req, res) {
    const vot = await Votation.findById(req.params.id)
    if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })
    if (vot.status !== 'draft') return res.status(422).json({ message: 'A base eleitoral só pode ser alterada enquanto o pleito estiver em rascunho.' })
    const baseId = String(req.body?.electorateBaseId || '')
    if (!baseId || baseId === 'legacy-servidores') vot.electorateBaseId = undefined
    else {
      const base = await VotingElectorateBase.findOne({ _id: baseId, status: 'active' })
      if (!base) return res.status(422).json({ message: 'Base eleitoral inválida.' })
      vot.electorateBaseId = base._id
    }
    await vot.save()
    return res.json({ votation: vot })
  },
}
