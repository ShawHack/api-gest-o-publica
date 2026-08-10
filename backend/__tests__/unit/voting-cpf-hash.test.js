const {
  computeCpfHash,
  cpfLast4,
  maskCpfDisplay,
} = require('../../helpers/voting-identity-hash')

describe('voting CPF hash', () => {
  test('computeCpfHash é estável e não retorna CPF em claro', () => {
    const h1 = computeCpfHash('123.456.789-09')
    const h2 = computeCpfHash('12345678909')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
    expect(h1).not.toContain('12345678909')
  })

  test('maskCpfDisplay oculta dígitos', () => {
    expect(maskCpfDisplay({ cpfLast4: '8909' })).toBe('***.***.***-8909')
  })

  test('cpfLast4 extrai últimos 4 dígitos', () => {
    expect(cpfLast4('12345678909')).toBe('8909')
  })
})
