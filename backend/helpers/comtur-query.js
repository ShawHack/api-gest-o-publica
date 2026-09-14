const MEETING_TYPES = new Set(['ordinaria', 'extraordinaria'])
const PUBLICATION_STATUSES = new Set(['draft', 'review', 'published', 'archived'])
const DOCUMENT_KINDS = new Set(['convocacao', 'pauta', 'ata', 'lista_presenca', 'anexo', 'gravacao'])
const STATUS_TRANSITIONS = {
  draft: new Set(['review', 'published', 'archived']),
  review: new Set(['draft', 'published', 'archived']),
  published: new Set(['review', 'archived']),
  archived: new Set(['draft']),
}

function parseInteger(value, { min, max, fallback }) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback
  return parsed
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildPublicMeetingQuery(input = {}) {
  const page = parseInteger(input.page, { min: 1, max: 100000, fallback: 1 })
  const limit = parseInteger(input.limit, { min: 1, max: 100, fallback: 20 })
  const filter = { status: 'published' }

  if (Object.prototype.hasOwnProperty.call(input, 'year') && input.year !== '') {
    const year = parseInteger(input.year, { min: 2000, max: 2100, fallback: null })
    if (year === null) return { error: 'Ano inválido' }
    filter.year = year
  }

  if (Object.prototype.hasOwnProperty.call(input, 'type') && input.type !== '') {
    if (!MEETING_TYPES.has(input.type)) return { error: 'Tipo de reunião inválido' }
    filter.type = input.type
  }

  const query = typeof input.q === 'string' ? input.q.trim().slice(0, 120) : ''
  if (query) {
    const expression = new RegExp(escapeRegex(query), 'i')
    filter.$or = [
      { summary: expression },
      { location: expression },
      { 'documents.title': expression },
    ]
  }

  return {
    filter,
    page,
    limit,
    skip: (page - 1) * limit,
    sort: { startsAt: -1, number: -1 },
  }
}

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function normalizeDocuments(value) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return { error: 'Documentos devem ser enviados em uma lista' }

  const documents = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || !DOCUMENT_KINDS.has(item.kind)) {
      return { error: 'Tipo de documento inválido' }
    }
    const title = normalizeText(item.title, 180)
    const url = normalizeText(item.url, 1000)
    if (!title || !url) return { error: 'Título e URL do documento são obrigatórios' }
    const isManagedUpload = /^\/images\/comtur\/[a-zA-Z0-9._-]+$/.test(url)
    if (!isManagedUpload) {
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol')
      } catch (_) {
        return { error: 'URL de documento inválida' }
      }
    }
    documents.push({
      kind: item.kind,
      title,
      url,
      mimeType: normalizeText(item.mimeType, 120),
      sizeBytes: item.sizeBytes == null ? null : Number(item.sizeBytes),
      isAccessible: item.isAccessible === true,
    })
  }
  return { documents }
}

function buildMeetingPayload(input = {}, { partial = false } = {}) {
  const payload = {}
  const required = ['number', 'year', 'type', 'startsAt', 'location', 'summary']
  if (!partial) {
    const missing = required.filter((key) => input[key] === undefined || input[key] === '')
    if (missing.length) return { error: `Campos obrigatórios ausentes: ${missing.join(', ')}` }
  }

  if (input.number !== undefined) {
    const number = Number(input.number)
    if (!Number.isInteger(number) || number < 1) return { error: 'Número de reunião inválido' }
    payload.number = number
  }
  if (input.year !== undefined) {
    const year = Number(input.year)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'Ano inválido' }
    payload.year = year
  }
  const slugSource = input.slug || (payload.number && payload.year ? `reuniao-${String(payload.number).padStart(2, '0')}-${payload.year}` : '')
  if (slugSource) {
    const slug = normalizeText(slugSource, 180).toLowerCase()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: 'Identificador de reunião inválido' }
    payload.slug = slug
  } else if (!partial) {
    return { error: 'Informe número e ano para gerar o endereço da reunião' }
  }
  if (input.type !== undefined) {
    if (!MEETING_TYPES.has(input.type)) return { error: 'Tipo de reunião inválido' }
    payload.type = input.type
  }
  if (input.startsAt !== undefined) {
    const startsAt = new Date(input.startsAt)
    if (Number.isNaN(startsAt.getTime())) return { error: 'Data da reunião inválida' }
    payload.startsAt = startsAt
  }
  for (const [field, max] of [['location', 240], ['summary', 2000]]) {
    if (input[field] !== undefined) {
      const value = normalizeText(input[field], max)
      if (!value) return { error: `${field} não pode ser vazio` }
      payload[field] = value
    }
  }
  if (input.deliberations !== undefined) {
    if (!Array.isArray(input.deliberations)) return { error: 'Deliberações devem ser enviadas em uma lista' }
    payload.deliberations = input.deliberations.map((item) => normalizeText(item, 1000)).filter(Boolean)
  }
  const normalizedDocuments = normalizeDocuments(input.documents)
  if (normalizedDocuments?.error) return normalizedDocuments
  if (normalizedDocuments) payload.documents = normalizedDocuments.documents

  return { payload }
}

function canTransitionStatus(from, to) {
  return PUBLICATION_STATUSES.has(from) && PUBLICATION_STATUSES.has(to) && STATUS_TRANSITIONS[from].has(to)
}

module.exports = {
  buildPublicMeetingQuery,
  buildMeetingPayload,
  canTransitionStatus,
  escapeRegex,
  normalizeDocuments,
}
