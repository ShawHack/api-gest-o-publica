const bcrypt = require('bcrypt')
const User = require('../models/User')
const { collectSubjectData, eraseSubjectData } = require('../helpers/lgpd-subject')

function actorId(req) {
  return String(req.user?.id || req.user?._id || '')
}

module.exports = class LgpdController {
  /** GET /lgpd/me/export — titular exporta próprios dados */
  static async exportMe(req, res) {
    try {
      if (!actorId(req)) return res.status(401).json({ message: 'Não autenticado.' })

      const data = await collectSubjectData(actorId(req))
      if (!data) return res.status(404).json({ message: 'Usuário não encontrado.' })

      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="lgpd-export-${actorId(req)}-${Date.now()}.json"`
      )
      return res.status(200).send(JSON.stringify(data, null, 2))
    } catch (err) {
      console.error('[Lgpd.exportMe]', err)
      return res.status(500).json({ message: 'Erro ao exportar dados.' })
    }
  }

  /** GET /lgpd/users/:userId/export — admin exporta dados de um titular */
  static async exportUser(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Somente administrador.' })
      }

      const userId = req.params.userId
      const data = await collectSubjectData(userId)
      if (!data) return res.status(404).json({ message: 'Usuário não encontrado.' })

      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="lgpd-export-${userId}-${Date.now()}.json"`
      )
      return res.status(200).send(JSON.stringify(data, null, 2))
    } catch (err) {
      console.error('[Lgpd.exportUser]', err)
      return res.status(500).json({ message: 'Erro ao exportar dados.' })
    }
  }

  /** POST /lgpd/me/delete — titular solicita exclusão (anonimização) */
  static async deleteMe(req, res) {
    try {
      if (!actorId(req)) return res.status(401).json({ message: 'Não autenticado.' })

      const { password, confirm } = req.body || {}
      if (confirm !== 'EXCLUIR') {
        return res.status(422).json({
          message: 'Confirme com confirm: "EXCLUIR" no corpo da requisição.',
        })
      }
      if (!password) {
        return res.status(422).json({ message: 'Senha atual obrigatória.' })
      }

      const full = await User.findById(actorId(req))
      const match = await bcrypt.compare(password, full.password)
      if (!match) {
        return res.status(422).json({ message: 'Senha incorreta.' })
      }

      const result = await eraseSubjectData(actorId(req), { actorReq: req })
      return res.status(200).json({
        message:
          'Conta anonimizada conforme LGPD. Registros públicos do memorial podem permanecer sem dados pessoais do titular.',
        ...result,
      })
    } catch (err) {
      console.error('[Lgpd.deleteMe]', err)
      return res.status(500).json({ message: 'Erro ao processar exclusão.' })
    }
  }

  /** POST /lgpd/users/:userId/delete — admin anonimiza titular */
  static async deleteUser(req, res) {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Somente administrador.' })
      }

      const userId = req.params.userId
      if (actorId(req) === String(userId)) {
        return res.status(400).json({ message: 'Use o fluxo do titular para sua própria conta.' })
      }

      const { confirm } = req.body || {}
      if (confirm !== 'EXCLUIR') {
        return res.status(422).json({ message: 'Confirme com confirm: "EXCLUIR".' })
      }

      const result = await eraseSubjectData(userId, { actorReq: req })
      if (!result.ok) {
        return res.status(404).json({ message: 'Usuário não encontrado.' })
      }
      return res.status(200).json({
        message: 'Titular anonimizado (LGPD).',
        ...result,
      })
    } catch (err) {
      console.error('[Lgpd.deleteUser]', err)
      return res.status(500).json({ message: 'Erro ao processar exclusão.' })
    }
  }
}
