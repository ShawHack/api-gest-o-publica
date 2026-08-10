/**
 * Cliente HTTP da Evolution API (WhatsApp).
 * Nunca derruba a aplicação: erros viram { error: true, ... }.
 */
const http = require('http')
const https = require('https')
const { URL } = require('url')

const env = (k, d = '') => process.env[k] ?? d

function isEnabled() {
  const flag = String(env('WHATSAPP_ENABLED', 'true')).toLowerCase()
  if (flag === 'false' || flag === '0' || flag === 'off') return false
  return !!(env('EVOLUTION_URL') && env('EVOLUTION_API_KEY') && env('EVOLUTION_INSTANCE'))
}

function getConfig() {
  return {
    baseUrl: String(env('EVOLUTION_URL', '')).replace(/\/$/, ''),
    apiKey: String(env('EVOLUTION_API_KEY', '')).trim(),
    instance: String(env('EVOLUTION_INSTANCE', 'semit_zap')).trim(),
    timeoutMs: Number(env('EVOLUTION_TIMEOUT_MS', '15000')) || 15000,
  }
}

/**
 * Normaliza telefone BR para E.164 sem +: só dígitos, com DDI 55.
 * Aceita: "(14) 98217-0294", "14982170294", "5514982170294".
 */
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function requestJson(method, path, body) {
  return new Promise((resolve) => {
    if (!isEnabled()) {
      return resolve({ ignored: true, reason: 'whatsapp_disabled_or_not_configured' })
    }

    let target
    try {
      const { baseUrl } = getConfig()
      target = new URL(path.startsWith('http') ? path : `${baseUrl}${path}`)
    } catch (err) {
      return resolve({ error: true, message: err?.message || 'invalid_url' })
    }

    const { apiKey, timeoutMs } = getConfig()
    const payload = body == null ? null : JSON.stringify(body)
    const isHttps = target.protocol === 'https:'
    const lib = isHttps ? https : http

    const req = lib.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method,
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          let data = null
          try {
            data = raw ? JSON.parse(raw) : null
          } catch {
            data = { raw }
          }
          const ok = res.statusCode >= 200 && res.statusCode < 300
          if (!ok) {
            return resolve({
              error: true,
              statusCode: res.statusCode,
              message: data?.response?.message || data?.message || raw || 'evolution_error',
              data,
            })
          }
          resolve({ ok: true, statusCode: res.statusCode, data })
        })
      },
    )

    req.on('error', (err) => resolve({ error: true, message: err?.message || String(err) }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ error: true, message: 'timeout' })
    })

    if (payload) req.write(payload)
    req.end()
  })
}

async function getConnectionState() {
  const { instance } = getConfig()
  return requestJson('GET', `/instance/connectionState/${encodeURIComponent(instance)}`)
}

async function checkNumber(number) {
  const { instance } = getConfig()
  const normalized = normalizePhone(number)
  if (!normalized) return { error: true, message: 'number_required' }
  return requestJson('POST', `/chat/whatsappNumbers/${encodeURIComponent(instance)}`, {
    numbers: [normalized],
  })
}

async function sendText({ number, text }) {
  if (!text || !String(text).trim()) {
    return { error: true, message: 'text_required' }
  }
  const normalized = normalizePhone(number)
  if (!normalized) return { error: true, message: 'number_required' }

  const { instance } = getConfig()
  return requestJson('POST', `/message/sendText/${encodeURIComponent(instance)}`, {
    number: normalized,
    text: String(text),
  })
}

/**
 * Envia mídia (imagem/documento/vídeo/áudio) via URL pública.
 * Evolution v2: POST /message/sendMedia/{instance}
 */
async function sendMedia({
  number,
  mediaUrl,
  caption = '',
  mediatype = 'image',
  mimetype = 'image/png',
  fileName = 'banner.png',
} = {}) {
  const normalized = normalizePhone(number)
  if (!normalized) return { error: true, message: 'number_required' }
  const media = String(mediaUrl || '').trim()
  if (!media) return { error: true, message: 'media_url_required' }

  const { instance } = getConfig()
  return requestJson('POST', `/message/sendMedia/${encodeURIComponent(instance)}`, {
    number: normalized,
    mediatype: String(mediatype || 'image'),
    mimetype: String(mimetype || 'image/png'),
    caption: String(caption || ''),
    media,
    fileName: String(fileName || 'banner.png'),
  })
}

module.exports = {
  isEnabled,
  getConfig,
  normalizePhone,
  getConnectionState,
  checkNumber,
  sendText,
  sendMedia,
}
