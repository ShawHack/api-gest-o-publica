const Votation = require('../models/Votation')
const VotingServidor = require('../models/VotingServidor')
const validateCPF = require('../helpers/validate-cpf')
const { onlyDigits, computeCpfHash, cpfLast4 } = require('../helpers/voting-identity-hash')
const { nowInRange, hasParticipated } = require('../helpers/voting-election-service')
const { issueVotingSession } = require('../helpers/voting-auth-session')
const { landingPath } = require('../helpers/voting-slug')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')

function publicVotationFields(v) {
  return {
    id: v._id,
    slug: v.slug,
    title: v.title,
    description: v.description || '',
    bannerUrl: v.bannerUrl || '',
    voterInstructions: v.voterInstructions || '',
    themeColor: v.themeColor || '#1e3a8a',
    startDate: v.startDate,
    endDate: v.endDate,
    status: v.status,
    landingUrl: landingPath(v.slug),
  }
}

module.exports = {
  async publicLanding(req, res) {
    try {
      const vot = await Votation.findOne({ slug: String(req.params.slug || '').trim().toLowerCase() }).lean()
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })

      const inPeriod = nowInRange(vot)
      const votingOpen = vot.status === 'active' && inPeriod

      return res.json({
        ...publicVotationFields(vot),
        inPeriod,
        votingOpen,
        locked: !votingOpen,
      })
    } catch (e) {
      console.error('[VotingLanding.publicLanding]', e)
      return res.status(500).json({ message: 'Erro ao carregar página do pleito.' })
    }
  },

  async unlockWithCpf(req, res) {
    try {
      const slug = String(req.params.slug || '').trim().toLowerCase()
      const { cpf } = req.body || {}
      const vot = await Votation.findOne({ slug })
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })

      if (vot.status !== 'active') {
        return res.status(403).json({
          reason: 'not_active',
          message: 'Este pleito ainda não está aberto para votação.',
        })
      }
      if (!nowInRange(vot)) {
        const now = Date.now()
        const startLabel = new Date(vot.startDate).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        })
        const message =
          now < +vot.startDate
            ? `A votação se inicia às ${startLabel}. Aguarde o horário oficial para votar.`
            : 'O período de votação deste pleito já foi encerrado.'
        return res.status(403).json({
          reason: now < +vot.startDate ? 'not_started' : 'ended',
          message,
          startDate: vot.startDate,
          endDate: vot.endDate,
        })
      }

      const cpfClean = onlyDigits(cpf)
      if (!cpfClean || !validateCPF(cpfClean)) {
        void recordVoteEvent(req, {
          votationId: vot._id,
          action: 'auth.unlock_failed',
          resourceType: 'servidor',
          eventType: 'SECURITY',
          status: 'denied',
          meta: { reason: 'invalid_cpf', slug },
        })
        return res.status(422).json({ reason: 'invalid_cpf', message: 'CPF inválido. Verifique os números informados.' })
      }

      const doc = await VotingServidor.findOne({
        cpfHash: computeCpfHash(cpfClean),
        active: { $ne: false },
      })
      if (!doc) {
        void recordVoteEvent(req, {
          votationId: vot._id,
          action: 'auth.unlock_failed',
          resourceType: 'servidor',
          eventType: 'SECURITY',
          status: 'denied',
          meta: { reason: 'not_eligible', cpfLast4: cpfLast4(cpfClean), slug },
        })
        return res.status(401).json({
          reason: 'not_eligible',
          message: 'CPF não consta na lista de servidores habilitados a votar.',
        })
      }

      const voted = await hasParticipated(vot._id, doc._id)
      if (voted) {
        void recordVoteEvent(req, {
          votationId: vot._id,
          action: 'auth.unlock_failed',
          resourceType: 'servidor',
          resourceId: doc._id,
          eventType: 'SECURITY',
          status: 'denied',
          meta: { reason: 'already_voted', slug },
        })
        return res.status(409).json({
          reason: 'already_voted',
          message: 'Você já registrou seu voto neste pleito.',
          voted: true,
        })
      }

      // Opcional: captura/atualiza WhatsApp e e-mail para canhoto (e WA de resultado).
      const { whatsapp, email } = req.body || {}
      let dirty = false
      const phoneDigits = String(whatsapp || '').replace(/\D/g, '')
      if (phoneDigits.length >= 10) {
        doc.whatsapp = phoneDigits
        doc.whatsappOptIn = true
        dirty = true
      }
      const emailNorm = String(email || '')
        .trim()
        .toLowerCase()
      if (emailNorm && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        doc.email = emailNorm
        doc.emailOptIn = true
        dirty = true
      }
      if (dirty) await doc.save()

      const session = await issueVotingSession(doc._id, doc.nome || '')
      req.votingUser = { sid: doc._id.toString(), nome: doc.nome || '' }
      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'auth.unlock_success',
        resourceType: 'servidor',
        resourceId: doc._id,
        eventType: 'LOGIN',
        actor: { _id: doc._id, id: doc._id, name: doc.nome || 'Servidor', role: 'votacao_servidor' },
        meta: { slug, hasWhatsapp: !!doc.whatsapp, hasEmail: !!doc.email },
      })

      return res.status(200).json({
        message: 'Identificação confirmada. Você pode votar.',
        unlocked: true,
        votationId: String(vot._id),
        ...session,
        pleito: publicVotationFields(vot),
        nome: doc.nome || '',
        needsWhatsapp: !doc.whatsapp,
        needsEmail: !doc.email,
      })
    } catch (e) {
      console.error('[VotingLanding.unlockWithCpf]', e)
      return res.status(500).json({ message: 'Erro ao validar CPF.' })
    }
  },
}
