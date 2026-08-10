const AuditLog = require('../models/AuditLog')

const CACHE_TTL_MS = 60_000
let cache = { at: 0, lines: [] }

function promLabel(value) {
  return String(value || 'unknown').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function buildAuditPrometheusLines() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [byModule, byStatus, deniedByModule, security24h, total24h] = await Promise.all([
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$module', count: { $sum: 1 } } },
    ]),
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since }, status: 'denied' } },
      { $group: { _id: '$module', count: { $sum: 1 } } },
    ]),
    AuditLog.countDocuments({ createdAt: { $gte: since }, eventType: 'SECURITY' }),
    AuditLog.countDocuments({ createdAt: { $gte: since } }),
  ])

  const lines = [
    '# HELP audit_events_24h_total Eventos de auditoria nas últimas 24h',
    '# TYPE audit_events_24h_total gauge',
    `audit_events_24h_total ${total24h}`,
    '# HELP audit_security_events_24h_total Eventos SECURITY nas últimas 24h',
    '# TYPE audit_security_events_24h_total gauge',
    `audit_security_events_24h_total ${security24h}`,
    '# HELP audit_events_24h_by_module Eventos por módulo (24h)',
    '# TYPE audit_events_24h_by_module gauge',
  ]

  for (const row of byModule) {
    lines.push(
      `audit_events_24h_by_module{module="${promLabel(row._id || 'api')}"} ${row.count}`
    )
  }

  lines.push(
    '# HELP audit_events_24h_by_status Eventos por status (24h)',
    '# TYPE audit_events_24h_by_status gauge'
  )
  for (const row of byStatus) {
    lines.push(
      `audit_events_24h_by_status{status="${promLabel(row._id || 'unknown')}"} ${row.count}`
    )
  }

  lines.push(
    '# HELP audit_denied_24h_by_module Negados por módulo (24h)',
    '# TYPE audit_denied_24h_by_module gauge'
  )
  for (const row of deniedByModule) {
    lines.push(
      `audit_denied_24h_by_module{module="${promLabel(row._id || 'api')}"} ${row.count}`
    )
  }

  return lines
}

async function getAuditPrometheusLines() {
  if (Date.now() - cache.at < CACHE_TTL_MS && cache.lines.length) {
    return cache.lines
  }

  try {
    const lines = await buildAuditPrometheusLines()
    cache = { at: Date.now(), lines }
    return lines
  } catch {
    return cache.lines.length ? cache.lines : ['# audit metrics unavailable']
  }
}

function resetAuditMetricsCache() {
  cache = { at: 0, lines: [] }
}

module.exports = { getAuditPrometheusLines, resetAuditMetricsCache, buildAuditPrometheusLines }
