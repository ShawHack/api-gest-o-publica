const request = require('supertest')
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness')
const { zonedParts, zonedDateKey } = require('../../helpers/agenda-time')

describe('Agenda Garça com identidade central', () => {
  let app
  let admin
  let citizen
  let secondCitizen
  let adminToken
  let citizenToken
  let secondToken
  let service
  let startsAt

  beforeAll(async () => {
    app = await setupIntegrationTest()
    admin = await createVerifiedUser({ email: 'agenda-admin@test.local', role: 'admin', name: 'Admin Agenda' })
    citizen = await createVerifiedUser({ email: 'agenda-cidadao@test.local', role: 'usuario', name: 'Cidadão Agenda' })
    secondCitizen = await createVerifiedUser({ email: 'agenda-cidadao-2@test.local', role: 'usuario', name: 'Segundo Cidadão' })
    adminToken = bearerToken(admin)
    citizenToken = bearerToken(citizen)
    secondToken = bearerToken(secondCitizen)

    startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    startsAt.setUTCSeconds(0, 0)
    startsAt.setUTCMinutes(Math.ceil(startsAt.getUTCMinutes() / 5) * 5)
    const local = zonedParts(startsAt, 'America/Sao_Paulo')

    const unitResponse = await request(app)
      .post('/api/agenda/admin/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Paço Municipal', slug: 'paco-municipal' })
      .expect(201)

    const serviceResponse = await request(app)
      .post('/api/agenda/admin/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        unitId: unitResponse.body.unit._id,
        name: 'Atendimento de teste',
        durationMinutes: 20,
        slotIntervalMinutes: 5,
        minimumNoticeMinutes: 0,
        bookingWindowDays: 30,
        cancellationNoticeMinutes: 0,
        weeklyAvailability: [{ dayOfWeek: local.dayOfWeek, periods: [{ start: '00:00', end: '23:59' }] }],
      })
      .expect(201)
    service = serviceResponse.body.service
    await require('../../models/AgendaAppointment').init()
  })

  afterAll(async () => {
    await teardownIntegrationTest()
  })

  test('exige o login central em todas as rotas', async () => {
    await request(app).get('/api/agenda/services').expect(401)
  })

  test('expõe a identidade da coleção central sem criar cadastro paralelo', async () => {
    const User = require('../../models/User')
    const before = await User.countDocuments()
    const response = await request(app)
      .get('/api/agenda/me')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200)

    expect(response.body).toMatchObject({
      identitySource: 'users',
      user: { _id: citizen._id.toString(), email: citizen.email },
    })
    expect(await User.countDocuments()).toBe(before)
  })

  test('não permite que cidadão administre unidades ou permissões', async () => {
    await request(app)
      .post('/api/agenda/admin/units')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ name: 'Unidade indevida' })
      .expect(403)

    await request(app)
      .post('/api/agenda/admin/assignments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ userId: citizen._id, role: 'agenda_admin' })
      .expect(403)
  })

  test('sempre vincula o agendamento ao usuário autenticado e ignora userId enviado', async () => {
    const response = await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ serviceId: service._id, startsAt: startsAt.toISOString(), source: 'mobile', userId: admin._id })
      .expect(201)

    expect(response.body.appointment.userId).toBe(citizen._id.toString())
    expect(response.body.appointment.userId).not.toBe(admin._id.toString())
    expect(response.body.appointment.reservationKey).toBeUndefined()
    expect(response.body.appointment.identitySnapshot).toMatchObject({ name: citizen.name, email: citizen.email })
  })

  test('calcula disponibilidade sem expor dados e respeita fechamento administrativo', async () => {
    const date = zonedDateKey(startsAt, 'America/Sao_Paulo')
    const availability = await request(app)
      .get(`/api/agenda/services/${service._id}/availability`)
      .query({ date })
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200)
    const reserved = availability.body.slots.find((slot) => slot.startsAt === startsAt.toISOString())
    expect(reserved).toMatchObject({ available: false })
    expect(JSON.stringify(availability.body)).not.toContain(citizen.email)

    await request(app)
      .put(`/api/agenda/admin/services/${service._id}/availability-exception`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date, type: 'closed', reason: 'Feriado de teste' })
      .expect(200)

    const closed = await request(app)
      .get(`/api/agenda/services/${service._id}/availability`)
      .query({ date })
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200)
    expect(closed.body).toMatchObject({ exception: { type: 'closed', reason: 'Feriado de teste' }, slots: [] })

    await request(app)
      .put(`/api/agenda/admin/services/${service._id}/availability-exception`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date, type: 'custom', periods: [{ start: '00:00', end: '23:59' }], reason: 'Reabertura de teste' })
      .expect(200)
  })

  test('impede reserva duplicada e libera o horário após cancelamento', async () => {
    await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ serviceId: service._id, startsAt: startsAt.toISOString(), source: 'web' })
      .expect(409)

    const mine = await request(app)
      .get('/api/agenda/appointments/mine')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200)
    const appointment = mine.body.items.find((item) => item.serviceId._id === service._id)
    expect(appointment).toBeTruthy()
    expect(appointment.reservationKey).toBeUndefined()

    await request(app)
      .patch(`/api/agenda/appointments/${appointment._id}/cancel`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ reason: 'Teste de cancelamento' })
      .expect(200)

    const rebooked = await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ serviceId: service._id, startsAt: startsAt.toISOString(), source: 'web' })
      .expect(201)
    expect(rebooked.body.appointment.userId).toBe(secondCitizen._id.toString())
  })
})
