const { sendMail } = require('./mailer')
const { notifyWhatsapp, notifyWhatsappMedia } = require('./whatsapp-notifier')
const {
  statusLabel,
  statusDescription,
  problemLabel,
  normalizeStatus,
  STATUS_LABELS,
  PROBLEM_LABELS,
} = require('./iluminacao-constants')

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

function getDeliveryModel() {
  // Lazy: evita carregar mongoose/model no import (testes unitários / cold start)
  return require('../models/IluminacaoNotifyDelivery')
}

function appUrl(path = '/') {
  const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/iluminacao${p === '/' ? '/' : p}`
}

function publicAssetUrl(path) {
  const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function bannerUrl() {
  const custom = String(process.env.ILUMINACAO_WHATSAPP_BANNER_URL || '').trim()
  if (custom) return custom
  return publicAssetUrl('/notificacao-banner/not-iluminacao.png')
}

function whatsappModuleEnabled() {
  const flag = String(process.env.ILUMINACAO_WHATSAPP_ENABLED || 'true').toLowerCase()
  return !(flag === 'false' || flag === '0' || flag === 'off')
}

function footerLines() {
  return ['', 'Sistemas SEMIT — Prefeitura Municipal de Garça']
}

function buildReceivedMessage({
  reporterName,
  protocol,
  poleId,
  address,
}) {
  const nome = reporterName || 'cidadão'
  return [
    `Olá, ${nome}!`,
    'Recebemos sua solicitação de Iluminação Pública referente ao poste ' +
      `${poleId || '—'}.`,
    '',
    `Protocolo: ${protocol}`,
    `Localização: ${address || '—'}`,
    'Status: Solicitação recebida',
    '',
    'Sua solicitação foi encaminhada para análise pela equipe responsável.',
    '',
    'Acompanhe as atualizações por este WhatsApp.',
    ...footerLines(),
  ].join('\n')
}

function buildStatusMessage({
  reporterName,
  protocol,
  poleId,
  newStatus,
}) {
  const nome = reporterName || 'cidadão'
  const label = statusLabel(newStatus)
  return [
    `Olá, ${nome}!`,
    '',
    'Temos uma atualização sobre sua solicitação de Iluminação Pública.',
    '',
    `Protocolo: ${protocol}`,
    `Poste: ${poleId || '—'}`,
    `Novo status: ${label}`,
    '',
    statusDescription(newStatus),
    ...footerLines(),
  ].join('\n')
}

function buildResolvedMessage({
  reporterName,
  protocol,
  poleId,
  address,
}) {
  const nome = reporterName || 'cidadão'
  return [
    `Olá, ${nome}!`,
    '',
    `A solicitação de Iluminação Pública referente ao protocolo ${protocol} foi concluída.`,
    '',
    `Local: ${address || '—'}`,
    `Poste: ${poleId || '—'}`,
    'Status: Resolvido',
    '',
    'Agradecemos por sua colaboração e por ajudar a manter nossa cidade mais iluminada, segura e bem cuidada.',
    '',
    'Sua participação faz a diferença!',
    ...footerLines(),
  ].join('\n')
}

const memoryDeliveryKeys = new Set()

async function claimDeliveryKey({ key, reportId, event, status, channel, phone, email }) {
  try {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) {
      if (memoryDeliveryKeys.has(key)) return { ok: false, duplicate: true }
      memoryDeliveryKeys.add(key)
      return { ok: true, ephemeral: true }
    }
    const IluminacaoNotifyDelivery = getDeliveryModel()
    await IluminacaoNotifyDelivery.create({
      key,
      reportId,
      event,
      status: status || '',
      channel,
      phone: phone || '',
      email: email || '',
      result: { claimed: true },
    })
    return { ok: true }
  } catch (err) {
    if (err && (err.code === 11000 || String(err.message || '').includes('duplicate'))) {
      return { ok: false, duplicate: true }
    }
    if (memoryDeliveryKeys.has(key)) return { ok: false, duplicate: true }
    memoryDeliveryKeys.add(key)
    console.error('[iluminacao-notifier] claimDeliveryKey:', err?.message || err)
    return { ok: true, ephemeral: true }
  }
}

async function finalizeDelivery(key, result) {
  try {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) return
    const IluminacaoNotifyDelivery = getDeliveryModel()
    await IluminacaoNotifyDelivery.updateOne({ key }, { $set: { result } })
  } catch {
    /* ignore */
  }
}

async function sendWhatsappWithBanner({ phone, text, module = 'iluminacao' }) {
  const media = bannerUrl()
  const caption = String(text || '').trim()
  // Uma mensagem só: capa (not-iluminacao.png) + texto na legenda.
  const mediaResult = await notifyWhatsappMedia({
    phone,
    mediaUrl: media,
    caption,
    mediatype: 'image',
    mimetype: 'image/png',
    fileName: 'not-iluminacao.png',
    module,
  })
  const mediaOk = !!(mediaResult?.ok || mediaResult?.queued)
  if (mediaOk) {
    return { media: mediaResult, text: { skipped: true, reason: 'caption_on_media' } }
  }
  // Fallback: se a capa falhar, ainda entrega o texto.
  const textResult = await notifyWhatsapp({ phone, message: text, module })
  return { media: mediaResult, text: textResult }
}

/**
 * Confirmação na abertura do chamado.
 */
async function notifyReporterCreated({
  reportId,
  protocol,
  reporterName,
  reporterEmail,
  reporterPhone,
  poleId,
  address,
  problemType,
  notifyByEmail = true,
  notifyByWhatsapp = true,
} = {}) {
  const protocolCode = String(protocol || reportId || '').trim()
  const results = { email: null, whatsapp: null }

  if (notifyByEmail && isValidEmail(reporterEmail)) {
    const key = `${reportId}:received:email`
    const claim = await claimDeliveryKey({
      key,
      reportId,
      event: 'received',
      status: 'received',
      channel: 'email',
      email: reporterEmail,
    })
    if (claim.ok) {
      const greeting = reporterName ? `Olá ${reporterName},` : 'Olá,'
      const lines = [
        greeting,
        '',
        'Recebemos sua solicitação de iluminação pública.',
        `Poste: ${poleId || '-'}`,
        `Problema: ${problemLabel(problemType)}`,
        `Protocolo: ${protocolCode}`,
        address ? `Localização: ${address}` : null,
        '',
        'Status: Solicitação recebida',
        '',
        'Acompanhe pelo aplicativo Iluminação Pública.',
        appUrl('/'),
      ].filter(Boolean)
      const text = lines.join('\n')
      try {
        await sendMail({
          to: String(reporterEmail).trim(),
          subject: `Iluminação pública — solicitação recebida (${poleId || protocolCode})`,
          text,
          html: text.replace(/\n/g, '<br/>'),
        })
        results.email = { sent: true }
        await finalizeDelivery(key, results.email)
      } catch (err) {
        results.email = { error: true, message: err?.message || String(err) }
        await finalizeDelivery(key, results.email)
      }
    } else {
      results.email = { skipped: true, reason: 'duplicate' }
    }
  } else if (notifyByEmail) {
    results.email = { skipped: true, reason: 'invalid_email' }
  } else {
    results.email = { skipped: true, reason: 'notify_disabled' }
  }

  if (notifyByWhatsapp && whatsappModuleEnabled()) {
    const phone = String(reporterPhone || '').trim()
    if (!phone) {
      results.whatsapp = { skipped: true, reason: 'invalid_phone' }
    } else {
      const key = `${reportId}:received:whatsapp`
      const claim = await claimDeliveryKey({
        key,
        reportId,
        event: 'received',
        status: 'received',
        channel: 'whatsapp',
        phone,
      })
      if (!claim.ok) {
        results.whatsapp = { skipped: true, reason: 'duplicate' }
      } else {
        const text = buildReceivedMessage({
          reporterName,
          protocol: protocolCode,
          poleId,
          address,
        })
        try {
          const wa = await sendWhatsappWithBanner({ phone, text })
          results.whatsapp = { sent: true, ...wa }
          await finalizeDelivery(key, results.whatsapp)
        } catch (err) {
          results.whatsapp = { error: true, message: err?.message || String(err) }
          await finalizeDelivery(key, results.whatsapp)
        }
      }
    }
  } else if (notifyByWhatsapp) {
    results.whatsapp = { skipped: true, reason: 'whatsapp_module_disabled' }
  } else {
    results.whatsapp = { skipped: true, reason: 'notify_disabled' }
  }

  const anySent =
    results.email?.sent ||
    results.whatsapp?.sent ||
    results.whatsapp?.text?.ok ||
    results.whatsapp?.text?.queued ||
    results.whatsapp?.media?.queued
  return { sent: !!anySent, ...results }
}

/**
 * Notificação de mudança de status (e-mail + WhatsApp).
 */
async function notifyReporterStatusChange({
  reportId,
  protocol,
  previousStatus,
  newStatus,
  reporterEmail,
  reporterName,
  reporterPhone,
  poleId,
  address,
  problemType,
  resolutionDetails,
  notifyByEmail = true,
  notifyByWhatsapp = true,
} = {}) {
  const prev = String(previousStatus || '').trim()
  const next = String(newStatus || '').trim()
  if (prev === next || normalizeStatus(prev) === normalizeStatus(next)) {
    return { skipped: true, reason: 'same_status' }
  }

  const protocolCode = String(protocol || reportId || '').trim()
  const normalizedNext = normalizeStatus(next) || next
  const results = { email: null, whatsapp: null }

  if (notifyByEmail) {
    if (!isValidEmail(reporterEmail)) {
      results.email = { skipped: true, reason: 'invalid_email' }
    } else {
      const key = `${reportId}:status:${normalizedNext}:email`
      const claim = await claimDeliveryKey({
        key,
        reportId,
        event: 'status',
        status: normalizedNext,
        channel: 'email',
        email: reporterEmail,
      })
      if (!claim.ok) {
        results.email = { skipped: true, reason: 'duplicate' }
      } else {
        const greeting = reporterName ? `Olá ${reporterName},` : 'Olá,'
        const lines = [
          greeting,
          '',
          'Há uma atualização no seu chamado de iluminação pública.',
          `Poste: ${poleId || '-'}`,
          `Problema: ${problemLabel(problemType)}`,
          `Protocolo: ${protocolCode}`,
          '',
          `Status anterior: ${statusLabel(prev)}`,
          `Novo status: ${statusLabel(next)}`,
        ]
        if (normalizedNext === 'resolved' && resolutionDetails) {
          lines.push('', `Detalhes da resolução: ${resolutionDetails}`)
        }
        lines.push('', 'Acompanhe pelo aplicativo Iluminação Pública.', appUrl('/'))
        const text = lines.join('\n')
        try {
          await sendMail({
            to: String(reporterEmail).trim(),
            subject: `Iluminação pública — ${statusLabel(next)} (poste ${poleId || protocolCode})`,
            text,
            html: text.replace(/\n/g, '<br/>'),
          })
          results.email = { sent: true }
          await finalizeDelivery(key, results.email)
        } catch (err) {
          results.email = { error: true, message: err?.message || String(err) }
          await finalizeDelivery(key, results.email)
        }
      }
    }
  } else {
    results.email = { skipped: true, reason: 'notify_disabled' }
  }

  if (notifyByWhatsapp && whatsappModuleEnabled()) {
    const phone = String(reporterPhone || '').trim()
    if (!phone) {
      results.whatsapp = { skipped: true, reason: 'invalid_phone' }
    } else {
      const key = `${reportId}:status:${normalizedNext}:whatsapp`
      const claim = await claimDeliveryKey({
        key,
        reportId,
        event: 'status',
        status: normalizedNext,
        channel: 'whatsapp',
        phone,
      })
      if (!claim.ok) {
        results.whatsapp = { skipped: true, reason: 'duplicate' }
      } else {
        const text =
          normalizedNext === 'resolved'
            ? buildResolvedMessage({
                reporterName,
                protocol: protocolCode,
                poleId,
                address,
              })
            : buildStatusMessage({
                reporterName,
                protocol: protocolCode,
                poleId,
                newStatus: next,
              })
        try {
          const wa = await sendWhatsappWithBanner({ phone, text })
          results.whatsapp = { sent: true, ...wa }
          await finalizeDelivery(key, results.whatsapp)
        } catch (err) {
          results.whatsapp = { error: true, message: err?.message || String(err) }
          await finalizeDelivery(key, results.whatsapp)
        }
      }
    }
  } else if (notifyByWhatsapp) {
    results.whatsapp = { skipped: true, reason: 'whatsapp_module_disabled' }
  } else {
    results.whatsapp = { skipped: true, reason: 'notify_disabled' }
  }

  const anySent =
    results.email?.sent ||
    results.whatsapp?.sent ||
    results.whatsapp?.text?.ok ||
    results.whatsapp?.text?.queued ||
    results.whatsapp?.media?.queued

  return { sent: !!anySent, ...results }
}

module.exports = {
  STATUS_LABELS,
  PROBLEM_LABELS,
  notifyReporterCreated,
  notifyReporterStatusChange,
  buildReceivedMessage,
  buildStatusMessage,
  buildResolvedMessage,
  bannerUrl,
}
