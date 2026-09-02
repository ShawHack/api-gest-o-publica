const crypto = require('crypto')

const STATUS_MAP = Object.freeze({
  pending: 'booked',
  attended: 'completed',
  noShow: 'no_show',
  cancelled: 'cancelled',
  changeDenied: 'booked',
})

function parseTimeSlot(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  if (!match) return null
  const startMinutes = Number(match[1]) * 60 + Number(match[2])
  const endMinutes = Number(match[3]) * 60 + Number(match[4])
  if (endMinutes <= startMinutes) return null
  return { start: `${match[1]}:${match[2]}`, end: `${match[3]}:${match[4]}`, durationMinutes: endMinutes - startMinutes }
}

function checksum(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function buildAgendaMigrationPlan({ records = [], serviceMap = {} }) {
  const plan = { version: 1, appointments: [], unitBlocks: [], rejected: [], summary: {} }
  const reject = (record, reasons) => plan.rejected.push({
    firestoreId: record.firestoreId,
    kind: record.kind,
    reasons: [...new Set(reasons)],
  })

  for (const record of records) {
    const reasons = [...(record.issues || [])]
    const slot = parseTimeSlot(record.timeSlot)
    const mappedService = record.serviceId ? serviceMap[record.serviceId] : null
    if (!record.startsAt) reasons.push('missing_date')
    if (!slot) reasons.push('invalid_time_slot')

    if (record.kind === 'block') {
      if (record.serviceId) reasons.push('unsupported_service_slot_block')
      const targetUnitId = mappedService?.unitId || serviceMap.__defaultUnitId
      if (!targetUnitId) reasons.push('missing_target_unit')
      if (reasons.length) { reject(record, reasons); continue }
      const item = {
        legacyId: record.firestoreId,
        unitId: targetUnitId,
        date: record.startsAt.slice(0, 10),
        startTime: slot.start,
        endTime: slot.end,
        scope: 'unit',
        category: 'other',
        reason: 'Bloqueio migrado do sistema legado',
      }
      plan.unitBlocks.push({ ...item, checksum: checksum(item) })
      continue
    }

    if (!record.centralUserId) reasons.push('missing_target_user')
    if (!mappedService?.serviceId || !mappedService?.unitId) reasons.push('missing_target_service')
    if (['changeRequested', 'changeApproved'].includes(record.status)) reasons.push('pending_change_manual_review')
    const targetStatus = STATUS_MAP[record.status]
    if (!targetStatus) reasons.push('unsupported_status')
    if (mappedService?.durationMinutes && slot && mappedService.durationMinutes !== slot.durationMinutes) {
      reasons.push('duration_mismatch')
    }
    if (reasons.length) { reject(record, reasons); continue }

    const item = {
      legacyId: record.firestoreId,
      userId: record.centralUserId,
      unitId: mappedService.unitId,
      serviceId: mappedService.serviceId,
      date: record.startsAt.slice(0, 10),
      startTime: slot.start,
      endTime: slot.end,
      status: targetStatus,
      source: 'migration',
    }
    plan.appointments.push({ ...item, checksum: checksum(item) })
  }

  plan.summary = {
    input: records.length,
    appointments: plan.appointments.length,
    unitBlocks: plan.unitBlocks.length,
    rejected: plan.rejected.length,
    planChecksum: checksum({ appointments: plan.appointments, unitBlocks: plan.unitBlocks, rejected: plan.rejected }),
  }
  return plan
}

module.exports = { STATUS_MAP, buildAgendaMigrationPlan, checksum, parseTimeSlot }
