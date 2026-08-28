const crypto = require('crypto')

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function fingerprint(value) {
  const normalized = normalizeEmail(value)
  return normalized ? crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16) : null
}

function legacyDate(value) {
  if (value?.toDate) return value.toDate()
  if (value?._seconds != null) return new Date(value._seconds * 1000)
  const parsed = value ? new Date(value) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
}

function analyzeAgendaInventory({ appointments = [], services = [], centralUsers = [] }) {
  const centralByEmail = new Map()
  for (const user of centralUsers) {
    const email = normalizeEmail(user.email)
    if (!email) continue
    const matches = centralByEmail.get(email) || []
    matches.push(String(user._id || user.id))
    centralByEmail.set(email, matches)
  }

  const summary = {
    appointments: appointments.length,
    reservations: 0,
    blocks: 0,
    services: services.length,
    matchedUsers: 0,
    missingUsers: 0,
    ambiguousUsers: 0,
    invalidDates: 0,
    missingServices: 0,
    status: {},
  }
  const serviceIds = new Set(services.map((item) => String(item.id || item._id)).filter(Boolean))
  const records = []

  for (const item of appointments) {
    const data = item.data || item
    const firestoreId = String(item.id || data.id || '')
    const isBlock = data.userId === 'BLOCKED'
    const date = legacyDate(data.date)
    const email = normalizeEmail(data.userEmail)
    const matches = email ? centralByEmail.get(email) || [] : []
    const issues = []

    if (isBlock) summary.blocks += 1
    else summary.reservations += 1
    if (!date) { summary.invalidDates += 1; issues.push('invalid_date') }
    if (data.serviceId && !serviceIds.has(String(data.serviceId))) {
      summary.missingServices += 1
      issues.push('missing_service')
    }
    if (!isBlock) {
      if (matches.length === 1) summary.matchedUsers += 1
      else if (matches.length > 1) { summary.ambiguousUsers += 1; issues.push('ambiguous_user') }
      else { summary.missingUsers += 1; issues.push('missing_user') }
    }
    const status = String(data.status || (isBlock ? 'blocked' : 'unknown'))
    summary.status[status] = (summary.status[status] || 0) + 1
    records.push({
      firestoreId,
      kind: isBlock ? 'block' : 'appointment',
      emailFingerprint: fingerprint(email),
      centralUserId: matches.length === 1 ? matches[0] : null,
      serviceId: data.serviceId ? String(data.serviceId) : null,
      startsAt: date?.toISOString() || null,
      timeSlot: data.timeSlot || null,
      status,
      issues,
    })
  }

  return { summary, records }
}

module.exports = { analyzeAgendaInventory, fingerprint, legacyDate, normalizeEmail }
