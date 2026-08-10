const request = require('supertest')
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  getApp,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness')

const EducationEntity = require('../../models/EducationEntity')
const EducationUserAssignment = require('../../models/EducationUserAssignment')
const EducationPost = require('../../models/EducationPost')

async function seedEntity(suffix = Date.now()) {
  return EducationEntity.create({
    name: 'EMEF Teste',
    slug: `emef-teste-${suffix}`,
    type: 'escola',
    isActive: true,
  })
}

describe('Módulo Educação — rotas públicas e admin', () => {
  beforeAll(() => setupIntegrationTest())
  afterAll(() => teardownIntegrationTest())

  test('GET /education retorna visão geral', async () => {
    const res = await request(getApp()).get('/education')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.module).toBe('education')
  })

  test('GET /education/entities lista unidades ativas', async () => {
    await seedEntity()
    const res = await request(getApp()).get('/education/entities')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
  })

  test('GET /education/entities/:slug retorna perfil público', async () => {
    const entity = await seedEntity()
    const res = await request(getApp()).get(`/education/entities/${entity.slug}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('EMEF Teste')
    expect(res.body.data).toHaveProperty('news')
    expect(res.body.data).toHaveProperty('galleries')
  })

  test('POST /education/admin/entities exige autenticação', async () => {
    const res = await request(getApp())
      .post('/education/admin/entities')
      .send({ name: 'Nova Escola', type: 'escola' })
    expect(res.status).toBe(401)
  })

  test('gestor cria post na própria unidade', async () => {
    const entity = await EducationEntity.create({
      name: 'Creche Gestor',
      slug: 'creche-gestor',
      type: 'creche',
      isActive: true,
    })
    const manager = await createVerifiedUser({ email: 'gestor-edu@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: manager._id,
      educationEntityId: entity._id,
      role: 'education_manager',
    })

    const res = await request(getApp())
      .post('/education/admin/posts')
      .set('Authorization', `Bearer ${bearerToken(manager)}`)
      .send({
        educationEntityId: entity._id.toString(),
        title: 'Comunicado de teste',
        type: 'comunicado',
        content: 'Conteúdo do comunicado.',
      })

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Comunicado de teste')
    expect(res.body.data.status).toBe('draft')
  })

  test('POST /education/admin/posts retorna 422 estruturado sem campos obrigatórios', async () => {
    const admin = await createVerifiedUser({ email: 'admin-val@test.local', role: 'admin' })
    const res = await request(getApp())
      .post('/education/admin/posts')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({})

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe('Erro de validação')
    expect(res.body.errors.educationEntityId).toBeDefined()
    expect(res.body.errors.title).toBeDefined()
    expect(res.body.errors.type).toBeDefined()
  })

  test('POST /education/admin/posts via multipart cria publicação', async () => {
    const entity = await EducationEntity.create({
      name: 'Creche FormData',
      slug: 'creche-formdata',
      type: 'creche',
      isActive: true,
    })
    const admin = await createVerifiedUser({ email: 'admin-formdata@test.local', role: 'admin' })

    const res = await request(getApp())
      .post('/education/admin/posts')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('educationEntityId', entity._id.toString())
      .field('title', 'Comunicado multipart')
      .field('type', 'comunicado')
      .field('content', 'Conteúdo via FormData.')
      .field('featuredMediaType', 'none')
      .field('featured', 'false')
      .field('status', 'draft')

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Comunicado multipart')
  })

  test('POST /education/admin/posts aceita link externo complementar', async () => {
    const entity = await EducationEntity.create({
      name: 'Escola Link Externo',
      slug: 'escola-link-externo',
      type: 'escola',
      isActive: true,
    })
    const admin = await createVerifiedUser({ email: 'admin-link-ext@test.local', role: 'admin' })

    const res = await request(getApp())
      .post('/education/admin/posts')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        educationEntityId: entity._id.toString(),
        title: 'Notícia com link externo',
        type: 'noticia',
        content: 'Conteúdo com referência externa.',
        sourceUrl: 'www.exemplo.gov.br/educacao',
        featuredMediaType: 'none',
        status: 'draft',
      })

    expect(res.status).toBe(201)
    expect(res.body.data.sourceUrl).toBe('https://www.exemplo.gov.br/educacao')
  })

  test('POST /education/admin/posts aceita anexo com link externo', async () => {
    const entity = await EducationEntity.create({
      name: 'Escola Anexo Externo',
      slug: 'escola-anexo-externo',
      type: 'escola',
      isActive: true,
    })
    const admin = await createVerifiedUser({ email: 'admin-anexo-ext@test.local', role: 'admin' })

    const res = await request(getApp())
      .post('/education/admin/posts')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        educationEntityId: entity._id.toString(),
        title: 'Edital externo',
        type: 'comunicado',
        content: 'Consulte o edital no link abaixo.',
        featuredMediaType: 'none',
        status: 'draft',
        existingAttachments: [
          {
            title: 'Edital no portal federal',
            documentType: 'edital',
            fileUrl: 'https://www.gov.br/educacao/edital',
            originalName: 'Link externo',
          },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.data.attachments).toHaveLength(1)
    expect(res.body.data.attachments[0].fileUrl).toBe('https://www.gov.br/educacao/edital')
  })

  test('gestor não cria post em outra unidade', async () => {
    const entityA = await EducationEntity.create({
      name: 'Escola A',
      slug: 'escola-a',
      type: 'escola',
      isActive: true,
    })
    const entityB = await EducationEntity.create({
      name: 'Escola B',
      slug: 'escola-b',
      type: 'escola',
      isActive: true,
    })
    const manager = await createVerifiedUser({ email: 'gestor-b@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: manager._id,
      educationEntityId: entityA._id,
      role: 'education_manager',
    })

    const res = await request(getApp())
      .post('/education/admin/posts')
      .set('Authorization', `Bearer ${bearerToken(manager)}`)
      .send({
        educationEntityId: entityB._id.toString(),
        title: 'Tentativa inválida',
        type: 'noticia',
      })

    expect(res.status).toBe(403)
  })

  test('publicação publicada aparece em GET /education/news', async () => {
    const entity = await EducationEntity.create({
      name: 'EMEI Publicada',
      slug: 'emei-publicada',
      type: 'emei',
      isActive: true,
    })
    await EducationPost.create({
      educationEntityId: entity._id,
      title: 'Notícia Publicada',
      slug: 'noticia-publicada',
      type: 'noticia',
      status: 'published',
      publishedAt: new Date(),
      summary: 'Resumo',
      content: 'Conteúdo',
    })

    const res = await request(getApp()).get('/education/news')
    expect(res.status).toBe(200)
    const titles = res.body.data.map((p) => p.title)
    expect(titles).toContain('Notícia Publicada')
  })

  test('admin global cria entidade', async () => {
    const admin = await createVerifiedUser({ email: 'admin-edu@test.local', role: 'admin' })
    const res = await request(getApp())
      .post('/education/admin/entities')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        name: 'Escola Admin',
        type: 'escola',
        slug: 'escola-admin',
      })
    expect(res.status).toBe(201)
    expect(res.body.data.slug).toBe('escola-admin')
  })

  test('admin atualiza tipo da entidade na edição', async () => {
    const admin = await createVerifiedUser({ email: 'admin-type@test.local', role: 'admin' })
    const createRes = await request(getApp())
      .post('/education/admin/entities')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        name: 'Unidade Tipo',
        type: 'escola',
        slug: 'unidade-tipo',
        phone: '(14) 3471-0000',
      })
    expect(createRes.status).toBe(201)
    const entityId = createRes.body.data._id

    const updateRes = await request(getApp())
      .put(`/education/admin/entities/${entityId}`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        type: 'creche',
        phone: '(14) 3471-0000',
      })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.type).toBe('creche')
  })

  test('CRUD de unidades escolares com endereço estruturado', async () => {
    const admin = await createVerifiedUser({ email: 'admin-units@test.local', role: 'admin' })

    const createRes = await request(getApp())
      .post('/education/admin/school-units')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('name', 'EMEF Integração')
      .field('type', 'escola')
      .field('slug', 'emef-integracao')
      .field('phone', '(14) 3471-1234')
      .field('whatsapp', '(14) 99999-8888')
      .field('email', 'emef@test.local')
      .field('cep', '17400-000')
      .field('street', 'Rua das Flores')
      .field('number', '100')
      .field('complement', 'Sala 1')
      .field('neighborhood', 'Centro')
      .field('city', 'Garça')
      .field('state', 'SP')

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.whatsapp).toBe('(14) 99999-8888')
    expect(createRes.body.data.addressDetails.street).toBe('Rua das Flores')
    expect(createRes.body.data.addressDetails.cep).toBe('17400-000')
    const unitId = createRes.body.data._id

    const listRes = await request(getApp()).get('/education/school-units')
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((u) => u.slug === 'emef-integracao')).toBe(true)

    const detailRes = await request(getApp()).get('/education/school-units/emef-integracao')
    expect(detailRes.status).toBe(200)
    expect(detailRes.body.data.fullAddress).toContain('Rua das Flores')

    const adminListRes = await request(getApp())
      .get('/education/admin/school-units')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(adminListRes.status).toBe(200)
    expect(adminListRes.body.data.length).toBeGreaterThanOrEqual(1)

    const getByIdRes = await request(getApp())
      .get(`/education/admin/school-units/${unitId}`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(getByIdRes.status).toBe(200)
    expect(getByIdRes.body.data.email).toBe('emef@test.local')

    const updateRes = await request(getApp())
      .put(`/education/admin/school-units/${unitId}`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('name', 'EMEF Integração Atualizada')
      .field('type', 'escola')
      .field('number', '200')
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.name).toBe('EMEF Integração Atualizada')
    expect(updateRes.body.data.addressDetails.number).toBe('200')

    const deactivateRes = await request(getApp())
      .patch(`/education/admin/school-units/${unitId}/deactivate`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(deactivateRes.status).toBe(200)
    expect(deactivateRes.body.data.isActive).toBe(false)

    const publicHidden = await request(getApp()).get('/education/school-units/emef-integracao')
    expect(publicHidden.status).toBe(404)

    const activateRes = await request(getApp())
      .patch(`/education/admin/school-units/${unitId}/activate`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(activateRes.status).toBe(200)
    expect(activateRes.body.data.isActive).toBe(true)

    const deleteRes = await request(getApp())
      .delete(`/education/admin/school-units/${unitId}`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(deleteRes.status).toBe(200)
  })

  test('POST /education/admin/school-units exige autenticação', async () => {
    const res = await request(getApp())
      .post('/education/admin/school-units')
      .send({ name: 'Nova Escola', type: 'escola' })
    expect(res.status).toBe(401)
  })

  test('calendário escolar: CRUD, cancelamento e duplicação', async () => {
    const entity = await EducationEntity.create({
      name: 'EMEF Calendário',
      slug: 'emef-calendario',
      type: 'escola',
      isActive: true,
    })
    const admin = await createVerifiedUser({ email: 'admin-cal@test.local', role: 'admin' })

    const createRes = await request(getApp())
      .post('/education/admin/calendar')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('title', 'Reunião de Pais')
      .field('description', 'Reunião pedagógica com responsáveis.')
      .field('type', 'reuniao')
      .field('educationEntityId', entity._id.toString())
      .field('startDateOnly', '2026-06-20')
      .field('startTime', '19:00')
      .field('endDateOnly', '2026-06-20')
      .field('endTime', '21:00')
      .field('location', 'Auditório')
      .field('responsible', 'Direção')
      .field('color', '#3460a4')
      .field('notifyBeforeDays', '2')

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.description).toContain('Reunião pedagógica')
    expect(createRes.body.data.startTime).toBe('19:00')
    expect(createRes.body.data.location).toBe('Auditório')
    expect(createRes.body.data.responsible).toBe('Direção')
    const eventId = createRes.body.data._id

    const listRes = await request(getApp())
      .get('/education/admin/calendar')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .query({ entityId: entity._id.toString(), month: 6, year: 2026, expandRecurrence: true })
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1)

    const cancelRes = await request(getApp())
      .patch(`/education/admin/calendar/${eventId}/cancel`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.data.status).toBe('cancelled')

    const dupRes = await request(getApp())
      .post(`/education/admin/calendar/${eventId}/duplicate`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(dupRes.status).toBe(201)
    expect(dupRes.body.data.title).toContain('cópia')
    expect(dupRes.body.data.status).toBe('active')

    const notifRes = await request(getApp())
      .get('/education/admin/calendar/notifications')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(notifRes.status).toBe(200)
    expect(Array.isArray(notifRes.body.data)).toBe(true)
  })

  test('GET /education/search exige termo mínimo', async () => {
    const res = await request(getApp()).get('/education/search?q=a')
    expect(res.status).toBe(422)
  })

  test('GET /education/search retorna resultados agrupados', async () => {
    const entity = await EducationEntity.create({
      name: 'Escola Busca Teste',
      slug: 'escola-busca-teste',
      type: 'escola',
      isActive: true,
    })
    await EducationPost.create({
      educationEntityId: entity._id,
      title: 'Busca Teste Comunicado',
      slug: 'busca-teste-comunicado',
      type: 'comunicado',
      status: 'published',
      publishedAt: new Date(),
      summary: 'Resumo',
      content: 'Conteúdo',
    })

    const res = await request(getApp()).get('/education/search?q=Busca%20Teste')
    expect(res.status).toBe(200)
    expect(res.body.data.entities?.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.news?.length).toBeGreaterThanOrEqual(1)
  })

  test('workflow documental: rascunho → revisão → publicação', async () => {
    const council = await EducationEntity.create({
      name: 'CME Workflow',
      slug: 'cme-workflow',
      type: 'conselho',
      councilCode: 'CME',
      isActive: true,
    })
    const councilUser = await createVerifiedUser({ email: 'council-wf@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: councilUser._id,
      educationEntityId: council._id,
      role: 'education_council',
    })

    const EducationDocument = require('../../models/EducationDocument')

    const createRes = await request(getApp())
      .post('/education/admin/documents')
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
      .field('educationEntityId', council._id.toString())
      .field('title', 'Ata de teste workflow')
      .field('documentType', 'ata')
      .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'ata.pdf', contentType: 'application/pdf' })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.status).toBe('draft')
    const docId = createRes.body.data._id

    const submitRes = await request(getApp())
      .patch(`/education/admin/documents/${docId}/submit-review`)
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
    expect(submitRes.status).toBe(200)
    expect(submitRes.body.data.status).toBe('pending_review')

    const publishDenied = await request(getApp())
      .patch(`/education/admin/documents/${docId}/publish`)
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
    expect(publishDenied.status).toBe(403)

    const admin = await createVerifiedUser({ email: 'admin-doc-wf@test.local', role: 'admin' })
    const publishRes = await request(getApp())
      .patch(`/education/admin/documents/${docId}/publish`)
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(publishRes.status).toBe(200)
    expect(publishRes.body.data.status).toBe('published')

    const publicRes = await request(getApp()).get(`/education/documents/${docId}`)
    expect(publicRes.status).toBe(200)
    expect(publicRes.body.data.title).toBe('Ata de teste workflow')

    await EducationDocument.deleteOne({ _id: docId })
  })

  test('conselho publica documento na criação e lista no portal', async () => {
    const council = await EducationEntity.create({
      name: 'CME Publicação Direta',
      slug: 'cme-publicacao-direta',
      type: 'conselho',
      councilCode: 'CMP',
      isActive: true,
    })
    const councilUser = await createVerifiedUser({ email: 'council-pub@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: councilUser._id,
      educationEntityId: council._id,
      role: 'education_council',
    })

    const createRes = await request(getApp())
      .post('/education/admin/documents')
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
      .field('educationEntityId', council._id.toString())
      .field('title', 'Ata publicada na criação')
      .field('documentType', 'ata')
      .field('publish', 'true')
      .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'ata-pub.pdf', contentType: 'application/pdf' })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.status).toBe('published')

    const listRes = await request(getApp())
      .get('/education/documents')
      .query({ entitySlug: council.slug, limit: 100 })
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((d) => d.title === 'Ata publicada na criação')).toBe(true)

    const EducationDocument = require('../../models/EducationDocument')
    await EducationDocument.deleteMany({ educationEntityId: council._id })
    await council.deleteOne()
  })

  test('legislação do conselho aparece no portal público', async () => {
    const council = await EducationEntity.create({
      name: 'CME Legislação',
      slug: 'cme-legislacao',
      type: 'conselho',
      councilCode: 'CML',
      isActive: true,
    })
    const councilUser = await createVerifiedUser({ email: 'council-leg@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: councilUser._id,
      educationEntityId: council._id,
      role: 'education_council',
    })

    const createRes = await request(getApp())
      .post('/education/admin/legislation')
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
      .field('educationEntityId', council._id.toString())
      .field('title', 'Resolução de teste 001/2026')
      .field('category', 'resolucao')
      .field('number', '001')
      .field('year', '2026')
      .field('status', 'published')
      .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'resolucao.pdf', contentType: 'application/pdf' })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.status).toBe('published')

    const listRes = await request(getApp())
      .get('/education/legislation')
      .query({ entitySlug: council.slug, limit: 100 })
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((d) => d.title === 'Resolução de teste 001/2026')).toBe(true)

    const legId = createRes.body.data._id
    const updateRes = await request(getApp())
      .put(`/education/admin/legislation/${legId}`)
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
      .field('title', 'Resolução atualizada 001/2026')
      .field('status', 'published')
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.data.title).toBe('Resolução atualizada 001/2026')

    const EducationLegislation = require('../../models/EducationLegislation')
    await EducationLegislation.deleteMany({ educationEntityId: council._id })
    await council.deleteOne()
  })

  test('reunião do conselho aparece no calendário público', async () => {
    const council = await EducationEntity.create({
      name: 'CME Reuniões',
      slug: 'cme-reunioes',
      type: 'conselho',
      councilCode: 'CMR',
      isActive: true,
    })
    const councilUser = await createVerifiedUser({ email: 'council-meet@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: councilUser._id,
      educationEntityId: council._id,
      role: 'education_council',
    })

    const createRes = await request(getApp())
      .post('/education/admin/calendar')
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
      .field('title', 'Reunião ordinária CACS')
      .field('description', 'Pauta: calendário de reuniões.')
      .field('type', 'reuniao_conselho')
      .field('educationEntityId', council._id.toString())
      .field('startDateOnly', '2026-07-10')
      .field('endDateOnly', '2026-07-10')
      .field('startTime', '14:00')
      .field('endTime', '16:00')
      .field('location', 'Sala de reuniões')
      .field('responsible', 'Presidente do conselho')
      .field('status', 'active')
      .field('isPublic', 'true')

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.type).toBe('reuniao_conselho')

    const listRes = await request(getApp())
      .get('/education/calendar')
      .query({ entitySlug: council.slug, limit: 100 })
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((ev) => ev.title === 'Reunião ordinária CACS')).toBe(true)

    const EducationCalendarEvent = require('../../models/EducationCalendarEvent')
    await EducationCalendarEvent.deleteMany({ educationEntityId: council._id })
    await council.deleteOne()
  })

  test('GET /education/news?featured=true inclui destaques de qualquer tipo publicado', async () => {
    const entity = await EducationEntity.create({
      name: 'Escola Destaque',
      slug: `escola-destaque-${Date.now()}`,
      type: 'escola',
      isActive: true,
    })

    await EducationPost.create({
      educationEntityId: entity._id,
      title: 'Projeto em destaque',
      slug: `projeto-destaque-${Date.now()}`,
      type: 'projeto',
      status: 'published',
      featured: true,
      publishedAt: new Date(),
    })
    await EducationPost.create({
      educationEntityId: entity._id,
      title: 'Campanha em destaque',
      slug: `campanha-destaque-${Date.now()}`,
      type: 'campanha',
      status: 'published',
      featured: true,
      publishedAt: new Date(),
    })
    await EducationPost.create({
      educationEntityId: entity._id,
      title: 'Comunicado sem destaque',
      slug: `comunicado-sem-destaque-${Date.now()}`,
      type: 'comunicado',
      status: 'published',
      featured: false,
      publishedAt: new Date(),
    })

    const res = await request(getApp()).get('/education/news').query({ featured: true, limit: 50 })
    expect(res.status).toBe(200)
    const titles = (res.body.data || []).map((post) => post.title)
    expect(titles).toContain('Projeto em destaque')
    expect(titles).toContain('Campanha em destaque')
    expect(titles).not.toContain('Comunicado sem destaque')

    await EducationPost.deleteMany({ educationEntityId: entity._id })
    await entity.deleteOne()
  })

  test('gestor não publica post diretamente na criação', async () => {
    const entity = await EducationEntity.create({
      name: 'EMEF Publish Block',
      slug: 'emef-publish-block',
      type: 'escola',
      isActive: true,
    })
    const manager = await createVerifiedUser({ email: 'gestor-pub-block@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: manager._id,
      educationEntityId: entity._id,
      role: 'education_manager',
    })

    const res = await request(getApp())
      .post('/education/admin/posts')
      .set('Authorization', `Bearer ${bearerToken(manager)}`)
      .send({
        educationEntityId: entity._id.toString(),
        title: 'Tentativa publicar direto',
        type: 'comunicado',
        content: 'Conteúdo.',
        status: 'published',
      })

    expect(res.status).toBe(403)
    expect(res.body.error || res.body.message).toMatch(/publicar/i)
  })

  test('gestor lista atribuições de aulas apenas do escopo', async () => {
    const EducationLessonAssignment = require('../../models/EducationLessonAssignment')
    const schoolA = await EducationEntity.create({
      name: 'Escola Atrib A',
      slug: 'escola-atrib-a',
      type: 'escola',
      isActive: true,
    })
    const schoolB = await EducationEntity.create({
      name: 'Escola Atrib B',
      slug: 'escola-atrib-b',
      type: 'escola',
      isActive: true,
    })
    const manager = await createVerifiedUser({ email: 'gestor-atrib@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: manager._id,
      educationEntityId: schoolA._id,
      role: 'education_manager',
    })

    const mine = await EducationLessonAssignment.create({
      title: 'Atribuição escola A',
      category: 'atribuicao_anual',
      processStatus: 'aberta',
      publicationStatus: 'draft',
      vacancies: [{
        educationEntityId: schoolA._id,
        position: 'Professor',
        subject: 'Matemática',
      }],
    })
    await EducationLessonAssignment.create({
      title: 'Atribuição escola B',
      category: 'atribuicao_anual',
      processStatus: 'aberta',
      publicationStatus: 'draft',
      vacancies: [{
        educationEntityId: schoolB._id,
        position: 'Professor',
        subject: 'Português',
      }],
    })

    const listRes = await request(getApp())
      .get('/education/admin/lesson-assignments')
      .set('Authorization', `Bearer ${bearerToken(manager)}`)
    expect(listRes.status).toBe(200)
    const titles = (listRes.body.data || []).map((item) => item.title)
    expect(titles).toContain('Atribuição escola A')
    expect(titles).not.toContain('Atribuição escola B')

    const deniedRes = await request(getApp())
      .get(`/education/admin/lesson-assignments/${mine._id}`)
      .set('Authorization', `Bearer ${bearerToken(manager)}`)
    expect(deniedRes.status).toBe(200)

    const other = await EducationLessonAssignment.findOne({ title: 'Atribuição escola B' })
    const otherRes = await request(getApp())
      .get(`/education/admin/lesson-assignments/${other._id}`)
      .set('Authorization', `Bearer ${bearerToken(manager)}`)
    expect(otherRes.status).toBe(403)

    await EducationLessonAssignment.deleteMany({ title: /^Atribuição escola/ })
    await schoolA.deleteOne()
    await schoolB.deleteOne()
  })

  test('conselho lista legislação admin apenas do próprio conselho', async () => {
    const EducationLegislation = require('../../models/EducationLegislation')
    const councilA = await EducationEntity.create({
      name: 'CME Escopo A',
      slug: 'cme-escopo-a',
      type: 'conselho',
      councilCode: 'CSA',
      isActive: true,
    })
    const councilB = await EducationEntity.create({
      name: 'CME Escopo B',
      slug: 'cme-escopo-b',
      type: 'conselho',
      councilCode: 'CSB',
      isActive: true,
    })
    const councilUser = await createVerifiedUser({ email: 'council-scope@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: councilUser._id,
      educationEntityId: councilA._id,
      role: 'education_council',
    })

    await EducationLegislation.create({
      educationEntityId: councilA._id,
      title: 'Resolução conselho A',
      category: 'resolucao',
      fileUrl: '/uploads/education/documents/test-a.pdf',
      status: 'draft',
    })
    await EducationLegislation.create({
      educationEntityId: councilB._id,
      title: 'Resolução conselho B',
      category: 'resolucao',
      fileUrl: '/uploads/education/documents/test-b.pdf',
      status: 'draft',
    })

    const listRes = await request(getApp())
      .get('/education/admin/legislation')
      .set('Authorization', `Bearer ${bearerToken(councilUser)}`)
    expect(listRes.status).toBe(200)
    const titles = (listRes.body.data || []).map((item) => item.title)
    expect(titles).toContain('Resolução conselho A')
    expect(titles).not.toContain('Resolução conselho B')

    await EducationLegislation.deleteMany({ title: /^Resolução conselho/ })
    await councilA.deleteOne()
    await councilB.deleteOne()
  })

  test('secretaria publica legislação global (lei municipal)', async () => {
    const secretary = await createVerifiedUser({ email: 'sec-leg@test.local', role: 'usuario' })
    await EducationUserAssignment.create({
      userId: secretary._id,
      role: 'education_secretary',
    })

    const res = await request(getApp())
      .post('/education/admin/legislation')
      .set('Authorization', `Bearer ${bearerToken(secretary)}`)
      .field('title', 'Lei municipal de teste')
      .field('category', 'lei_municipal')
      .field('number', '5.656/2024')
      .field('year', '2024')
      .field('status', 'published')
      .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'lei.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(201)
    expect(res.body.data.category).toBe('lei_municipal')
    expect(res.body.data.educationEntityId).toBeFalsy()

    const EducationLegislation = require('../../models/EducationLegislation')
    await EducationLegislation.deleteMany({ title: 'Lei municipal de teste' })
  })

  test('dashboard admin retorna capabilities', async () => {
    const admin = await createVerifiedUser({ email: 'admin-caps@test.local', role: 'admin' })
    const res = await request(getApp())
      .get('/education/admin/dashboard')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
    expect(res.status).toBe(200)
    expect(res.body.data.capabilities).toBeDefined()
    expect(res.body.data.capabilities.canManageEntities).toBe(true)
    expect(res.body.data.capabilities.canApproveContent).toBe(true)
  })

  test('gestor exige unidade escolar no vínculo', async () => {
    const admin = await createVerifiedUser({ email: 'admin-assign@test.local', role: 'admin' })
    const manager = await createVerifiedUser({ email: 'gestor-assign@test.local', role: 'usuario' })
    const council = await EducationEntity.create({
      name: 'CME Assign',
      slug: 'cme-assign',
      type: 'conselho',
      isActive: true,
    })

    const missingEntity = await request(getApp())
      .post('/education/admin/assignments')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({ userId: manager._id.toString(), role: 'education_manager' })
    expect(missingEntity.status).toBe(422)

    const wrongEntity = await request(getApp())
      .post('/education/admin/assignments')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        userId: manager._id.toString(),
        role: 'education_manager',
        educationEntityId: council._id.toString(),
      })
    expect(wrongEntity.status).toBe(422)

    const school = await EducationEntity.create({
      name: 'EMEF Assign',
      slug: 'emef-assign',
      type: 'escola',
      isActive: true,
    })
    const okRes = await request(getApp())
      .post('/education/admin/assignments')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        userId: manager._id.toString(),
        role: 'education_manager',
        educationEntityId: school._id.toString(),
      })
    expect(okRes.status).toBe(201)
    expect(String(okRes.body.data.educationEntityId)).toBe(String(school._id))

    await EducationUserAssignment.deleteMany({ userId: manager._id })
    await council.deleteOne()
    await school.deleteOne()
  })

  test('admin vincula gestor por e-mail', async () => {
    const admin = await createVerifiedUser({ email: 'admin-email-assign@test.local', role: 'admin' })
    const manager = await createVerifiedUser({ email: 'gestor-email@test.local', role: 'usuario' })
    const school = await EducationEntity.create({
      name: 'EMEF Email',
      slug: 'emef-email',
      type: 'escola',
      isActive: true,
    })

    const res = await request(getApp())
      .post('/education/admin/assignments/by-email')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .send({
        email: manager.email,
        role: 'education_manager',
        educationEntityId: school._id.toString(),
      })

    expect(res.status).toBe(201)
    expect(res.body.data.role).toBe('education_manager')

    await EducationUserAssignment.deleteMany({ userId: manager._id })
    await school.deleteOne()
  })

  test('Plano Municipal da Educação — cadastro admin e listagem pública', async () => {
    const EducationMunicipalPlan = require('../../models/EducationMunicipalPlan')
    const admin = await createVerifiedUser({ email: 'admin-pme@test.local', role: 'admin' })

    const createRes = await request(getApp())
      .post('/education/admin/municipal-plans')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('title', 'Plano Municipal de Educação — PDF 2026')
      .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'pme.pdf', contentType: 'application/pdf' })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.title).toMatch(/Plano Municipal/)
    expect(createRes.body.data.createdAt).toBeTruthy()
    expect(createRes.body.data.fileUrl).toBeTruthy()

    const listRes = await request(getApp()).get('/education/municipal-plans')
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((d) => d.title === 'Plano Municipal de Educação — PDF 2026')).toBe(true)

    await EducationMunicipalPlan.deleteMany({ title: 'Plano Municipal de Educação — PDF 2026' })
  })

  test('Política EI — cadastro admin e listagem pública por data', async () => {
    const EducationEarlyChildhoodPolicy = require('../../models/EducationEarlyChildhoodPolicy')
    const admin = await createVerifiedUser({ email: 'admin-ei@test.local', role: 'admin' })

    const older = await request(getApp())
      .post('/education/admin/early-childhood-policies')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('title', 'Política EI — documento A')
      .attach('file', Buffer.from('%PDF-1.4 a'), { filename: 'ei-a.pdf', contentType: 'application/pdf' })

    expect(older.status).toBe(201)

    const newer = await request(getApp())
      .post('/education/admin/early-childhood-policies')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('title', 'Política EI — documento B')
      .attach('file', Buffer.from('%PDF-1.4 b'), { filename: 'ei-b.pdf', contentType: 'application/pdf' })

    expect(newer.status).toBe(201)

    const listRes = await request(getApp()).get('/education/early-childhood-policies')
    expect(listRes.status).toBe(200)
    const titles = (listRes.body.data || [])
      .filter((d) => String(d.title).startsWith('Política EI — documento'))
      .map((d) => d.title)
    expect(titles[0]).toBe('Política EI — documento B')
    expect(titles[1]).toBe('Política EI — documento A')

    await EducationEarlyChildhoodPolicy.deleteMany({
      title: { $in: ['Política EI — documento A', 'Política EI — documento B'] },
    })
  })

  test('Cardápio Escolar — cadastro admin e listagem pública', async () => {
    const EducationSchoolMenu = require('../../models/EducationSchoolMenu')
    const admin = await createVerifiedUser({ email: 'admin-menu@test.local', role: 'admin' })

    const createRes = await request(getApp())
      .post('/education/admin/school-menus')
      .set('Authorization', `Bearer ${bearerToken(admin)}`)
      .field('title', 'Cardápio Escolar — Semana 1')
      .attach('file', Buffer.from('%PDF-1.4 menu'), { filename: 'cardapio.pdf', contentType: 'application/pdf' })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.title).toMatch(/Cardápio Escolar/)
    expect(createRes.body.data.createdAt).toBeTruthy()

    const listRes = await request(getApp()).get('/education/school-menus')
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some((d) => d.title === 'Cardápio Escolar — Semana 1')).toBe(true)

    await EducationSchoolMenu.deleteMany({ title: 'Cardápio Escolar — Semana 1' })
  })
})
