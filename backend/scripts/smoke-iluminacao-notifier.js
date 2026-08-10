process.env.JWT_SECRET = process.env.JWT_SECRET || 'test'
process.env.NODE_ENV = 'test'
process.env.ILUMINACAO_WHATSAPP_ENABLED = 'true'

const Module = require('module')
const orig = Module.prototype.require
Module.prototype.require = function (id) {
  if (id.endsWith('mailer') || id.includes('/mailer')) {
    return { sendMail: async () => ({ messageId: 'x' }) }
  }
  if (id.endsWith('whatsapp-notifier') || id.includes('/whatsapp-notifier')) {
    return {
      notifyWhatsapp: async (p) => {
        console.log('WA_TEXT_LEN', String(p.message || '').length)
        return { ok: true }
      },
      notifyWhatsappMedia: async () => {
        console.log('WA_MEDIA')
        return { ok: true }
      },
    }
  }
  return orig.apply(this, arguments)
}

const n = require('../helpers/iluminacao-notifier')
const { isAllowedStatus, statusLabel } = require('../helpers/iluminacao-constants')

async function main() {
  console.log('statusLabel assigned=', statusLabel('assigned'))
  console.log('allowed en_route=', isAllowedStatus('en_route'))

  const r1 = await n.notifyReporterStatusChange({
    reportId: 't1',
    previousStatus: 'pending',
    newStatus: 'assigned',
    reporterEmail: 'a@b.com',
    notifyByWhatsapp: false,
  })
  console.log('r1', JSON.stringify(r1))

  const r2 = await n.notifyReporterCreated({
    reportId: 't2',
    protocol: 'ILU-1',
    reporterPhone: '14999999999',
    poleId: '1',
    notifyByEmail: false,
    notifyByWhatsapp: true,
  })
  console.log('r2', JSON.stringify(r2))

  const same = await n.notifyReporterStatusChange({
    reportId: 't3',
    previousStatus: 'pending',
    newStatus: 'received',
    reporterEmail: 'a@b.com',
  })
  console.log('same', JSON.stringify(same))
  console.log('SMOKE_OK')
}

main().catch((e) => {
  console.error('SMOKE_FAIL', e)
  process.exit(1)
})
