const request = require('supertest')
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
} = require('../helpers/test-harness')

const PnabYear = require('../../models/PnabYear')

describe('Módulo PNAB — rotas públicas', () => {
  beforeAll(() => setupIntegrationTest())
  afterAll(() => teardownIntegrationTest())

  afterEach(async () => {
    await PnabYear.deleteMany({ nome: /^test-pnab-/ })
  })

  test('GET /api/pnab/anos retorna JSON', async () => {
    await PnabYear.create({ nome: 'test-pnab-2025', status: 'ativo', ordem: 1 })

    const res = await request(getApp()).get('/api/pnab/anos')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((y) => y.nome === 'test-pnab-2025')).toBe(true)
  })

  test('GET /pnab/anos funciona sem prefixo /api (compat nginx)', async () => {
    const res = await request(getApp()).get('/pnab/anos')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
