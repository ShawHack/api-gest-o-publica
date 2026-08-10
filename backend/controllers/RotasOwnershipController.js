const UpaOwnership = require('../models/UpaOwnership')
const { recordAudit } = require('../helpers/audit-log')
const { isRotasAdmin } = require('../helpers/rotas-auth')

function userIdOf(req) {
  return req.user?._id || req.user?.id
}

module.exports = class RotasOwnershipController {
  static async requestOwnership(req, res) {
    try {
      const codigoUpa = String(req.body?.codigoUpa || '').trim()
      if (!codigoUpa) return res.status(422).json({ message: 'codigoUpa é obrigatório.' })

      const uid = userIdOf(req)
      let doc = await UpaOwnership.findOne({ userId: uid, codigoUpa })
      if (doc) {
        if (doc.status === 'revoked') {
          doc.status = 'pending'
          doc.note = String(req.body?.note || '')
          doc.reviewedBy = undefined
          doc.reviewedAt = undefined
          await doc.save()
        }
        return res.status(200).json(doc)
      }

      doc = await UpaOwnership.create({
        userId: uid,
        codigoUpa,
        status: 'pending',
        note: String(req.body?.note || ''),
      })

      void recordAudit(req, {
        action: 'rotas.ownership.request',
        resourceType: 'upa_ownership',
        resourceId: doc._id,
        module: 'rotas-rurais',
        metadata: { codigoUpa },
      })

      return res.status(201).json(doc)
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: 'Vínculo já existente para esta UPA.' })
      }
      console.error('[rotas] requestOwnership:', error)
      return res.status(500).json({ message: 'Erro ao solicitar vínculo com UPA.' })
    }
  }

  static async listMine(req, res) {
    try {
      const docs = await UpaOwnership.find({ userId: userIdOf(req) }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ items: docs })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar vínculos.' })
    }
  }

  static async listAdmin(req, res) {
    try {
      const status = req.query.status ? String(req.query.status) : undefined
      const filter = status ? { status } : {}
      const docs = await UpaOwnership.find(filter)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean()
      return res.status(200).json({ items: docs })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar vínculos (admin).' })
    }
  }

  static async review(req, res) {
    try {
      if (!isRotasAdmin(req.user)) {
        return res.status(403).json({ message: 'Sem permissão.' })
      }
      const status = String(req.body?.status || '')
      if (!['approved', 'revoked', 'pending'].includes(status)) {
        return res.status(422).json({ message: 'Status inválido.' })
      }

      const doc = await UpaOwnership.findById(req.params.id)
      if (!doc) return res.status(404).json({ message: 'Vínculo não encontrado.' })

      doc.status = status
      doc.reviewedBy = userIdOf(req)
      doc.reviewedAt = new Date()
      if (req.body?.note != null) doc.note = String(req.body.note)
      await doc.save()

      void recordAudit(req, {
        action: 'rotas.ownership.review',
        resourceType: 'upa_ownership',
        resourceId: doc._id,
        module: 'rotas-rurais',
        metadata: { status, codigoUpa: doc.codigoUpa },
      })

      return res.status(200).json(doc)
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao revisar vínculo.' })
    }
  }
}
