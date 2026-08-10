const Votation = require('../models/Votation')
const VotingServidor = require('../models/VotingServidor')
const VotingCategory = require('../models/VotingCategory')
const VotingCandidate = require('../models/VotingCandidate')
const {
  buildBallot,
  submitBallot,
  hasParticipated,
  assertElectionActive,
  tallyElection,
} = require('../helpers/voting-election-service')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')
const { notifyBallotReceipt } = require('../helpers/votacao-notifier')

async function buildChoiceLines(votationId, choiceMap) {
  const categories = await VotingCategory.find({ votationId }).lean()
  const candidates = await VotingCandidate.find({ votationId }).lean()
  const catById = new Map(categories.map((c) => [String(c._id), c]))
  const candById = new Map(candidates.map((c) => [String(c._id), c]))

  const lines = []
  for (const [categoryId, choice] of Object.entries(choiceMap || {})) {
    const cat = catById.get(String(categoryId))
    const categoryName = cat?.name || 'Cargo'
    let label = '—'
    if (choice.voteType === 'blank') label = 'Voto em branco'
    else if (choice.voteType === 'null') label = 'Voto nulo'
    else if (choice.voteType === 'candidate' && choice.candidateId) {
      const cand = candById.get(String(choice.candidateId))
      label = cand
        ? `${cand.number != null ? cand.number + ' — ' : ''}${cand.name}`
        : 'Candidato'
    }
    lines.push({ categoryName, label })
  }
  // Ordena pela ordem das categorias
  lines.sort((a, b) => {
    const oa = categories.find((c) => c.name === a.categoryName)?.order ?? 0
    const ob = categories.find((c) => c.name === b.categoryName)?.order ?? 0
    return oa - ob
  })
  return lines
}

module.exports = {
  async ballot(req, res) {
    try {
      const active = await assertElectionActive(req.params.id)
      if (active.error) return res.status(active.error.status).json({ message: active.error.message })

      const participated = await hasParticipated(req.params.id, req.votingUser.sid)
      if (participated) {
        return res.status(409).json({ message: 'Voto já registrado para este pleito.', voted: true })
      }

      const ballot = await buildBallot(req.params.id)
      if (ballot.error) return res.status(ballot.error.status).json({ message: ballot.error.message })

      const v = active.votation
      return res.json({
        votation: {
          id: v._id,
          title: v.title,
          description: v.description,
          startDate: v.startDate,
          endDate: v.endDate,
        },
        ballot: ballot.categories,
        voted: false,
      })
    } catch (e) {
      console.error('[VotingBallot.ballot]', e)
      return res.status(500).json({ message: 'Erro ao carregar cédula.' })
    }
  },

  async submit(req, res) {
    try {
      const { choices } = req.body || {}
      const result = await submitBallot({
        votationId: req.params.id,
        servidorId: req.votingUser.sid,
        choices,
      })
      if (result.error) {
        return res.status(result.error.status).json({ message: result.error.message })
      }

      void recordVoteEvent(req, {
        votationId: req.params.id,
        action: 'vote_ballot_submit',
        resourceType: 'votation',
        resourceId: req.params.id,
        eventType: 'CREATE',
        actor: { _id: req.votingUser.sid, role: 'votacao_servidor' },
        meta: { choiceCount: Array.isArray(choices) ? choices.length : 0 },
      })

      // Canhoto WhatsApp e/ou e-mail (efêmero — não grava choices no comparecimento).
      void (async () => {
        try {
          const [votation, servidor, choiceLines] = await Promise.all([
            Votation.findById(req.params.id).lean(),
            VotingServidor.findById(req.votingUser.sid)
              .select('nome whatsapp whatsappOptIn email emailOptIn')
              .lean(),
            buildChoiceLines(req.params.id, result.choiceMap),
          ])
          await notifyBallotReceipt({
            votation,
            servidor,
            participationId: result.participationId,
            choiceLines,
            votedAt: result.votedAt,
          })
        } catch (err) {
          console.error('[VotingBallot.submit] canhoto:', err?.message || err)
        }
      })()

      return res.status(201).json({
        message: 'Voto registrado com sucesso. Obrigado pela participação.',
        receipt: 'queued_if_configured',
      })
    } catch (e) {
      console.error('[VotingBallot.submit]', e)
      return res.status(500).json({ message: 'Erro ao registrar voto.' })
    }
  },

  async myStatus(req, res) {
    try {
      const v = await Votation.findById(req.params.id).lean()
      if (!v) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const voted = await hasParticipated(v._id, req.votingUser.sid)
      return res.json({ voted })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao consultar status.' })
    }
  },

  async publicResults(req, res) {
    try {
      const v = await Votation.findById(req.params.id).lean()
      if (!v) return res.status(404).json({ message: 'Pleito não encontrado.' })
      if (v.status !== 'closed' && !v.allowPartialResults) {
        return res.status(403).json({
          message: 'Resultado disponível apenas após encerramento.',
          closed: false,
        })
      }
      const tally = await tallyElection(v._id)
      return res.json({
        votation: { id: v._id, title: v.title, status: v.status, slug: v.slug },
        partial: v.status !== 'closed',
        ...tally,
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro na apuração.' })
    }
  },
}
