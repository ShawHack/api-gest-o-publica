const { TYPES } = require('../models/ComturContent')
const TYPE_SET = new Set(TYPES)
const STATUSES = new Set(['draft', 'review', 'published', 'archived'])
const QR_STATUSES = new Set(['planned', 'installed', 'maintenance', 'disabled'])
const TRANS = {
  draft: new Set(['review', 'published', 'archived']),
  review: new Set(['draft', 'published', 'archived']),
  published: new Set(['review', 'archived']),
  archived: new Set(['draft']),
}
const txt = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

function url(v) {
  const s = txt(v, 1000)
  if (!s) return ''
  if (/^blob:|^data:/i.test(s)) return null
  if (s.startsWith('/')) {
    try {
      const encoded = s
        .split('/')
        .map((p, i) => (i === 0 ? '' : encodeURIComponent(decodeURIComponent(p))))
        .join('/')
      // relative app paths (allow percent-encoding)
      if (/^\/[a-z0-9/_\-.%~]+$/i.test(encoded) && !encoded.includes('..')) return encoded
    } catch (_) {
      return null
    }
    return null
  }
  try {
    const u = new URL(s)
    return ['http:', 'https:'].includes(u.protocol) ? s : null
  } catch (_) {
    return null
  }
}

function normalizeQr(input) {
  const status = String(input?.status || 'disabled')
  if (!QR_STATUSES.has(status)) return { error: 'Estado do QR inválido' }
  const code = txt(input?.code, 120)
  const enabled = input?.enabled === true
  if (enabled && !code) return { error: 'Informe o código da placa QR' }
  const parseDate = (v) => {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return {
    value: {
      enabled,
      code,
      status,
      installationLocation: txt(input?.installationLocation, 300),
      installedAt: parseDate(input?.installedAt),
      lastMaintenanceAt: parseDate(input?.lastMaintenanceAt),
    },
  }
}

function normalize(input = {}, partial = false) {
  const out = {}
  if (!partial)
    for (const k of ['type', 'slug', 'title'])
      if (!input[k]) return { error: `Campo obrigatório: ${k}` }
  if (input.type !== undefined) {
    if (!TYPE_SET.has(input.type)) return { error: 'Tipo de conteúdo inválido' }
    out.type = input.type
  }
  if (input.slug !== undefined) {
    const s = txt(input.slug, 180).toLowerCase()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return { error: 'Slug inválido' }
    out.slug = s
  }
  for (const [k, n] of [
    ['title', 240],
    ['summary', 2000],
    ['body', 50000],
    ['location', 300],
  ])
    if (input[k] !== undefined) {
      out[k] = txt(input[k], n)
      if (k === 'title' && !out[k]) return { error: 'Título obrigatório' }
    }
  for (const k of ['startsAt', 'endsAt'])
    if (input[k] !== undefined) {
      if (!input[k]) out[k] = null
      else {
        const d = new Date(input[k])
        if (Number.isNaN(d.getTime())) return { error: `Data inválida: ${k}` }
        out[k] = d
      }
    }
  if (input.featured !== undefined) out.featured = input.featured === true
  if (input.geo !== undefined) {
    if (
      !input.geo ||
      (input.geo.lat === '' && input.geo.lng === '') ||
      (input.geo.lat == null && input.geo.lng == null)
    ) {
      out.geo = { lat: null, lng: null }
    } else if (
      input.geo.lat !== undefined &&
      input.geo.lat !== '' &&
      input.geo.lng !== undefined &&
      input.geo.lng !== ''
    ) {
      const lat = Number(input.geo.lat)
      const lng = Number(input.geo.lng)
      if (
        !Number.isFinite(lat) ||
        lat < -90 ||
        lat > 90 ||
        !Number.isFinite(lng) ||
        lng < -180 ||
        lng > 180
      )
        return { error: 'Coordenadas inválidas' }
      out.geo = { lat, lng }
    }
  }
  if (input.contact !== undefined) {
    out.contact = {
      phone: txt(input.contact?.phone, 60),
      email: txt(input.contact?.email, 180),
      website: input.contact?.website ? txt(input.contact.website, 1000) : '',
    }
  }
  if (input.media !== undefined) {
    if (!Array.isArray(input.media)) return { error: 'Mídias devem ser uma lista' }
    out.media = []
    for (const m of input.media) {
      const u = url(m.url)
      if (!['image', 'video', 'audio', 'document', 'link'].includes(m.kind) || !u)
        return { error: 'Mídia inválida' }
      out.media.push({
        kind: m.kind,
        title: txt(m.title, 180),
        url: u,
        mimeType: txt(m.mimeType, 120),
        isAccessible: m.isAccessible === true,
      })
    }
  }
  if (input.metadata !== undefined)
    out.metadata =
      input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  if (input.translations !== undefined)
    out.translations =
      input.translations && typeof input.translations === 'object'
        ? input.translations
        : {}
  if (input.qr !== undefined) {
    const qr = normalizeQr(input.qr || {})
    if (qr.error) return { error: qr.error }
    out.qr = qr.value
  }
  return { value: out }
}

const canTransition = (a, b) => STATUSES.has(a) && STATUSES.has(b) && TRANS[a].has(b)

function publicContentFilter(query = {}) {
  const filter = { status: 'published' }
  if (query.type) {
    if (!TYPE_SET.has(String(query.type))) return { error: 'Tipo inválido' }
    filter.type = String(query.type)
  }
  if (query.featured === 'true' || query.featured === '1') filter.featured = true
  if (query.year) {
    const yr = parseInt(query.year, 10)
    if (!Number.isNaN(yr)) filter['metadata.year'] = yr
  }
  if (query.docType || query.documentType) {
    filter['metadata.documentType'] = String(query.docType || query.documentType)
  }
  if (query.category) {
    filter['metadata.category'] = String(query.category)
  }
  const startDate = query.startDate || query.start_date
  const endDate = query.endDate || query.end_date
  if (startDate || endDate) {
    const dateFilter = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)
    filter['metadata.documentDate'] = dateFilter
  }
  const q =
    typeof query.q === 'string'
      ? query.q.trim().slice(0, 120)
      : typeof query.search === 'string'
        ? query.search.trim().slice(0, 120)
        : ''
  if (q) filter.$text = { $search: q }
  return { filter }
}

module.exports = { normalize, canTransition, TYPE_SET, publicContentFilter, normalizeQr, QR_STATUSES }
