/**
 * Notificações WhatsApp do módulo de votação.
 * Usa o card público not-votacao.png + caption (mesmo padrão da iluminação).
 */
const { notifyWhatsapp, notifyWhatsappMedia } = require('./whatsapp-notifier')
const { normalizePhone } = require('./evolution-client')
const { landingPath } = require('./voting-slug')

function getDeliveryModel() {
  return require('../models/VotacaoNotifyDelivery')
}

function publicAssetUrl(path) {
  const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function bannerUrl() {
  const custom = String(process.env.VOTACAO_WHATSAPP_BANNER_URL || '').trim()
  if (custom) return custom
  return publicAssetUrl('/notificacao-banner/not-votacao.png')
}

function resolveVotationBannerUrl(votation) {
  const fallback = bannerUrl()
  const raw = String(votation?.bannerUrl || '').trim()
  if (!raw) return fallback

  try {
    const appUrl = new URL(process.env.APP_URL || 'https://api.garca.sp.gov.br')
    const resolved = new URL(raw, `${appUrl.origin}/`)
    const isOfficialOrigin = resolved.origin === appUrl.origin
    const isVotingBanner = resolved.pathname.startsWith('/images/votacao/banners/')
    return isOfficialOrigin && isVotingBanner ? resolved.href : fallback
  } catch {
    return fallback
  }
}

function whatsappModuleEnabled() {
  const flag = String(process.env.VOTACAO_WHATSAPP_ENABLED || 'true').toLowerCase()
  return !(flag === 'false' || flag === '0' || flag === 'off')
}

function footerLines() {
  return ['', 'Sistemas SEMIT — Prefeitura Municipal de Garça']
}

function formatDateTime(value) {
  try {
    return new Date(value || Date.now()).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return String(value || '')
  }
}

function resultsUrl(votation) {
  const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
  const path = votation?.slug ? landingPath(votation.slug) : '/votacao/'
  return `${base}${path}#resultado`
}

/**
 * @param {{ categoryName: string, label: string }[]} lines
 */
function buildCanhotoCaption({ voterName, votationTitle, votedAt, choiceLines, protocol, isTest = false }) {
  const nome = voterName || 'eleitor(a)'
  const rows = (choiceLines || []).map((l) => `• ${l.categoryName}: ${l.label}`)
  return [
    isTest ? '⚠️ SEM VALIDADE — VOTO DE TESTE' : null,
    isTest ? '' : null,
    `Olá, ${nome}!`,
    '',
    'Seu voto foi registrado com sucesso.',
    '',
    `Pleito: ${votationTitle || '—'}`,
    `Data/hora: ${formatDateTime(votedAt)}`,
    protocol ? `Protocolo de participação: ${protocol}` : null,
    '',
    'Canhoto das escolhas:',
    ...(rows.length ? rows : ['• (sem detalhamento)']),
    '',
    'Guarde esta mensagem como comprovante. O conteúdo do voto permanece sob sigilo no sistema.',
    ...footerLines(),
  ]
    .filter((x) => x != null)
    .join('\n')
}

/** Canhoto por e-mail: mesmo conteúdo do WhatsApp + link da votação e aviso de resultado. */
function buildCanhotoEmailText({
  voterName,
  votationTitle,
  votedAt,
  choiceLines,
  protocol,
  link,
  isTest = false,
}) {
  const base = buildCanhotoCaption({
    voterName,
    votationTitle,
    votedAt,
    choiceLines,
    protocol,
    isTest,
  })
  const extra = [
    '',
    'Página da votação / resultado:',
    link || '—',
    '',
    'Após o encerramento da votação, o resultado estará disponível nesta mesma página.',
  ].join('\n')
  // Insere o bloco extra antes do rodapé SEMIT.
  const marker = '\n\nSistemas SEMIT'
  const idx = base.lastIndexOf(marker)
  if (idx >= 0) return `${base.slice(0, idx)}\n${extra}${base.slice(idx)}`
  return `${base}\n${extra}`
}

function _removedBuildClosedCaption({ voterName, votationTitle, link }) {
  const nome = voterName || 'eleitor(a)'
  return [
    `Olá, ${nome}!`,
    '',
    `A votação "${votationTitle || 'Pleito'}" foi encerrada.`,
    '',
    'Consulte o resultado oficial nesta página:',
    link,
    '',
    'Obrigado pela sua participação.',
    ...footerLines(),
  ].join('\n')
}

const memoryDeliveryKeys = new Set()

async function claimDeliveryKey({ key, votationId, servidorId, event, channel, phone, email }) {
  try {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) {
      if (memoryDeliveryKeys.has(key)) return { ok: false, duplicate: true }
      memoryDeliveryKeys.add(key)
      return { ok: true, ephemeral: true }
    }
    const VotacaoNotifyDelivery = getDeliveryModel()
    await VotacaoNotifyDelivery.create({
      key,
      votationId: String(votationId || ''),
      servidorId: String(servidorId || ''),
      event,
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
    console.error('[votacao-notifier] claimDeliveryKey:', err?.message || err)
    return { ok: true, ephemeral: true }
  }
}

async function finalizeDelivery(key, result) {
  try {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) return
    const VotacaoNotifyDelivery = getDeliveryModel()
    await VotacaoNotifyDelivery.updateOne({ key }, { $set: { result } })
  } catch {
    /* ignore */
  }
}

async function sendWhatsappWithBanner({ phone, text, mediaUrl, module = 'votacao' }) {
  const media = mediaUrl || bannerUrl()
  const pathname = (() => {
    try { return new URL(media).pathname }
    catch { return '' }
  })()
  const extension = (pathname.match(/\.(png|jpe?g|webp)$/i)?.[1] || 'png').toLowerCase()
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension
  const mimetype = normalizedExtension === 'jpg' ? 'image/jpeg' : `image/${normalizedExtension}`
  const caption = String(text || '').trim()
  const mediaResult = await notifyWhatsappMedia({
    phone,
    mediaUrl: media,
    caption,
    mediatype: 'image',
    mimetype,
    fileName: `capa-pleito.${normalizedExtension}`,
    module,
  })
  const mediaOk = !!(mediaResult?.ok || mediaResult?.queued)
  if (mediaOk) {
    return { bannerUrl: media, media: mediaResult, text: { skipped: true, reason: 'caption_on_media' } }
  }
  const textResult = await notifyWhatsapp({ phone, message: text, module })
  return { bannerUrl: media, media: mediaResult, text: textResult }
}

function canNotifyServidor(servidor) {
  if (!servidor) return false
  if (servidor.whatsappOptIn === false) return false
  const phone = normalizePhone(servidor.whatsapp || '')
  return !!phone
}

function normalizeEmail(raw) {
  const email = String(raw || '')
    .trim()
    .toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ''
  return email
}

function canNotifyServidorEmail(servidor) {
  if (!servidor) return false
  if (servidor.emailOptIn === false) return false
  return !!normalizeEmail(servidor.email)
}

function emailModuleEnabled() {
  const flag = String(process.env.VOTACAO_EMAIL_ENABLED || 'true').toLowerCase()
  return !(flag === 'false' || flag === '0' || flag === 'off')
}

/**
 * Canhoto imediato após o voto (choices ainda em memória — não persiste vínculo voto↔eleitor).
 * WhatsApp e e-mail são canais independentes.
 */
async function notifyBallotReceipt({
  votation,
  servidor,
  participationId,
  choiceLines,
  votedAt = new Date(),
} = {}) {
  const votationId = votation?._id || votation?.id
  const servidorId = servidor?._id || servidor?.id
  const protocol = participationId ? String(participationId).slice(-8).toUpperCase() : ''
  const results = { whatsapp: null, email: null }
  const receiptBannerUrl = resolveVotationBannerUrl(votation)

  const wantWhatsapp =
    whatsappModuleEnabled() &&
    !(votation && votation.whatsappNotifyEnabled === false) &&
    canNotifyServidor(servidor)

  if (wantWhatsapp) {
    const phone = normalizePhone(servidor.whatsapp)
    const key = `${participationId || 'unknown'}:canhoto:whatsapp`
    const claim = await claimDeliveryKey({
      key,
      votationId,
      servidorId,
      event: 'canhoto',
      channel: 'whatsapp',
      phone,
    })
    if (!claim.ok) {
      results.whatsapp = { skipped: true, reason: 'duplicate' }
    } else {
        const caption = buildCanhotoCaption({
        voterName: servidor.nome,
        votationTitle: votation?.title,
        votedAt,
        choiceLines,
          protocol,
          isTest: votation?.status === 'test',
      })
      try {
        const wa = await sendWhatsappWithBanner({
          phone,
          text: caption,
          mediaUrl: receiptBannerUrl,
        })
        results.whatsapp = { sent: true, ...wa }
        await finalizeDelivery(key, results.whatsapp)
      } catch (err) {
        results.whatsapp = { error: true, message: err?.message || String(err) }
        await finalizeDelivery(key, results.whatsapp)
      }
    }
  } else if (!whatsappModuleEnabled()) {
    results.whatsapp = { skipped: true, reason: 'whatsapp_module_disabled' }
  } else if (votation && votation.whatsappNotifyEnabled === false) {
    results.whatsapp = { skipped: true, reason: 'votation_whatsapp_disabled' }
  } else {
    results.whatsapp = { skipped: true, reason: 'no_phone_or_opt_out' }
  }

  if (emailModuleEnabled() && canNotifyServidorEmail(servidor)) {
    const to = normalizeEmail(servidor.email)
    const key = `${participationId || 'unknown'}:canhoto:email`
    const claim = await claimDeliveryKey({
      key,
      votationId,
      servidorId,
      event: 'canhoto',
      channel: 'email',
      email: to,
    })
    if (!claim.ok) {
      results.email = { skipped: true, reason: 'duplicate' }
    } else {
        const text = buildCanhotoEmailText({
        voterName: servidor.nome,
        votationTitle: votation?.title,
        votedAt,
        choiceLines,
        protocol,
          link: resultsUrl(votation),
          isTest: votation?.status === 'test',
      })
      try {
        const { sendMail } = require('./mailer')
        const mail = await sendMail({
          to,
          subject: `Canhoto do voto — ${votation?.title || 'Pleito'}`,
          text,
          html: `<img src="${receiptBannerUrl}" alt="Capa do pleito" style="display:block;max-width:100%;height:auto;margin:0 0 20px"/><div>${text.replace(/\n/g, '<br/>')}</div>`,
        })
        results.email = { sent: true, ...mail }
        await finalizeDelivery(key, results.email)
      } catch (err) {
        results.email = { error: true, message: err?.message || String(err) }
        await finalizeDelivery(key, results.email)
      }
    }
  } else if (!emailModuleEnabled()) {
    results.email = { skipped: true, reason: 'email_module_disabled' }
  } else {
    results.email = { skipped: true, reason: 'no_email_or_opt_out' }
  }

  const anySent = !!(
    results.whatsapp?.sent ||
    results.whatsapp?.queued ||
    results.whatsapp?.media?.queued ||
    results.whatsapp?.media?.ok ||
    results.whatsapp?.text?.queued ||
    results.whatsapp?.text?.ok ||
    results.email?.sent ||
    results.email?.queued
  )
  return { sent: anySent, ...results }
}

module.exports = {
  bannerUrl,
  resolveVotationBannerUrl,
  whatsappModuleEnabled,
  buildCanhotoCaption,
  buildCanhotoEmailText,
  notifyBallotReceipt,
  canNotifyServidor,
  canNotifyServidorEmail,
  normalizeEmail,
  normalizePhoneForVotacao: normalizePhone,
}
