const { normalizePlate, isValidPlate } = require('../../helpers/plate-normalize')
const { parseIntelbrasLprPayload } = require('../../helpers/intelbras-lpr')
const { isWhitelistVehicleActive, COOLDOWN_MINUTES } = require('../../helpers/lpr-processor')

describe('plate-normalize', () => {
  it('normaliza máscara e minúsculas', () => {
    expect(normalizePlate('abc-1d23')).toBe('ABC1D23')
    expect(normalizePlate(' ABC 1234 ')).toBe('ABC1234')
  })

  it('valida formato mercosul/antigo', () => {
    expect(isValidPlate('ABC1D23')).toBe(true)
    expect(isValidPlate('ABC1234')).toBe(true)
    expect(isValidPlate('AB123')).toBe(false)
  })
})

describe('intelbras-lpr adapter', () => {
  it('extrai placa e câmera de payload simples', () => {
    const parsed = parseIntelbrasLprPayload({
      plate: 'abc1d23',
      cameraId: 'cam-rural-01',
      cameraLabel: 'Estrada X',
      capturedAt: '2026-07-13T12:00:00.000Z',
    })
    expect(parsed.plateNormalized).toBe('ABC1D23')
    expect(parsed.cameraId).toBe('cam-rural-01')
    expect(parsed.cameraLabel).toBe('Estrada X')
  })

  it('aceita aliases TrafficCar', () => {
    const parsed = parseIntelbrasLprPayload({
      TrafficCar: { PlateNumber: 'XYZ9A87' },
      Channel: '3',
    })
    expect(parsed.plateNormalized).toBe('XYZ9A87')
    expect(parsed.cameraId).toBe('3')
  })
})

describe('whitelist classification helpers', () => {
  const now = new Date('2026-07-13T12:00:00.000Z')

  it('marca known só se approved e na validade', () => {
    expect(
      isWhitelistVehicleActive({ status: 'approved', validFrom: null, validUntil: null }, now),
    ).toBe(true)
    expect(isWhitelistVehicleActive({ status: 'pending' }, now)).toBe(false)
    expect(
      isWhitelistVehicleActive(
        { status: 'approved', validUntil: new Date('2026-07-01T00:00:00.000Z') },
        now,
      ),
    ).toBe(false)
  })

  it('expõe cooldown padrão configurável', () => {
    expect(COOLDOWN_MINUTES).toBeGreaterThan(0)
  })
})
