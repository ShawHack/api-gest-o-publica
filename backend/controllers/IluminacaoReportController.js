const {
  notifyReporterCreated,
  notifyReporterStatusChange,
} = require('../helpers/iluminacao-notifier')
const { isAllowedStatus } = require('../helpers/iluminacao-constants')

function canNotifyIluminacao(user) {
  if (!user) return false
  if (user.isAdmin) return true
  const role = String(user.role || '')
  return role === 'admin' || role === 'iluminacao_admin'
}

function parseBool(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value
  const s = String(value).toLowerCase()
  if (s === 'false' || s === '0' || s === 'off' || s === 'no') return false
  if (s === 'true' || s === '1' || s === 'on' || s === 'yes') return true
  return defaultValue
}

module.exports = class IluminacaoReportController {
  static async notifyCreated(req, res) {
    try {
      if (!canNotifyIluminacao(req.user)) {
        return res.status(403).json({ message: 'Acesso restrito a administradores de iluminação.' })
      }

      const reportId = String(req.params.id || '').trim()
      if (!reportId) {
        return res.status(400).json({ message: 'ID do chamado é obrigatório.' })
      }

      const body = req.body || {}
      const result = await notifyReporterCreated({
        reportId,
        protocol: body.protocol ? String(body.protocol).trim() : reportId,
        reporterName: body.reporterName ? String(body.reporterName).trim() : '',
        reporterEmail: body.reporterEmail ? String(body.reporterEmail).trim() : '',
        reporterPhone: body.reporterPhone || body.phone || body.whatsapp || '',
        poleId: body.poleId ? String(body.poleId).trim() : '',
        address: body.address ? String(body.address).trim() : '',
        problemType: body.problemType || body.type || '',
        notifyByEmail: parseBool(body.notifyByEmail, true),
        notifyByWhatsapp: parseBool(body.notifyByWhatsapp, true),
      })

      return res.status(200).json({
        message: result.sent
          ? 'Notificação de recebimento processada.'
          : 'Notificação de recebimento não enviada.',
        ...result,
      })
    } catch (error) {
      console.error('[iluminacao] notifyCreated:', error)
      return res.status(500).json({ message: 'Erro ao enviar notificação de recebimento.' })
    }
  }

  static async notifyStatusChange(req, res) {
    try {
      if (!canNotifyIluminacao(req.user)) {
        return res.status(403).json({ message: 'Acesso restrito a administradores de iluminação.' })
      }

      const reportId = String(req.params.id || '').trim()
      if (!reportId) {
        return res.status(400).json({ message: 'ID do chamado é obrigatório.' })
      }

      const body = req.body || {}
      const previousStatus = body.previousStatus != null ? String(body.previousStatus) : ''
      const newStatus = body.newStatus != null ? String(body.newStatus) : ''

      if (!isAllowedStatus(newStatus)) {
        return res.status(422).json({ message: 'Status inválido.' })
      }

      if (previousStatus === newStatus) {
        return res.status(200).json({ message: 'Status inalterado.', skipped: true })
      }

      const result = await notifyReporterStatusChange({
        reportId,
        protocol: body.protocol ? String(body.protocol).trim() : reportId,
        previousStatus,
        newStatus,
        reporterEmail: body.reporterEmail ? String(body.reporterEmail).trim() : '',
        reporterName: body.reporterName ? String(body.reporterName).trim() : '',
        reporterPhone: body.reporterPhone || body.phone || body.whatsapp || '',
        poleId: body.poleId ? String(body.poleId).trim() : '',
        address: body.address ? String(body.address).trim() : '',
        problemType: body.problemType ? String(body.problemType).trim() : '',
        resolutionDetails: body.resolutionDetails ? String(body.resolutionDetails).trim() : '',
        notifyByEmail: parseBool(body.notifyByEmail, true),
        notifyByWhatsapp: parseBool(body.notifyByWhatsapp, true),
      })

      return res.status(200).json({
        message: result.sent
          ? 'Notificação processada.'
          : result.skipped
            ? 'Notificação não enviada.'
            : 'Notificação não enviada.',
        ...result,
      })
    } catch (error) {
      console.error('[iluminacao] notifyStatusChange:', error)
      return res.status(500).json({ message: 'Erro ao enviar notificação.' })
    }
  }
}
