const AuditLog = require('../models/AuditLog')

function parseDays(value, fallback) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n >= 30 ? n : fallback
}

function retentionDays() {
  return parseDays(process.env.AUDIT_LOG_RETENTION_DAYS, 365)
}

function retentionTiers() {
  const defaultDays = retentionDays()
  return [
    {
      name: 'security',
      days: parseDays(process.env.AUDIT_LOG_RETENTION_SECURITY_DAYS, 1825),
      filter: { eventType: 'SECURITY' },
    },
    {
      name: 'lgpd',
      days: parseDays(process.env.AUDIT_LOG_RETENTION_LGPD_DAYS, 1825),
      filter: { module: 'lgpd', eventType: { $ne: 'SECURITY' } },
    },
    {
      name: 'denied',
      days: parseDays(process.env.AUDIT_LOG_RETENTION_DENIED_DAYS, 730),
      filter: {
        status: 'denied',
        eventType: { $ne: 'SECURITY' },
        module: { $ne: 'lgpd' },
      },
    },
    {
      name: 'view',
      days: parseDays(process.env.AUDIT_LOG_RETENTION_VIEW_DAYS, 90),
      filter: {
        eventType: 'VIEW',
        status: { $ne: 'denied' },
        module: { $ne: 'lgpd' },
      },
    },
    {
      name: 'default',
      days: defaultDays,
      filter: {
        eventType: { $nin: ['SECURITY', 'VIEW'] },
        module: { $ne: 'lgpd' },
        status: { $ne: 'denied' },
      },
    },
  ]
}

function cutoffDate(days) {
  return new Date(Date.now() - days * 86400000)
}

async function purgeTier(tier) {
  const cutoff = cutoffDate(tier.days)
  const result = await AuditLog.deleteMany({
    ...tier.filter,
    createdAt: { $lt: cutoff },
  })
  return {
    tier: tier.name,
    days: tier.days,
    deletedCount: result.deletedCount || 0,
    cutoff: cutoff.toISOString(),
  }
}

async function purgeOldAuditLogs() {
  const tiers = retentionTiers()
  const results = []
  let totalDeleted = 0

  for (const tier of tiers) {
    const row = await purgeTier(tier)
    results.push(row)
    totalDeleted += row.deletedCount
  }

  return {
    totalDeleted,
    tiers: results,
    defaultDays: retentionDays(),
  }
}

module.exports = {
  purgeOldAuditLogs,
  purgeTier,
  retentionDays,
  retentionTiers,
  parseDays,
}
