const evolution = require('../helpers/evolution-client')
const { notifyWhatsapp } = require('../helpers/whatsapp-notifier')
const { recordAudit } = require('../helpers/audit-log')

function extractWebhookSecret(req) {
  return String(
    req.headers['x-webhook-secret'] ||
      req.headers['x-evolution-secret'] ||
      req.query?.secret ||
      req.body?.secret ||
      '',
  ).trim()
}

function verifyWebhookSecret(req) {
  const expected = String(process.env.EVOLUTION_WEBHOOK_SECRET || '').trim()
  if (!expected) return false
  return extractWebhookSecret(req) === expected
}

function resolveEventName(body = {}) {
  return String(body.event || body.type || body.action || '').toLowerCase()
}

function resolveInstanceName(body = {}) {
  return String(
    body.instance ||
      body.instanceName ||
      body.data?.instance ||
      body.sender ||
      '',
  ).trim()
}

module.exports = class WhatsappController {
  static async status(req, res) {
    try {
      const enabled = evolution.isEnabled()
      const cfg = evolution.getConfig()
      if (!enabled) {
        return res.status(200).json({
          enabled: false,
          configured: !!(cfg.baseUrl && cfg.apiKey && cfg.instance),
          instance: cfg.instance || null,
          message: 'WhatsApp desabilitado ou não configurado.',
        })
      }

      const state = await evolution.getConnectionState()
      return res.status(200).json({
        enabled: true,
        instance: cfg.instance,
        baseUrl: cfg.baseUrl,
        connection: state.error ? { error: state.message } : state.data,
      })
    } catch (error) {
      console.error('[whatsapp] status:', error)
      return res.status(500).json({ message: 'Erro ao consultar status do WhatsApp.' })
    }
  }

  static async send(req, res) {
    try {
      const phone = req.body?.phone || req.body?.number || req.body?.to
      const message = req.body?.message || req.body?.text
      const moduleName = String(req.body?.module || 'admin').slice(0, 64)

      if (!phone || !message) {
        return res.status(422).json({ message: 'Informe phone/number e message/text.' })
      }

      const result = await notifyWhatsapp({ phone, message, module: moduleName })

      void recordAudit(req, {
        action: 'whatsapp.send',
        resourceType: 'whatsapp',
        module: 'whatsapp',
        status: result.error ? 'error' : 'ok',
        metadata: {
          number: result.number || evolution.normalizePhone(phone),
          module: moduleName,
          queued: !!result.queued,
          ignored: !!result.ignored,
          skipped: !!result.skipped,
          error: result.error ? result.message : undefined,
        },
      })

      if (result.error) {
        return res.status(502).json({ message: 'Falha ao enviar WhatsApp.', ...result })
      }
      return res.status(200).json({ message: 'WhatsApp processado.', ...result })
    } catch (error) {
      console.error('[whatsapp] send:', error)
      return res.status(500).json({ message: 'Erro ao enviar WhatsApp.' })
    }
  }

  /**
   * Receptor de eventos da Evolution API.
   * Responde 200 rápido; processamento pesado fica para fases seguintes.
   */
  static async webhook(req, res) {
    try {
      if (!verifyWebhookSecret(req)) {
        return res.status(401).json({ message: 'Webhook secret inválido.' })
      }

      const body = req.body || {}
      const event = resolveEventName(body)
      const instance = resolveInstanceName(body)
      const expectedInstance = String(process.env.EVOLUTION_INSTANCE || 'semit_zap').trim()

      if (instance && expectedInstance && instance !== expectedInstance) {
        console.warn('[whatsapp] webhook instância ignorada:', instance)
        return res.status(200).json({ ok: true, ignored: true, reason: 'instance_mismatch' })
      }

      // Log estruturado — handlers por evento entram nas próximas fases
      console.log('[whatsapp] webhook', {
        event: event || '(unknown)',
        instance: instance || expectedInstance,
        keys: Object.keys(body),
      })

      return res.status(200).json({ ok: true, received: true, event: event || null })
    } catch (error) {
      console.error('[whatsapp] webhook:', error)
      // Evolution espera ACK; evita retries agressivos por 500 em bug nosso
      return res.status(200).json({ ok: false, message: 'erro_interno' })
    }
  }
}
