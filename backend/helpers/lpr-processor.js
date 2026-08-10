const RuralVehicle = require('../models/RuralVehicle')
const LprEvent = require('../models/LprEvent')
const UnknownVehicleAlert = require('../models/UnknownVehicleAlert')
const { parseIntelbrasLprPayload } = require('./intelbras-lpr')

const COOLDOWN_MINUTES = parseInt(process.env.LPR_ALERT_COOLDOWN_MINUTES || '30', 10)

function isWhitelistVehicleActive(vehicle, at = new Date()) {
  if (!vehicle || vehicle.status !== 'approved') return false
  if (vehicle.validFrom && new Date(vehicle.validFrom) > at) return false
  if (vehicle.validUntil && new Date(vehicle.validUntil) < at) return false
  return true
}

async function findActiveWhitelistVehicle(plateNormalized, at = new Date()) {
  const vehicle = await RuralVehicle.findOne({
    plateNormalized,
    status: 'approved',
  }).lean()

  if (!isWhitelistVehicleActive(vehicle, at)) return null
  return vehicle
}

async function processLprEvent(rawBody) {
  const parsed = parseIntelbrasLprPayload(rawBody)
  if (!parsed.plateNormalized || parsed.plateNormalized.length < 6) {
    return { ok: false, error: 'invalid_plate', parsed }
  }

  const vehicle = await findActiveWhitelistVehicle(parsed.plateNormalized, parsed.capturedAt)
  const classification = vehicle ? 'known' : 'unknown'

  let alert = null
  if (classification === 'unknown') {
    const cooldownStart = new Date(parsed.capturedAt.getTime() - COOLDOWN_MINUTES * 60 * 1000)
    alert = await UnknownVehicleAlert.findOne({
      plateNormalized: parsed.plateNormalized,
      cameraId: parsed.cameraId,
      status: 'open',
      lastSeenAt: { $gte: cooldownStart },
    })

    if (alert) {
      alert.lastSeenAt = parsed.capturedAt
      alert.count = (alert.count || 1) + 1
      if (parsed.snapshotUrl) alert.snapshotUrl = parsed.snapshotUrl
      await alert.save()
    } else {
      alert = await UnknownVehicleAlert.create({
        plateNormalized: parsed.plateNormalized,
        cameraId: parsed.cameraId,
        cameraLabel: parsed.cameraLabel,
        firstSeenAt: parsed.capturedAt,
        lastSeenAt: parsed.capturedAt,
        count: 1,
        status: 'open',
        snapshotUrl: parsed.snapshotUrl,
      })
    }
  }

  const event = await LprEvent.create({
    plateNormalized: parsed.plateNormalized,
    plateRaw: parsed.plateRaw,
    cameraId: parsed.cameraId,
    cameraLabel: parsed.cameraLabel,
    capturedAt: parsed.capturedAt,
    classification,
    vehicleId: vehicle?._id,
    codigoUpa: vehicle?.codigoUpa || '',
    snapshotUrl: parsed.snapshotUrl,
    sourcePayload: parsed.sourcePayload,
    alertId: alert?._id,
  })

  return {
    ok: true,
    classification,
    eventId: event._id,
    alertId: alert?._id || null,
    cooldownReused: classification === 'unknown' && alert && alert.count > 1,
  }
}

module.exports = {
  COOLDOWN_MINUTES,
  isWhitelistVehicleActive,
  findActiveWhitelistVehicle,
  processLprEvent,
}
