const { normalizePlate } = require('./plate-normalize')

/**
 * Adapter do payload LPR Intelbras → contrato interno.
 * Aceita campos comuns / aliases até o formato exato do NVR em produção.
 */
function parseIntelbrasLprPayload(body = {}) {
  const plateRaw =
    body.plate ||
    body.Plate ||
    body.plateNumber ||
    body.PlateNumber ||
    body.TrafficCar?.PlateNumber ||
    body.EventNotificationAlert?.TrafficCar?.PlateNumber ||
    body.data?.plate ||
    ''

  const cameraId = String(
    body.cameraId ||
      body.CameraID ||
      body.channel ||
      body.Channel ||
      body.deviceId ||
      body.DeviceID ||
      body.EventNotificationAlert?.ChannelID ||
      'unknown',
  )

  const cameraLabel = String(
    body.cameraLabel || body.CameraName || body.channelName || body.ChannelName || cameraId,
  )

  const capturedAtRaw =
    body.capturedAt ||
    body.DateTime ||
    body.dateTime ||
    body.EventNotificationAlert?.DateTime ||
    body.timestamp ||
    null

  let capturedAt = new Date()
  if (capturedAtRaw) {
    const parsed = new Date(capturedAtRaw)
    if (!Number.isNaN(parsed.getTime())) capturedAt = parsed
  }

  const snapshotUrl = String(
    body.snapshotUrl || body.Picture || body.pictureUrl || body.imageUrl || '',
  )

  const plateNormalized = normalizePlate(plateRaw)

  return {
    plateRaw: String(plateRaw),
    plateNormalized,
    cameraId,
    cameraLabel,
    capturedAt,
    snapshotUrl,
    sourcePayload: body,
  }
}

module.exports = { parseIntelbrasLprPayload }
