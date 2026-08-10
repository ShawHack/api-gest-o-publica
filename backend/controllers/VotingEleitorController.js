const mongoose = require('mongoose')
const Votation = require('../models/Votation')
const VotingCandidate = require('../models/VotingCandidate')
const Vote = require('../models/Vote')
const VoterParticipation = require('../models/VoterParticipation')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')

function nowInRange(v) {
  const n = Date.now()
  return n >= +v.startDate && n <= +v.endDate
}

async function tally(votationId) {
  const rows = await Vote.aggregate([
    { $match: { votationId: new mongoose.Types.ObjectId(String(votationId)) } },
    { $group: { _id: '$candidateId', count: { $sum: 1 } } },
  ])
  const map = {}
  let total = 0
  rows.forEach((r) => {
    map[r._id] = r.count
    total += r.count
  })
  return { map, total }
}

module.exports = {
  async publicStatus(req, res) {
    try {
      const n = new Date()
      const list = await Votation.find({
        status: 'active',
        startDate: { $lte: n },
        endDate: { $gte: n },
      })
        .sort({ startDate: -1 })
        .select('title description startDate endDate status')
        .lean()
      return res.json({
        hasActiveElection: list.length > 0,
        activeCount: list.length,
        votations: list,
        adminUrl: '/votacao/admin',
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao consultar status.' })
    }
  },

  async listActive(req, res) {
    try {
      const n = new Date()
      const list = await Votation.find({
        status: 'active',
        startDate: { $lte: n },
        endDate: { $gte: n },
      })
        .sort({ startDate: -1 })
        .select('title description startDate endDate status')
        .lean()
      return res.json({ votations: list })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao listar votações.' })
    }
  },

  async getOne(req, res) {
    try {
      const v = await Votation.findById(req.params.id).lean()
      if (!v) return res.status(404).json({ message: 'Votação não encontrada.' })
      if (v.status !== 'active') {
        return res.status(403).json({ message: 'Votação não está ativa.' })
      }
      if (!nowInRange(v)) {
        return res.status(403).json({ message: 'Fora do período de votação.' })
      }
      const candidates = await VotingCandidate.find({ votationId: v._id })
        .sort({ order: 1, name: 1 })
        .select('candidateId name photoUrl order')
        .lean()
      return res.json({ votation: v, candidates })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao carregar.' })
    }
  },

  async myVoteStatus(req, res) {
    try {
      const v = await Votation.findById(req.params.id).lean()
      if (!v) return res.status(404).json({ message: 'Votação não encontrada.' })
      const participated = await VoterParticipation.findOne({
        votationId: v._id,
        servidorId: req.votingUser.sid,
      })
        .select('votedAt')
        .lean()
      if (participated) {
        return res.json({ voted: true, ballotVersion: 2, votedAt: participated.votedAt })
      }
      const userHash = req.votingUser.userHash
      const vote = await Vote.findOne({ votationId: v._id, userHash }).select('candidateId createdAt').lean()
      return res.json({
        voted: !!vote,
        ballotVersion: vote ? 1 : null,
        candidateId: vote?.candidateId || null,
        createdAt: vote?.createdAt || null,
      })
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao consultar.' })
    }
  },

  async results(req, res) {
    try {
      const v = await Votation.findById(req.params.id).lean()
      if (!v) return res.status(404).json({ message: 'Votação não encontrada.' })
      /** Resultado completo após encerramento; apuração parcial só se allowPartialResults */
      if (v.status !== 'closed' && !v.allowPartialResults) {
        return res.status(403).json({
          message: 'Resultado completo disponível apenas após encerramento.',
          closed: false,
        })
      }

      const candidates = await VotingCandidate.find({ votationId: v._id }).sort({ order: 1, name: 1 }).lean()
      const { map, total } = await tally(v._id)
      const rows = candidates.map((c) => {
        const ccount = map[c.candidateId] || 0
        const pct = total > 0 ? Math.round((ccount * 10000) / total) / 100 : 0
        return {
          candidateId: c.candidateId,
          name: c.name,
          photoUrl: c.photoUrl,
          votes: ccount,
          percent: pct,
        }
      })
      void recordVoteEvent(req, {
        votationId: v._id,
        action: 'results_view',
        resourceType: 'votation',
        eventType: 'VIEW',
        meta: { partial: v.status !== 'closed', totalVotes: total },
        userHash: req.votingUser?.userHash,
      })

      return res.json({
        votation: { id: v._id, title: v.title, status: v.status, endDate: v.endDate },
        totalVotes: total,
        partial: v.status !== 'closed',
        candidates: rows,
      })
    } catch (e) {
      console.error('[VotingEleitor.results]', e)
      return res.status(500).json({ message: 'Erro ao apurar.' })
    }
  },

  async vote(req, res) {
    const { candidateId } = req.body || {}
    const idemKey = (req.headers['idempotency-key'] || req.body?.idempotencyKey || '').trim()

    if (!candidateId || typeof candidateId !== 'string') {
      return res.status(422).json({ message: 'candidateId obrigatório.' })
    }

    try {
      const v = await Votation.findById(req.params.id)
      if (!v) return res.status(404).json({ message: 'Votação não encontrada.' })
      if (v.status !== 'active') {
        return res.status(403).json({ message: 'Votação não está ativa.' })
      }
      if (!nowInRange(v)) {
        return res.status(403).json({ message: 'Fora do período de votação.' })
      }

      const cand = await VotingCandidate.findOne({
        votationId: v._id,
        candidateId: String(candidateId).trim(),
      })
      if (!cand) {
        return res.status(422).json({ message: 'Candidato inválido para esta votação.' })
      }

      const userHash = req.votingUser.userHash

      if (idemKey) {
        const existing = await Vote.findOne({ votationId: v._id, idempotencyKey: idemKey })
        if (existing) {
          if (existing.userHash === userHash && existing.candidateId === cand.candidateId) {
            return res.status(200).json({
              message: 'Voto já registrado (idempotência).',
              candidateId: cand.candidateId,
              already: true,
            })
          }
          return res.status(409).json({ message: 'Chave de idempotência já utilizada com outro voto.' })
        }
      }

      try {
        await Vote.create({
          votationId: v._id,
          candidateId: cand.candidateId,
          userHash,
          ...(idemKey ? { idempotencyKey: idemKey } : {}),
        })
      } catch (e) {
        if (e.code === 11000) {
          void recordVoteEvent(req, {
            votationId: v._id,
            userHash,
            action: 'vote_duplicate_blocked',
            detail: 'unique_votation_user',
            eventType: 'SECURITY',
            status: 'denied',
            meta: { candidateId: cand.candidateId },
          })
          return res.status(409).json({ message: 'Voto já registrado para esta votação.' })
        }
        throw e
      }

      void recordVoteEvent(req, {
        votationId: v._id,
        userHash,
        action: 'vote_cast',
        detail: `candidateId=${cand.candidateId}`,
        eventType: 'CREATE',
        meta: { candidateId: cand.candidateId },
      })

      return res.status(201).json({
        message: 'Voto registrado com sucesso.',
        candidateId: cand.candidateId,
        already: false,
      })
    } catch (e) {
      console.error('[VotingEleitor.vote]', e)
      return res.status(500).json({ message: 'Erro ao registrar voto.' })
    }
  },
}
