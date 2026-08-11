const request = require('supertest')
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness')

describe('Portal do produtor rural', () => {
  let app

  beforeAll(async () => {
    app = await setupIntegrationTest()
  })

  afterAll(async () => {
    await teardownIntegrationTest()
  })

  test('executa o fluxo completo e limita o operador ao modulo', async () => {
    const RuralProperty = require('../../models/RuralProperty')
    const operator = await createVerifiedUser({
      email: 'operador-rural@test.local',
      role: 'rotas_operador',
    })
    const token = bearerToken(operator)

    await RuralProperty.create({
      codigoUpa: 'UPA-TESTE-001',
      plusCode: '58M5+CFGH',
      name: 'Sitio de Homologacao',
      source: 'operator',
      status: 'active',
      createdBy: operator._id,
    })

    const resolved = await request(app)
      .get('/api/rotas-rurais/operator/properties/resolve')
      .query({ plusCode: '58M5+CFGH' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(resolved.body).toMatchObject({
      found: true,
      source: 'local',
      property: { codigoUpa: 'UPA-TESTE-001' },
    })

    const created = await request(app)
      .post('/api/rotas-rurais/operator/owners')
      .set('Authorization', `Bearer ${token}`)
      .send({ plusCode: '58M5+CFGH', cpf: '52998224725' })
      .expect(201)

    expect(created.body.temporaryPassword).toHaveLength(12)
    expect(created.body.temporaryPassword).not.toBe('52998224725')

    const login = await request(app)
      .post('/api/rotas-rurais/portal/login')
      .send({ username: '58M5+CFGH', password: created.body.temporaryPassword })
      .expect(200)

    expect(login.body.account.mustChangePassword).toBe(true)
    const ruralToken = login.body.token

    await request(app)
      .put('/api/rotas-rurais/portal/profile')
      .set('Authorization', `Bearer ${ruralToken}`)
      .send({ personal: { fullName: 'Produtor Teste', phone: '16999990000' } })
      .expect(403)

    await request(app)
      .post('/api/rotas-rurais/portal/change-password')
      .set('Authorization', `Bearer ${ruralToken}`)
      .send({ password: 'NovaSenha@123' })
      .expect(200)

    const draft = await request(app)
      .put('/api/rotas-rurais/portal/profile')
      .set('Authorization', `Bearer ${ruralToken}`)
      .send({
        personal: { fullName: 'Produtor Teste', phone: '16999990000' },
        property: { name: 'Sitio de Homologacao', activities: ['cafe'] },
        submit: false,
      })
      .expect(200)

    expect(draft.body.status).toBe('draft')

    const submitted = await request(app)
      .put('/api/rotas-rurais/portal/profile')
      .set('Authorization', `Bearer ${ruralToken}`)
      .send({
        personal: { fullName: 'Produtor Teste', phone: '16999990000' },
        property: { name: 'Sitio de Homologacao', activities: ['cafe'] },
        submit: true,
      })
      .expect(200)

    expect(submitted.body.status).toBe('submitted')

    await request(app)
      .get('/api/rotas-rurais/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    const originalFetch = global.fetch
    const { clearCatalogCache } = require('../../helpers/rural-property-catalog')
    clearCatalogCache()
    global.fetch = jest.fn().mockRejectedValue(new Error('catalog unavailable'))

    const unresolved = await request(app)
      .get('/api/rotas-rurais/operator/properties/resolve')
      .query({ plusCode: '7FG8+CFGH' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(unresolved.body).toMatchObject({ found: false, catalogAvailable: false })

    const manual = await request(app)
      .post('/api/rotas-rurais/operator/owners')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plusCode: '7FG8+CFGH',
        cpf: '11144477735',
        codigoUpa: 'UPA-MANUAL-001',
        propertyName: 'Propriedade Manual',
      })
      .expect(201)

    expect(manual.body.property).toMatchObject({
      source: 'operator',
      status: 'pending_review',
    })
    global.fetch = originalFetch
  })
})
