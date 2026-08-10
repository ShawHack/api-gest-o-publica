const UnknownVehicleAlert = require('../models/UnknownVehicleAlert')
const { processLprEvent } = require('../helpers/lpr-processor')
const { recordAudit } = require('../helpers/audit-log')
const { isRotasAdmin } = require('../helpers/rotas-auth')

function userIdOf(req) {
  return req.user?._id || req.user?.id
}

function verifyLprApiKey(req) {
  const expected = String(process.env.LPR_INTELBRAS_API_KEY || process.env.API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  const key = String(req.headers['x-api-key'] || '').trim()
  if (!expected.length) return false
  return expected.includes(key)
}

module.exports = class RotasLprController {
  static async ingestIntelbras(req, res) {
    try {
      if (!verifyLprApiKey(req)) {
        return res.status(401).json({ message: 'API key inválida.' })
      }

      const result = await processLprEvent(req.body || {})
      if (!result.ok) {
        return res.status(422).json({ message: 'Payload LPR inválido.', ...result })
      }

      return res.status(200).json(result)
    } catch (error) {
      console.error('[rotas] ingestIntelbras:', error)
      return res.status(500).json({ message: 'Erro ao processar evento LPR.' })
    }
  }

  static async listAlerts(req, res) {
    try {
      if (!isRotasAdmin(req.user)) {
        return res.status(403).json({ message: 'Sem permissão.' })
      }
      const status = req.query.status ? String(req.query.status) : 'open'
      const filter = status === 'all' ? {} : { status }
      const items = await UnknownVehicleAlert.find(filter)
        .sort({ lastSeenAt: -1 })
        .limit(200)
        .lean()
      return res.status(200).json({ items })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar alertas.' })
    }
  }

  static async updateAlert(req, res) {
    try {
      if (!isRotasAdmin(req.user)) {
        return res.status(403).json({ message: 'Sem permissão.' })
      }
      const status = String(req.body?.status || '')
      if (!['acknowledged', 'closed', 'false_positive', 'open'].includes(status)) {
        return res.status(422).json({ message: 'Status inválido.' })
      }

      const alert = await UnknownVehicleAlert.findById(req.params.id)
      if (!alert) return res.status(404).json({ message: 'Alerta não encontrado.' })

      alert.status = status
      if (req.body?.note != null) alert.note = String(req.body.note)
      if (status === 'acknowledged') {
        alert.acknowledgedBy = userIdOf(req)
        alert.acknowledgedAt = new Date()
      }
      if (status === 'closed' || status === 'false_positive') {
        alert.closedBy = userIdOf(req)
        alert.closedAt = new Date()
      }
      await alert.save()

      void recordAudit(req, {
        action: 'rotas.alert.update',
        resourceType: 'unknown_vehicle_alert',
        resourceId: alert._id,
        module: 'rotas-rurais',
        metadata: { status, plateNormalized: alert.plateNormalized },
      })

      return res.status(200).json(alert)
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao atualizar alerta.' })
    }
  }
}
