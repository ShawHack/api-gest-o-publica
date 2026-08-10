const crypto = require('crypto')
const AuditLog = require('../models/AuditLog')

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'token',
  'jwt',
  'authorization',
  'refreshtoken',
  'refreshToken',
  'emailverifytoken',
  'resetpasswordtoken',
])

const PII_MASK_KEYS = new Set(['cpf', 'cpf_cnpj', 'email', 'phone'])

const EVENT_TYPES = new Set([
  'CREATE',
  'UPDATE',
  'DELETE',
  'VIEW',
  'DOWNLOAD',
  'UPLOAD',
  'LOGIN',
  'LOGOUT',
  'APPROVE',
  'REJECT',
  'PERMISSION_CHANGE',
  'SECURITY',
  'OTHER',
])

function maskValue(key, value) {
  if (value === undefined || value === null) return value
  const k = String(key).toLowerCase()
  if (SENSITIVE_KEYS.has(k)) return '[redacted]'
  if (PII_MASK_KEYS.has(k)) {
    const s = String(value)
    if (k === 'email' && s.includes('@')) {
      const [local, domain] = s.split('@')
      return `${local.slice(0, 2)}***@${domain}`
    }
    if (s.length <= 4) return '***'
    return `***${s.slice(-4)}`
  }
  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}…`
  }
  return value
}

function sanitizeMetadata(input = {}) {
  const out = {}
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue
    if (SENSITIVE_KEYS.has(String(k).toLowerCase())) continue
    out[k] = maskValue(k, v)
  }
  return out
}

function parseUserAgent(ua = '') {
  const s = String(ua)
  const browser = /Edg\//.test(s)
    ? 'Edge'
    : /Chrome\//.test(s)
      ? 'Chrome'
      : /Firefox\//.test(s)
        ? 'Firefox'
        : /Safari\//.test(s) && !/Chrome/.test(s)
          ? 'Safari'
          : 'Unknown'
  const os = /Android/.test(s)
    ? 'Android'
    : /iPhone|iPad/.test(s)
      ? 'iOS'
      : /Windows/.test(s)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(s)
          ? 'macOS'
          : /Linux/.test(s)
            ? 'Linux'
            : 'Unknown'
  return { browser, os, raw: s.slice(0, 512) }
}

function parseClient(req) {
  const h = req?.headers || {}
  const app = (h['x-client-app'] || h['x-app-id'] || '').trim() || undefined
  const platform = (h['x-client-platform'] || '').trim() || undefined
  const version = (h['x-client-version'] || '').trim() || undefined
  const screen = (h['x-screen-id'] || h['x-client-screen'] || '').trim() || undefined
  const moduleHint = (h['x-client-module'] || '').trim() || undefined
  const requestId = (h['x-request-id'] || '').trim() || undefined
  return {
    app,
    platform,
    version,
    screen,
    moduleHint,
    requestId,
  }
}

function inferModule({ module, resourceType, path = '', client }) {
  if (module) return module
  if (client?.moduleHint) return client.moduleHint
  const p = String(path).toLowerCase()
  if (p.includes('/pets') || p.includes('/adoption-requests')) return 'garca_pet'
  if (p.includes('/sepultados') || p.includes('/dloc')) return 'memorial'
  if (p.includes('/arvores') || p.includes('/denounces') || p.includes('/vacinacao') || p.includes('/castracao')) {
    return 'sama'
  }
  if (p.includes('/votacao')) return 'votacao'
  if (p.includes('/forms-garca')) return 'forms'
  if (p.includes('/lgpd')) return 'lgpd'
  if (p.includes('/garca-cidadao') || p.includes('/occurrences')) return 'gov_cidadao'
  if (p.includes('/users') || p.includes('/auth')) return 'auth'
  const rt = String(resourceType || '').toLowerCase()
  if (rt.startsWith('pet') || rt === 'adoption_request') return 'garca_pet'
  if (rt === 'sepultado' || rt === 'user') return rt === 'user' ? 'auth' : 'memorial'
  if (rt === 'votation' || rt === 'vote' || rt.startsWith('voting_')) return 'votacao'
  if (rt.startsWith('tree') || rt === 'denounce' || rt === 'vaccination') return 'sama'
  return 'api'
}

function inferEventType(action = '', explicit) {
  if (explicit && EVENT_TYPES.has(explicit)) return explicit
  const a = String(action).toLowerCase()
  if (a.includes('login')) return 'LOGIN'
  if (a.includes('logout')) return 'LOGOUT'
  if (a.includes('.create') || a.endsWith('_create') || a.includes('register')) return 'CREATE'
  if (a.includes('.delete') || a.includes('erase')) return 'DELETE'
  if (a.includes('.update') || a.includes('toggle') || a.includes('assign')) return 'UPDATE'
  if (a.includes('.read') || a.includes('.list') || a.includes('get_')) return 'VIEW'
  if (a.includes('denied') || a.includes('security') || a.includes('invalid')) return 'SECURITY'
  if (a.includes('upload')) return 'UPLOAD'
  if (a.includes('forgot') || a.includes('reset')) return 'UPDATE'
  return 'OTHER'
}

function buildActor(req, override = {}) {
  const actor = { ...(req?.user || {}), ...override }
  return {
    actorId: actor._id || actor.id || undefined,
    actorName: actor.name || undefined,
    actorRole: actor.role || undefined,
    actorEmail: actor.email || undefined,
  }
}

function buildChanges(before = {}, after = {}, fields = null) {
  const keys = fields || [...new Set([...Object.keys(before), ...Object.keys(after)])]
  const changes = []
  for (const field of keys) {
    const b = before[field]
    const a = after[field]
    if (JSON.stringify(b) === JSON.stringify(a)) continue
    changes.push({
      campo: field,
      antes: maskValue(field, b),
      depois: maskValue(field, a),
    })
  }
  return changes
}

function filesFromMulter(files) {
  if (!files) return []
  const list = Array.isArray(files) ? files : [files]
  return list
    .filter(Boolean)
    .map((f) => ({
      name: f.originalname || f.filename,
      path: f.filename || f.path,
      type: f.mimetype,
      size: f.size,
      hash: f.buffer
        ? crypto.createHash('sha256').update(f.buffer).digest('hex')
        : undefined,
    }))
}

async function writeLog(req, payload = {}) {
  try {
    const client = parseClient(req)
    const path = req?.originalUrl || req?.path || ''
    const ua = parseUserAgent(req?.headers?.['user-agent'])
    const actor = buildActor(req, payload.actor || {})
    const moduleName = inferModule({
      module: payload.module,
      resourceType: payload.resourceType,
      path,
      client,
    })
    const eventType = inferEventType(payload.action, payload.eventType)
    const changes = payload.changes || (payload.before && payload.after
      ? buildChanges(payload.before, payload.after, payload.fields)
      : undefined)

    await AuditLog.create({
      ...actor,
      action: payload.action || 'unknown_action',
      resourceType: payload.resourceType || 'unknown_resource',
      resourceId: payload.resourceId ? String(payload.resourceId) : undefined,
      status: payload.status || 'success',
      metadata: sanitizeMetadata(payload.metadata || {}),
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      module: moduleName,
      eventType,
      tenant: payload.tenant || process.env.AUDIT_TENANT || 'prefeitura-garca',
      changes: changes?.length ? changes : undefined,
      files: payload.files?.length ? payload.files : undefined,
      sessionId: payload.sessionId,
      requestId: client.requestId,
      client,
      geo: { ip: req?.ip, userAgent: ua.raw, browser: ua.browser, os: ua.os },
      route: path,
      method: req?.method,
    })
  } catch (err) {
    console.error('[audit] Falha ao registrar trilha:', err?.message || err)
  }
}

async function recordAudit(req, payload = {}) {
  return writeLog(req, payload)
}

async function recordSecurity(req, payload = {}) {
  return writeLog(req, {
    ...payload,
    status: payload.status || 'denied',
    eventType: payload.eventType || 'SECURITY',
  })
}

async function recordChange(req, payload = {}) {
  const changes = buildChanges(payload.before, payload.after, payload.fields)
  return writeLog(req, {
    ...payload,
    changes,
    eventType: payload.eventType || 'UPDATE',
  })
}

module.exports = {
  recordAudit,
  recordSecurity,
  recordChange,
  buildChanges,
  maskValue,
  sanitizeMetadata,
  inferModule,
  inferEventType,
  filesFromMulter,
  parseClient,
}
