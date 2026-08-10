const crypto = require('crypto')
const VotingServidor = require('../models/VotingServidor')
const VotingRefreshToken = require('../models/VotingRefreshToken')
const validateCPF = require('../helpers/validate-cpf')
const { onlyDigits, findServidorByCpf, cpfLast4 } = require('../helpers/voting-identity-hash')
const { findServidorByMatriculaAndCpf, findServidorByNomeAndCpf } = require('../helpers/voting-election-service')
const { hashRefresh, signAccess, issueVotingSession } = require('../helpers/voting-auth-session')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')

const ACCESS_TTL = process.env.VOTACAO_ACCESS_TTL || '15m'
const REFRESH_TTL_DAYS = parseInt(process.env.VOTACAO_REFRESH_DAYS || '7', 10)
module.exports = {
  async login(req, res) {
    try {
      const { cpf, nome, matricula } = req.body || {}
      const cpfClean = onlyDigits(cpf)
      if (!cpfClean || !validateCPF(cpfClean)) {
        void recordVoteEvent(req, {
          action: 'auth.login_failed',
          resourceType: 'servidor',
          eventType: 'SECURITY',
          status: 'denied',
          meta: { reason: 'invalid_cpf' },
        })
        return res.status(422).json({ message: 'CPF inválido.' })
      }

      let doc = null
      if (nome && String(nome).trim()) {
        doc = await findServidorByNomeAndCpf(nome, cpfClean)
        if (!doc) {
          void recordVoteEvent(req, {
            action: 'auth.login_failed',
            resourceType: 'servidor',
            eventType: 'SECURITY',
            status: 'denied',
            meta: { reason: 'nome_cpf_mismatch', cpfLast4: cpfLast4(cpfClean) },
          })
          return res.status(401).json({ message: 'Nome e CPF não conferem com a base de eleitores.' })
        }
      } else if (matricula && String(matricula).trim()) {
        doc = await findServidorByMatriculaAndCpf(matricula, cpfClean)
        if (!doc) {
          void recordVoteEvent(req, {
            action: 'auth.login_failed',
            resourceType: 'servidor',
            eventType: 'SECURITY',
            status: 'denied',
            meta: { reason: 'matricula_cpf_mismatch', cpfLast4: cpfLast4(cpfClean) },
          })
          return res.status(401).json({ message: 'Matrícula e CPF não conferem com a base de eleitores.' })
        }
      } else {
        doc = await findServidorByCpf(VotingServidor, cpfClean)
        if (!doc) {
          void recordVoteEvent(req, {
            action: 'auth.login_failed',
            resourceType: 'servidor',
            eventType: 'SECURITY',
            status: 'denied',
            meta: { reason: 'cpf_not_found', cpfLast4: cpfLast4(cpfClean) },
          })
          return res.status(401).json({ message: 'CPF não encontrado na base de servidores habilitados.' })
        }
      }
      const accessToken = signAccess(doc._id)
      const rawRefresh = crypto.randomBytes(48).toString('hex')
      const tokenHash = hashRefresh(rawRefresh)
      const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000)
      await VotingRefreshToken.create({ servidorId: doc._id, tokenHash, expiresAt })

      req.votingUser = { sid: doc._id.toString(), nome: doc.nome || '' }
      void recordVoteEvent(req, {
        action: 'auth.login_success',
        resourceType: 'servidor',
        resourceId: doc._id,
        eventType: 'LOGIN',
        actor: { _id: doc._id, id: doc._id, name: doc.nome || 'Servidor', role: 'votacao_servidor' },
      })

      return res.status(200).json({
        message: 'Autenticado',
        accessToken,
        refreshToken: rawRefresh,
        expiresIn: ACCESS_TTL,
        nome: doc.nome || '',
      })
    } catch (e) {
      console.error('[VotingAuth.login]', e)
      return res.status(500).json({ message: 'Erro ao autenticar.' })
    }
  },

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body || {}
      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(422).json({ message: 'refreshToken obrigatório.' })
      }
      const tokenHash = hashRefresh(refreshToken)
      const row = await VotingRefreshToken.findOne({ tokenHash })
      if (!row || row.expiresAt < new Date()) {
        void recordVoteEvent(req, {
          action: 'auth.refresh_failed',
          resourceType: 'session',
          eventType: 'SECURITY',
          status: 'denied',
          meta: { reason: 'invalid_refresh_token' },
        })
        return res.status(401).json({ message: 'Sessão inválida ou expirada.' })
      }
      await VotingRefreshToken.deleteOne({ _id: row._id })
      const rawNew = crypto.randomBytes(48).toString('hex')
      const newHash = hashRefresh(rawNew)
      const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000)
      await VotingRefreshToken.create({ servidorId: row.servidorId, tokenHash: newHash, expiresAt })

      const accessToken = signAccess(row.servidorId)
      void recordVoteEvent(req, {
        action: 'auth.refresh_success',
        resourceType: 'session',
        resourceId: row.servidorId,
        eventType: 'LOGIN',
        actor: { _id: row.servidorId, id: row.servidorId, role: 'votacao_servidor' },
      })
      return res.status(200).json({
        accessToken,
        refreshToken: rawNew,
        expiresIn: ACCESS_TTL,
      })
    } catch (e) {
      console.error('[VotingAuth.refresh]', e)
      return res.status(500).json({ message: 'Erro ao renovar sessão.' })
    }
  },
}
