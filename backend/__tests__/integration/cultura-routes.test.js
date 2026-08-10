const request = require('supertest')
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness')

const CulturaCategory = require('../../models/CulturaCategory')
const CulturaUserAssignment = require('../../models/CulturaUserAssignment')
const CulturaPost = require('../../models/CulturaPost')

describe('Módulo Cultura — rotas públicas e admin', () => {
  beforeAll(() => setupIntegrationTest())
  afterAll(() => teardownIntegrationTest())

  test('GET /cultura retorna visão geral', async () => {
    const res = await request(getApp()).get('/cultura')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.module).toBe('cultura')
  })

  test('GET /api/posts lista publicações (legado)', async () => {
    await CulturaPost.create({
      titulo: 'Show de Teste',
      tipo: 'Festival',
      formato: ['Evento'],
      descricao: 'Descrição do evento de teste.',
      status: 'published',
    })
    const res = await request(getApp()).get('/api/posts')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  test('GET /api/categories retorna categorias', async () => {
    await CulturaCategory.create({ nome: 'Festival', cor: '#3b82f6' })
    const res = await request(getApp()).get('/api/categories')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /api/posts exige autenticação', async () => {
    const res = await request(getApp())
      .post('/api/posts')
      .field('titulo', 'Novo')
      .field('tipo', 'Cultura')
      .field('formato', JSON.stringify(['Evento']))
      .field('descricao', 'Teste')
    expect(res.status).toBe(401)
  })

  test('admin_cultura cria publicação', async () => {
    const staff = await createVerifiedUser({ email: 'admin-cultura@test.local', role: 'usuario' })
    await CulturaUserAssignment.create({
      userId: staff._id,
      role: 'admin_cultura',
    })

    const res = await request(getApp())
      .post('/api/posts')
      .set('Authorization', `Bearer ${bearerToken(staff)}`)
      .field('titulo', 'Peça Municipal')
      .field('tipo', 'Teatro')
      .field('formato', JSON.stringify(['Evento']))
      .field('descricao', 'Espetáculo de abertura da temporada.')
      .field('emCartazTeatro', 'true')

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.post.titulo).toBe('Peça Municipal')
  })

  test('usuário comum não acessa dashboard admin', async () => {
    const user = await createVerifiedUser({ email: 'cidadao-cultura@test.local' })
    const res = await request(getApp())
      .get('/cultura/admin/dashboard')
      .set('Authorization', `Bearer ${bearerToken(user)}`)
    expect(res.status).toBe(403)
  })

  test('admin_cultura acessa dashboard', async () => {
    const staff = await createVerifiedUser({ email: 'staff-cultura@test.local' })
    await CulturaUserAssignment.create({ userId: staff._id, role: 'admin_cultura' })
    const res = await request(getApp())
      .get('/cultura/admin/dashboard')
      .set('Authorization', `Bearer ${bearerToken(staff)}`)
    expect(res.status).toBe(200)
    expect(res.body.data.isCulturaAdmin).toBe(true)
  })

  test('usuário autenticado salva e remove favorito', async () => {
    const user = await createVerifiedUser({ email: 'fav-cultura@test.local' })
    const post = await CulturaPost.create({
      titulo: 'Evento Favorito',
      tipo: 'Cultura',
      formato: ['Evento'],
      descricao: 'Evento para favoritar.',
      status: 'published',
    })

    const add = await request(getApp())
      .post(`/api/users/${user._id}/events`)
      .set('Authorization', `Bearer ${bearerToken(user)}`)
      .send({ eventId: post._id.toString() })
    expect(add.status).toBe(200)
    expect(add.body.eventosSalvos).toContain(post._id.toString())

    const remove = await request(getApp())
      .post(`/api/users/${user._id}/events`)
      .set('Authorization', `Bearer ${bearerToken(user)}`)
      .send({ eventId: post._id.toString() })
    expect(remove.status).toBe(200)
    expect(remove.body.eventosSalvos).not.toContain(post._id.toString())
  })

  test('admin global acessa dashboard cultura', async () => {
    const admin = await createVerifiedUser({ email: 'admin-global-cultura@test.local', role: 'admin' })
    const res = await request(getApp())
      .get('/cultura/admin/dashboard')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(res.status).toBe(200)
    expect(res.body.data.isGlobalAdmin).toBe(true)
  })
})
