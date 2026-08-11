const request = require('supertest')
jest.mock('../../helpers/rural-property-publisher', () => ({
  publishRuralProperty: jest.fn().mockResolvedValue('portal_test_key'),
}))
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

    expect(created.body.temporaryPassword).toBe('52998224725')

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
        property: { name: 'Sitio de Homologacao', ruralNeighborhood: 'Bairro do Cafe', activities: ['cafe'] },
        submit: false,
      })
      .expect(200)

    expect(draft.body.status).toBe('draft')
    expect(draft.body.property.ruralNeighborhood).toBe('Bairro do Cafe')

    const submitted = await request(app)
      .put('/api/rotas-rurais/portal/profile')
      .set('Authorization', `Bearer ${ruralToken}`)
      .send({
        personal: { fullName: 'Produtor Teste', phone: '16999990000' },
        property: { name: 'Sitio de Homologacao', ruralNeighborhood: 'Bairro do Cafe', activities: ['cafe'] },
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

    const admin = await createVerifiedUser({
      email: 'admin-rural@test.local',
      role: 'rotas_admin',
    })
    const adminToken = bearerToken(admin)
    const applicant = await request(app)
      .post('/api/rotas-rurais/portal/register-operator')
      .send({ name: 'Candidata Rural', email: 'candidata-rural@test.local', phone: '14977776666', cpf: '01234567890', password: 'Senha@123' })
      .expect(201)
    expect(applicant.body.message).toMatch(/Aguarde a liberação/i)

    await request(app)
      .post('/api/rotas-rurais/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Novo Operador', email: 'novo-operador@test.local', phone: '14999999999', cpf: '39053344705', password: 'Senha@123', role: 'rotas_operador' })
      .expect(201)
    const moduleUsers = await request(app)
      .get('/api/rotas-rurais/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect(moduleUsers.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ email: 'novo-operador@test.local', role: 'rotas_operador' })]))
    const pendingUser = moduleUsers.body.items.find((item) => item.email === 'candidata-rural@test.local')
    expect(pendingUser).toMatchObject({ role: 'usuario' })
    await request(app)
      .patch(`/api/rotas-rurais/users/${pendingUser._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'rotas_operador' })
      .expect(200)
    await request(app)
      .get('/api/rotas-rurais/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    const approved = await request(app)
      .patch(`/api/rotas-rurais/properties/${manual.body.property._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' })
      .expect(200)

    expect(approved.body).toMatchObject({
      status: 'active',
      firebaseKey: 'portal_test_key',
    })
    expect(require('../../helpers/rural-property-publisher').publishRuralProperty).toHaveBeenCalled()

    const managed = await request(app)
      .get('/api/rotas-rurais/operator/properties')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(managed.body.items.some((item) => item._id === manual.body.property._id)).toBe(true)
    const propertyWithProfile = managed.body.items.find((item) => item.plusCode === '58M5+CFGH')
    expect(propertyWithProfile.profile).toMatchObject({
      personal: { fullName: 'Produtor Teste' },
      property: { ruralNeighborhood: 'Bairro do Cafe' },
    })

    const profileEdited = await request(app)
      .patch(`/api/rotas-rurais/operator/properties/${propertyWithProfile._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        codigoUpa: propertyWithProfile.codigoUpa,
        name: propertyWithProfile.name,
        profile: {
          personal: { ...propertyWithProfile.profile.personal, phone: '14988887777' },
          property: { ...propertyWithProfile.profile.property, ruralNeighborhood: 'Venda Seca' },
        },
      })
      .expect(200)
    expect(profileEdited.body.profile).toMatchObject({
      personal: { phone: '14988887777' },
      property: { ruralNeighborhood: 'Venda Seca' },
    })

    const edited = await request(app)
      .patch(`/api/rotas-rurais/operator/properties/${manual.body.property._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ codigoUpa: 'UPA-MANUAL-002', name: 'Propriedade Manual Editada' })
      .expect(200)
    expect(edited.body).toMatchObject({ codigoUpa: 'UPA-MANUAL-002', name: 'Propriedade Manual Editada' })

    await request(app)
      .delete(`/api/rotas-rurais/operator/properties/${manual.body.property._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    await request(app)
      .post('/api/rotas-rurais/portal/login')
      .send({ username: '7FG8+CFGH', password: manual.body.temporaryPassword })
      .expect(401)
    global.fetch = originalFetch
  })
})
