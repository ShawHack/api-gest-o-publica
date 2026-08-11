const {
  normalizePlusCode,
  isPlausiblePlusCode,
  normalizeCpf,
  isValidCpf,
  ruralCpfIdentity,
} = require('../../helpers/rural-identity')
const { mapCatalogItem } = require('../../helpers/rural-property-catalog')

describe('rural identity', () => {
  it('normaliza Plus Code para busca e login', () => {
    expect(normalizePlusCode(' 58x9 + 2c Garça ')).toBe('58X9+2C')
    expect(normalizePlusCode('6G6W58X9+2C')).toBe('6G6W58X9+2C')
  })

  it('valida formato plausível de Plus Code', () => {
    expect(isPlausiblePlusCode('6G6W58X9+2C')).toBe(true)
    expect(isPlausiblePlusCode('sem-plus-code')).toBe(false)
  })

  it('valida e protege CPF sem armazená-lo em claro', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725')
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    const identity = ruralCpfIdentity('529.982.247-25')
    expect(identity.cpfHash).toMatch(/^[a-f0-9]{64}$/)
    expect(identity.cpfLast4).toBe('4725')
    expect(JSON.stringify(identity)).not.toContain('52998224725')
  })

})

describe('rural property catalog mapper', () => {
  it('mapeia os nomes usados pelo Firebase atual', () => {
    expect(mapCatalogItem('key-1', {
      codigo_upa: 'UPA-10',
      nome_upa: 'Sítio Modelo',
      geometry: { plus_code: '6g6w 58x9+2c', latitude: -22.2, longitude: -49.6 },
    })).toEqual({
      firebaseKey: 'key-1', codigoUpa: 'UPA-10', plusCode: '6G6W58X9+2C',
      name: 'Sítio Modelo', latitude: -22.2, longitude: -49.6,
    })
  })
})
