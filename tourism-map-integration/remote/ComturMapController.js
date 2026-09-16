const mongoose = require('mongoose')
const Content = require('../models/ComturContent')
const { recordChange } = require('../helpers/audit-service')

const LOCATION_TYPES = ['attraction', 'gastronomy', 'lodging', 'route', 'shopping', 'service']
const QR_STATUSES = new Set(['planned', 'installed', 'maintenance', 'disabled'])
const actor = (req) => req.user?._id || req.user?.id || null

module.exports = class ComturMapController {
  static async listAdmin(req, res) {
    const data = await Content.find({ type: { $in: LOCATION_TYPES } })
      .select('type slug title status location geo migration qr updatedAt')
      .sort({ title: 1 }).lean()
    return res.json({ data, total: data.length })
  }

  static async updateQr(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(422).json({ error: 'ID inválido' })
    const item = await Content.findOne({ _id: req.params.id, type: { $in: LOCATION_TYPES } })
    if (!item) return res.status(404).json({ error: 'Ponto turístico não encontrado' })
    const status = String(req.body?.status || 'disabled')
    if (!QR_STATUSES.has(status)) return res.status(422).json({ error: 'Estado do QR inválido' })
    const code = String(req.body?.code || '').trim().slice(0, 120)
    const enabled = req.body?.enabled === true
    if (enabled && !code) return res.status(422).json({ error: 'Informe o código da placa QR' })
    const before = item.toObject()
    item.qr = {
      enabled,
      code,
      status,
      installationLocation: String(req.body?.installationLocation || '').trim().slice(0, 300),
      installedAt: req.body?.installedAt ? new Date(req.body.installedAt) : null,
      lastMaintenanceAt: req.body?.lastMaintenanceAt ? new Date(req.body.lastMaintenanceAt) : null,
    }
    item.updatedBy = actor(req)
    item.revision += 1
    await item.save()
    await recordChange(req, { action: 'comtur.map.qr.update', module: 'comtur', resourceType: 'comtur_content', resourceId: item._id, before, after: item.toObject() })
    return res.json({ data: item, qrTargetUrl: `/turismo/local/${item.slug}` })
  }
}
