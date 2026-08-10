const RuralVehicle = require('../models/RuralVehicle')
const UpaOwnership = require('../models/UpaOwnership')
const { normalizePlate, isValidPlate } = require('../helpers/plate-normalize')
const { recordAudit } = require('../helpers/audit-log')
const { isRotasAdmin } = require('../helpers/rotas-auth')

function userIdOf(req) {
  return req.user?._id || req.user?.id
}

async function assertApprovedOwnership(userId, codigoUpa) {
  return UpaOwnership.findOne({
    userId,
    codigoUpa,
    status: 'approved',
  }).lean()
}

module.exports = class RuralVehicleController {
  static async createMine(req, res) {
    try {
      const plateNormalized = normalizePlate(req.body?.plate)
      if (!isValidPlate(plateNormalized)) {
        return res.status(422).json({ message: 'Placa inválida.' })
      }
      const codigoUpa = String(req.body?.codigoUpa || '').trim()
      if (!codigoUpa) return res.status(422).json({ message: 'codigoUpa é obrigatório.' })

      const uid = userIdOf(req)
      const ownership = await assertApprovedOwnership(uid, codigoUpa)
      if (!ownership) {
        return res.status(403).json({ message: 'Sem vínculo aprovado com esta UPA.' })
      }

      if (!req.body?.consentAccepted) {
        return res.status(422).json({
          message: 'É necessário aceitar o termo de consentimento (LGPD) para cadastrar o veículo.',
        })
      }

      const existingApproved = await RuralVehicle.findOne({
        plateNormalized,
        status: 'approved',
      }).lean()
      if (existingApproved) {
        return res.status(409).json({ message: 'Esta placa já está aprovada na whitelist.' })
      }

      const doc = await RuralVehicle.create({
        plate: String(req.body.plate).trim().toUpperCase(),
        plateNormalized,
        codigoUpa,
        ownerUserId: uid,
        brand: String(req.body?.brand || '').trim(),
        model: String(req.body?.model || '').trim(),
        color: String(req.body?.color || '').trim(),
        status: 'pending',
        consentAcceptedAt: new Date(),
        validFrom: req.body?.validFrom ? new Date(req.body.validFrom) : null,
        validUntil: req.body?.validUntil ? new Date(req.body.validUntil) : null,
      })

      void recordAudit(req, {
        action: 'rotas.vehicle.create',
        resourceType: 'rural_vehicle',
        resourceId: doc._id,
        module: 'rotas-rurais',
        metadata: { plateNormalized, codigoUpa },
      })

      return res.status(201).json(doc)
    } catch (error) {
      console.error('[rotas] createMine vehicle:', error)
      return res.status(500).json({ message: 'Erro ao cadastrar veículo.' })
    }
  }

  static async listMine(req, res) {
    try {
      const docs = await RuralVehicle.find({ ownerUserId: userIdOf(req) })
        .sort({ createdAt: -1 })
        .lean()
      return res.status(200).json({ items: docs })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar veículos.' })
    }
  }

  static async listAdmin(req, res) {
    try {
      const filter = {}
      if (req.query.status) filter.status = String(req.query.status)
      if (req.query.plate) filter.plateNormalized = normalizePlate(req.query.plate)
      if (req.query.codigoUpa) filter.codigoUpa = String(req.query.codigoUpa).trim()

      const docs = await RuralVehicle.find(filter)
        .populate('ownerUserId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(300)
        .lean()
      return res.status(200).json({ items: docs })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar veículos (admin).' })
    }
  }

  static async review(req, res) {
    try {
      if (!isRotasAdmin(req.user)) {
        return res.status(403).json({ message: 'Sem permissão.' })
      }
      const status = String(req.body?.status || '')
      if (!['approved', 'rejected', 'revoked'].includes(status)) {
        return res.status(422).json({ message: 'Status inválido.' })
      }

      const doc = await RuralVehicle.findById(req.params.id)
      if (!doc) return res.status(404).json({ message: 'Veículo não encontrado.' })

      if (status === 'approved') {
        const clash = await RuralVehicle.findOne({
          _id: { $ne: doc._id },
          plateNormalized: doc.plateNormalized,
          status: 'approved',
        }).lean()
        if (clash) {
          return res.status(409).json({ message: 'Já existe outra aprovação para esta placa.' })
        }
        doc.approvedBy = userIdOf(req)
        doc.approvedAt = new Date()
        doc.rejectionReason = ''
      }
      if (status === 'rejected') {
        doc.rejectionReason = String(req.body?.rejectionReason || '').trim()
      }

      doc.status = status
      await doc.save()

      void recordAudit(req, {
        action: 'rotas.vehicle.review',
        resourceType: 'rural_vehicle',
        resourceId: doc._id,
        module: 'rotas-rurais',
        metadata: { status, plateNormalized: doc.plateNormalized },
      })

      return res.status(200).json(doc)
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao revisar veículo.' })
    }
  }
}
