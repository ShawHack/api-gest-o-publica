const { coordinatesFromPlusCode, propertyLocation } = require('../../helpers/rural-property-location')

describe('localização de propriedades rurais', () => {
  test('usa as coordenadas armazenadas quando disponíveis', () => {
    expect(propertyLocation({ location: { latitude: -22.21, longitude: -49.65 } })).toEqual({ latitude: -22.21, longitude: -49.65 })
  })

  test('recupera um Plus Code curto usando Garça como referência', () => {
    const location = coordinatesFromPlusCode('8QRQ+CM')
    expect(location).toEqual(expect.objectContaining({ latitude: expect.any(Number), longitude: expect.any(Number) }))
  })

  test('não gera ponto para código inválido', () => {
    expect(coordinatesFromPlusCode('UPA-123')).toBeNull()
  })
})
