const mongoose = require('mongoose')
const Votation = require('../models/Votation')
const VotingCategory = require('../models/VotingCategory')
const VotingCandidate = require('../models/VotingCandidate')
const VotingServidor = require('../models/VotingServidor')
const VoterParticipation = require('../models/VoterParticipation')
const Vote = require('../models/Vote')
const validateCPF = require('./validate-cpf')
const {
  onlyDigits,
  computeCpfHash,
  matriculaLookupValues,
  normalizeNomeForLogin,
} = require('./voting-identity-hash')

function nowInRange(v) {
  const n = Date.now()
  return n >= +v.startDate && n <= +v.endDate
}

async function findServidorByMatriculaAndCpf(matricula, cpf) {
  const cpfClean = onlyDigits(cpf)
  if (!cpfClean || !validateCPF(cpfClean)) return null

  const cpfHash = computeCpfHash(cpfClean)
  const variants = matriculaLookupValues(matricula)
  if (!variants.length) return null

  const doc = await VotingServidor.findOne({
    cpfHash,
    matricula: { $in: variants },
    active: { $ne: false },
  })

  return doc || null
}

async function findServidorByNomeAndCpf(nome, cpf) {
  const cpfClean = onlyDigits(cpf)
  if (!cpfClean || !validateCPF(cpfClean)) return null

  const nomeNorm = normalizeNomeForLogin(nome)
  if (!nomeNorm) return null

  const cpfHash = computeCpfHash(cpfClean)
  const rows = await VotingServidor.find({
    cpfHash,
    active: { $ne: false },
  })

  for (const doc of rows) {
    if (normalizeNomeForLogin(doc.nome) === nomeNorm) return doc
  }
  return null
}

async function assertElectionActive(votationId) {
  const v = await Votation.findById(votationId).lean()
  if (!v) return { error: { status: 404, message: 'Pleito não encontrado.' } }
  if (v.status !== 'active') {
    return { error: { status: 403, message: 'Pleito não está ativo.' } }
  }
  if (!nowInRange(v)) {
    return { error: { status: 403, message: 'Fora do período de votação.' } }
  }
  return { votation: v }
}

async function hasParticipated(votationId, servidorId) {
  const row = await VoterParticipation.findOne({ votationId, servidorId }).lean()
  return !!row
}

async function buildBallot(votationId) {
  const categories = await VotingCategory.find({ votationId, active: { $ne: false } })
    .sort({ order: 1, name: 1 })
    .lean()

  if (!categories.length) {
    return { error: { status: 422, message: 'Pleito sem categorias/cargos configurados.' } }
  }

  const candidates = await VotingCandidate.find({
    votationId,
    active: { $ne: false },
    categoryId: { $in: categories.map((c) => c._id) },
  })
    .sort({ order: 1, number: 1, name: 1 })
    .lean()

  const byCategory = categories.map((cat) => ({
    id: String(cat._id),
    name: cat.name,
    description: cat.description,
    order: cat.order,
    candidates: candidates
      .filter((c) => String(c.categoryId) === String(cat._id))
      .map((c) => ({
        id: String(c._id),
        number: c.number,
        name: c.name,
        photoUrl: c.photoUrl || '',
        description: c.description || '',
      })),
  }))

  return { categories: byCategory }
}

/**
 * choices: [{ categoryId, voteType: 'candidate'|'blank'|'null', candidateId? }]
 */
async function submitBallot({ votationId, servidorId, choices }) {
  const active = await assertElectionActive(votationId)
  if (active.error) return active

  if (await hasParticipated(votationId, servidorId)) {
    return { error: { status: 409, message: 'Voto já registrado para este pleito.' } }
  }

  const categories = await VotingCategory.find({ votationId, active: { $ne: false } }).lean()
  if (!categories.length) {
    return { error: { status: 422, message: 'Pleito sem categorias.' } }
  }

  const categoryIds = new Set(categories.map((c) => String(c._id)))
  const choiceMap = new Map()

  if (!Array.isArray(choices) || choices.length !== categories.length) {
    return {
      error: {
        status: 422,
        message: 'Informe exatamente uma escolha para cada cargo/categoria do pleito.',
      },
    }
  }

  for (const ch of choices) {
    const catId = String(ch.categoryId || '')
    if (!categoryIds.has(catId)) {
      return { error: { status: 422, message: 'Categoria inválida na cédula.' } }
    }
    if (choiceMap.has(catId)) {
      return { error: { status: 422, message: 'Categoria duplicada na cédula.' } }
    }

    const voteType = String(ch.voteType || '').toLowerCase()
    if (!['candidate', 'blank', 'null'].includes(voteType)) {
      return { error: { status: 422, message: 'Tipo de voto inválido.' } }
    }

    if (voteType === 'candidate') {
      if (!ch.candidateId) {
        return { error: { status: 422, message: 'Candidato obrigatório para voto nominal.' } }
      }
      const cand = await VotingCandidate.findOne({
        _id: ch.candidateId,
        votationId,
        categoryId: catId,
        active: { $ne: false },
      }).lean()
      if (!cand) {
        return { error: { status: 422, message: 'Candidato inválido para a categoria.' } }
      }
      choiceMap.set(catId, { voteType, candidateId: cand._id })
    } else {
      choiceMap.set(catId, { voteType, candidateId: null })
    }
  }

  const voteDocs = [...choiceMap.entries()].map(([categoryId, v]) => ({
    votationId,
    categoryId,
    voteType: v.voteType,
    candidateId: v.candidateId,
    ballotVersion: 2,
  }))

  try {
    const participation = await VoterParticipation.create({
      votationId,
      servidorId,
      votedAt: new Date(),
    })
    try {
      await Vote.insertMany(voteDocs)
      return {
        ok: true,
        participationId: participation._id,
        votedAt: participation.votedAt,
        choiceMap: Object.fromEntries(
          [...choiceMap.entries()].map(([categoryId, v]) => [
            categoryId,
            {
              voteType: v.voteType,
              candidateId: v.candidateId ? String(v.candidateId) : null,
            },
          ])
        ),
      }
    } catch (e) {
      await VoterParticipation.deleteOne({ votationId, servidorId }).catch(() => {})
      if (e.code === 11000) {
        return { error: { status: 409, message: 'Voto já registrado para este pleito.' } }
      }
      throw e
    }
  } catch (e) {
    if (e.code === 11000) {
      return { error: { status: 409, message: 'Voto já registrado para este pleito.' } }
    }
    throw e
  }
}

function normalizeWinnersCount(value, fallback = 1) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), 100)
}

/**
 * Seleciona os N primeiros por votos. Empates no corte do N-ésimo também são incluídos.
 */
function pickWinners(rankedCandidates, winnersCount) {
  const n = normalizeWinnersCount(winnersCount, 1)
  const withVotes = (rankedCandidates || []).filter((r) => Number(r.votes) > 0)
  if (!withVotes.length) return []
  if (withVotes.length <= n) {
    return withVotes.map((r, i) => ({ ...r, place: i + 1, isWinner: true }))
  }
  const cutoffVotes = withVotes[n - 1].votes
  const selected = withVotes.filter((r, i) => i < n || r.votes === cutoffVotes)
  return selected.map((r, i) => ({ ...r, place: i + 1, isWinner: true }))
}

async function tallyElection(votationId) {
  const categories = await VotingCategory.find({ votationId }).sort({ order: 1, name: 1 }).lean()
  const candidates = await VotingCandidate.find({ votationId }).lean()

  const voteFilter = {
    votationId: new mongoose.Types.ObjectId(String(votationId)),
    ballotVersion: 2,
  }

  const voteRows = await Vote.aggregate([
    { $match: voteFilter },
    {
      $group: {
        _id: { categoryId: '$categoryId', voteType: '$voteType', candidateId: '$candidateId' },
        count: { $sum: 1 },
      },
    },
  ])

  const participants = await VoterParticipation.countDocuments({ votationId })
  const eligible = await VotingServidor.countDocuments({ active: { $ne: false } })

  const categoryResults = categories.map((cat) => {
    const catVotes = voteRows.filter((r) => String(r._id.categoryId) === String(cat._id))
    const totalCategoryVotes = catVotes.reduce((s, r) => s + r.count, 0)
    const blank = catVotes.find((r) => r._id.voteType === 'blank')?.count || 0
    const nullVotes = catVotes.find((r) => r._id.voteType === 'null')?.count || 0

    const winnersCount = normalizeWinnersCount(cat.winnersCount, 1)
    const catCandidates = candidates.filter((c) => String(c.categoryId) === String(cat._id))
    const candidateRows = catCandidates.map((c) => {
      const count =
        catVotes.find(
          (r) => r._id.voteType === 'candidate' && String(r._id.candidateId) === String(c._id)
        )?.count || 0
      const percent = totalCategoryVotes > 0 ? Math.round((count * 10000) / totalCategoryVotes) / 100 : 0
      return {
        candidateId: String(c._id),
        number: c.number,
        name: c.name,
        photoUrl: c.photoUrl || '',
        votes: count,
        percent,
        isWinner: false,
        place: null,
      }
    })

    candidateRows.sort((a, b) => b.votes - a.votes || String(a.number).localeCompare(String(b.number)))
    const winners = pickWinners(candidateRows, winnersCount)
    const winnerIds = new Set(winners.map((w) => w.candidateId))
    candidateRows.forEach((row) => {
      const w = winners.find((x) => x.candidateId === row.candidateId)
      row.isWinner = winnerIds.has(row.candidateId)
      row.place = w ? w.place : null
    })

    const winner = winners[0] || null

    return {
      categoryId: String(cat._id),
      name: cat.name,
      winnersCount,
      totalVotes: totalCategoryVotes,
      blank,
      null: nullVotes,
      candidates: candidateRows,
      winners,
      winner,
    }
  })

  return {
    eligibleVoters: eligible,
    participants,
    abstentions: Math.max(0, eligible - participants),
    categories: categoryResults,
  }
}

module.exports = {
  nowInRange,
  findServidorByMatriculaAndCpf,
  findServidorByNomeAndCpf,
  assertElectionActive,
  hasParticipated,
  buildBallot,
  submitBallot,
  tallyElection,
  normalizeWinnersCount,
  pickWinners,
}
