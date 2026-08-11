const mockSet = jest.fn().mockResolvedValue(undefined)
const mockRef = jest.fn(() => ({ set: mockSet }))
const mockFirebaseApp = { name: 'rotas-rurais-admin' }

jest.mock('firebase-admin', () => ({
  apps: [],
  credential: { applicationDefault: jest.fn(() => 'credential'), cert: jest.fn() },
  initializeApp: jest.fn(() => mockFirebaseApp),
  database: jest.fn(() => ({ ref: mockRef })),
}))

const { publishRuralProperty } = require('../../helpers/rural-property-publisher')

test('publica UPA aprovada no formato lido pelo Flutter', async () => {
  const key = await publishRuralProperty({
    _id: 'abc123',
    codigoUpa: 'UPA-456',
    plusCode: '58M5Q8PW+9R',
    name: 'Sítio Teste',
    location: { latitude: -22.2, longitude: -49.6 },
  })

  expect(key).toBe('portal_abc123')
  expect(mockRef).toHaveBeenCalledWith('upas/portal_abc123')
  expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
    codigo_upa: 'UPA-456',
    global_code: '58M5Q8PW+9R',
    nome_upa: 'Sítio Teste',
    latitude: -22.2,
    longitude: -49.6,
  }))
})
