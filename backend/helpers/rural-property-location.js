const { OpenLocationCode } = require('open-location-code')

const olc = new OpenLocationCode()
const GARCA_REFERENCE = { latitude: -22.2125, longitude: -49.6546 }

function coordinatesFromPlusCode(value) {
  const code = String(value || '').toUpperCase().replace(/\s+/g, '')
  if (!code || !olc.isValid(code)) return null

  try {
    const fullCode = olc.isShort(code)
      ? olc.recoverNearest(code, GARCA_REFERENCE.latitude, GARCA_REFERENCE.longitude)
      : code
    const area = olc.decode(fullCode)
    return { latitude: area.latitudeCenter, longitude: area.longitudeCenter }
  } catch (error) {
    return null
  }
}

function propertyLocation(property) {
  const latitude = Number(property?.location?.latitude ?? property?.latitude)
  const longitude = Number(property?.location?.longitude ?? property?.longitude)
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude !== 0 && longitude !== 0) {
    return { latitude, longitude }
  }
  return coordinatesFromPlusCode(property?.plusCode)
}

module.exports = { coordinatesFromPlusCode, propertyLocation }
