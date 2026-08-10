/**
 * Notifier WhatsApp compartilhado por todos os módulos da API Semit.
 * Uso: const { notifyWhatsapp, notifyWhatsappMedia } = require('./whatsapp-notifier')
 */
const { sendText, sendMedia, isEnabled, normalizePhone } = require('./evolution-client')
const { queuesEnabled, enqueue, QUEUE_JOBS } = require('./job-queue')

/**
 * Envia mensagem de texto via Evolution.
 * @param {{ phone: string, message: string, module?: string }} params
 */
async function notifyWhatsapp({ phone, message, module = 'whatsapp' } = {}) {
  if (!isEnabled()) {
    return { ignored: true, reason: 'whatsapp_disabled_or_not_configured' }
  }

  const number = normalizePhone(phone)
  const text = String(message || '').trim()
  if (!number) return { skipped: true, reason: 'invalid_phone' }
  if (!text) return { skipped: true, reason: 'empty_message' }

  if (queuesEnabled()) {
    const ok = await enqueue(QUEUE_JOBS, {
      type: 'whatsapp.sendText',
      module,
      number,
      text,
    })
    if (ok) return { queued: true, number, module }
  }

  const result = await sendText({ number, text })
  if (result.error) {
    console.error(`[whatsapp-notifier] falha (${module}):`, result.message)
  }
  return { ...result, number, module }
}

/**
 * Envia imagem (ou outra mídia) via URL pública + caption opcional.
 * @param {{ phone: string, mediaUrl: string, caption?: string, mediatype?: string, mimetype?: string, fileName?: string, module?: string }} params
 */
async function notifyWhatsappMedia({
  phone,
  mediaUrl,
  caption = '',
  mediatype = 'image',
  mimetype = 'image/png',
  fileName = 'banner.png',
  module = 'whatsapp',
} = {}) {
  if (!isEnabled()) {
    return { ignored: true, reason: 'whatsapp_disabled_or_not_configured' }
  }

  const number = normalizePhone(phone)
  const media = String(mediaUrl || '').trim()
  if (!number) return { skipped: true, reason: 'invalid_phone' }
  if (!media) return { skipped: true, reason: 'empty_media_url' }

  const payload = {
    type: 'whatsapp.sendMedia',
    module,
    number,
    mediaUrl: media,
    caption: String(caption || ''),
    mediatype,
    mimetype,
    fileName,
  }

  if (queuesEnabled()) {
    const ok = await enqueue(QUEUE_JOBS, payload)
    if (ok) return { queued: true, number, module }
  }

  const result = await sendMedia({
    number,
    mediaUrl: media,
    caption: payload.caption,
    mediatype,
    mimetype,
    fileName,
  })
  if (result.error) {
    console.error(`[whatsapp-notifier] falha media (${module}):`, result.message)
  }
  return { ...result, number, module }
}

/**
 * Processa job enfileirado (worker Redis, se houver).
 */
async function processWhatsappJob(job = {}) {
  if (job.type === 'whatsapp.sendText') {
    return sendText({ number: job.number, text: job.text })
  }
  if (job.type === 'whatsapp.sendMedia') {
    return sendMedia({
      number: job.number,
      mediaUrl: job.mediaUrl,
      caption: job.caption,
      mediatype: job.mediatype,
      mimetype: job.mimetype,
      fileName: job.fileName,
    })
  }
  return { skipped: true }
}

module.exports = {
  notifyWhatsapp,
  notifyWhatsappMedia,
  processWhatsappJob,
}
