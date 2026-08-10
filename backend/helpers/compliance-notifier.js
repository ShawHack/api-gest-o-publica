const https = require('https')
const { URL } = require('url')
const { sendMail } = require('./mailer')

function parseRecipients(raw = '') {
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function postJson(webhookUrl, payload) {
  return new Promise((resolve) => {
    if (!webhookUrl) return resolve({ ignored: true, reason: 'webhook_not_configured' })
    try {
      const target = new URL(webhookUrl)
      const body = JSON.stringify(payload)
      const req = https.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || 443,
          path: `${target.pathname}${target.search}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 10000,
        },
        (res) => {
          res.on('data', () => {})
          res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode }))
        }
      )
      req.on('error', (err) => resolve({ error: true, message: err?.message || String(err) }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ error: true, message: 'timeout' })
      })
      req.write(body)
      req.end()
    } catch (err) {
      resolve({ error: true, message: err?.message || String(err) })
    }
  })
}

async function notifyHighComplianceAlert(summaryPayload) {
  const recipients = parseRecipients(process.env.COMPLIANCE_ALERT_EMAIL_TO || '')
  const webhookUrl = process.env.COMPLIANCE_ALERT_WEBHOOK_URL || ''
  const appName = process.env.APP_NAME || 'API SEMIT'

  const subject = `[${appName}] ALERTA HIGH de compliance`
  const text = [
    `Foi detectado alerta de compliance com severidade HIGH.`,
    `Ambiente: ${process.env.NODE_ENV || 'desconhecido'}`,
    `Janela: ${summaryPayload?.window?.lookbackHours || '?'}h`,
    `RequiresActionCount: ${summaryPayload?.overview?.requiresActionCount || 0}`,
    '',
    'Consulte /audit-logs/alerts para detalhes completos.',
  ].join('\n')

  let emailResult = { ignored: true, reason: 'no_recipients' }
  if (recipients.length > 0) {
    emailResult = await sendMail({
      to: recipients.join(','),
      subject,
      text,
      html: text.replace(/\n/g, '<br/>'),
    })
  }

  const webhookResult = await postJson(webhookUrl, {
    event: 'compliance_high_alert',
    app: appName,
    timestamp: new Date().toISOString(),
    summary: {
      window: summaryPayload?.window,
      thresholds: summaryPayload?.thresholds,
      overview: summaryPayload?.overview,
    },
  })

  return { emailResult, webhookResult }
}

module.exports = { notifyHighComplianceAlert }
