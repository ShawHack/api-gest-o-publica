const request = require('supertest')
const {
  setupIntegrationTest,
  teardownIntegrationTest,
  createVerifiedUser,
  bearerToken,
} = require('../helpers/test-harness')
const { zonedParts, zonedDateKey, zonedDateTimeToUtc } = require('../../helpers/agenda-time')

describe('Agenda Garça com identidade central', () => {
  let app
  let admin
  let citizen
  let secondCitizen
  let adminToken
  let citizenToken
  let secondToken
  let service
  let capacityService
  let bufferedService
  let roomResource
  let unit
  let startsAt
  let secondAppointment
  let idempotentAppointment

  beforeAll(async () => {
    app = await setupIntegrationTest()
    admin = await createVerifiedUser({ email: 'agenda-admin@test.local', role: 'admin', name: 'Admin Agenda' })
    citizen = await createVerifiedUser({ email: 'agenda-cidadao@test.local', role: 'usuario', name: 'Cidadão Agenda' })
    secondCitizen = await createVerifiedUser({ email: 'agenda-cidadao-2@test.local', role: 'usuario', name: 'Segundo Cidadão' })
    adminToken = bearerToken(admin)
    citizenToken = bearerToken(citizen)
    secondToken = bearerToken(secondCitizen)

    const futureDate = zonedDateKey(new Date(Date.now() + 48 * 60 * 60 * 1000), 'America/Sao_Paulo')
    startsAt = zonedDateTimeToUtc(futureDate, '10:00', 'America/Sao_Paulo')
    const local = zonedParts(startsAt, 'America/Sao_Paulo')

    const unitResponse = await request(app)
      .post('/api/agenda/admin/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Paço Municipal', slug: 'paco-municipal' })
      .expect(201)
    unit = unitResponse.body.unit

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
    const capacityResponse = await request(app)
      .post('/api/agenda/admin/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        unitId: unit._id,
        name: 'Atendimento coletivo de teste',
        durationMinutes: 20,
        slotIntervalMinutes: 20,
        capacity: 2,
        minimumNoticeMinutes: 0,
        bookingWindowDays: 30,
        cancellationNoticeMinutes: 0,
        weeklyAvailability: [{ dayOfWeek: local.dayOfWeek, periods: [{ start: '00:00', end: '23:59' }] }],
      })
      .expect(201)
    capacityService = capacityResponse.body.service
    const bufferedResponse = await request(app)
      .post('/api/agenda/admin/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        unitId: unit._id,
        name: 'Atendimento com preparação',
        durationMinutes: 20,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 10,
        slotIntervalMinutes: 5,
        minimumNoticeMinutes: 0,
        bookingWindowDays: 30,
        cancellationNoticeMinutes: 0,
        weeklyAvailability: [{ dayOfWeek: local.dayOfWeek, periods: [{ start: '00:00', end: '23:59' }] }],
      })
      .expect(201)
    bufferedService = bufferedResponse.body.service
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
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ serviceId: service._id, startsAt: new Date(startsAt.getTime() + 60 * 60000).toISOString() })
      .expect(422)

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
    secondAppointment = rebooked.body.appointment
  })

  test('bloqueia qualquer sobreposição, não apenas o mesmo horário inicial', async () => {
    await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ serviceId: service._id, startsAt: new Date(startsAt.getTime() + 5 * 60000).toISOString() })
      .expect(409)
  })

  test('preenche faixas de capacidade sem ultrapassar o limite do serviço', async () => {
    const capacityStart = new Date(startsAt.getTime() + 240 * 60000)
    const book = (token, key) => request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ serviceId: capacityService._id, startsAt: capacityStart.toISOString() })

    const first = await book(citizenToken, 'capacity-booking-test-01').expect(201)
    const second = await book(secondToken, 'capacity-booking-test-02').expect(201)
    expect(first.body.appointment.capacityLane).not.toBe(second.body.appointment.capacityLane)
    await book(adminToken, 'capacity-booking-test-03').expect(409)

    const availability = await request(app)
      .get(`/api/agenda/services/${capacityService._id}/availability`)
      .query({ date: zonedDateKey(capacityStart, 'America/Sao_Paulo') })
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200)
    expect(availability.body.slots.find((slot) => slot.startsAt === capacityStart.toISOString()))
      .toMatchObject({ available: false, remainingCapacity: 0 })
  })

  test('protege os buffers anterior e posterior contra sobreposição', async () => {
    const bufferStart = new Date(startsAt.getTime() + 360 * 60000)
    await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ serviceId: bufferedService._id, startsAt: bufferStart.toISOString() })
      .expect(201)
    await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ serviceId: bufferedService._id, startsAt: new Date(bufferStart.getTime() + 25 * 60000).toISOString() })
      .expect(409)
    await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ serviceId: bufferedService._id, startsAt: new Date(bufferStart.getTime() + 35 * 60000).toISOString() })
      .expect(201)
  })

  test('repete criação com segurança usando a mesma chave de idempotência', async () => {
    const payload = {
      serviceId: service._id,
      startsAt: new Date(startsAt.getTime() + 30 * 60000).toISOString(),
      source: 'web',
    }
    const first = await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .set('Idempotency-Key', 'agenda-create-test-001')
      .send(payload)
      .expect(201)
    const replay = await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .set('Idempotency-Key', 'agenda-create-test-001')
      .send(payload)
      .expect(200)

    expect(replay.headers['idempotent-replayed']).toBe('true')
    expect(replay.body.appointment._id).toBe(first.body.appointment._id)
    expect(replay.body.appointment.reservationKeys).toBeUndefined()
    idempotentAppointment = first.body.appointment

    await request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${citizenToken}`)
      .set('Idempotency-Key', 'agenda-create-test-001')
      .send({ ...payload, startsAt: new Date(startsAt.getTime() + 60 * 60000).toISOString() })
      .expect(409)
  })

  test('reagenda atomicamente, preserva o slot anterior na falha e aceita replay', async () => {
    const occupiedTarget = new Date(startsAt.getTime() + 30 * 60000).toISOString()
    await request(app)
      .patch(`/api/agenda/appointments/${secondAppointment._id}/reschedule`)
      .set('Authorization', `Bearer ${secondToken}`)
      .set('Idempotency-Key', 'agenda-move-test-failed')
      .send({ serviceId: service._id, startsAt: occupiedTarget })
      .expect(409)

    const afterConflict = await request(app)
      .get('/api/agenda/appointments/mine')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(200)
    expect(afterConflict.body.items.find((item) => item._id === secondAppointment._id).startsAt).toBe(startsAt.toISOString())

    const payload = { serviceId: service._id, startsAt: new Date(startsAt.getTime() + 60 * 60000).toISOString() }
    const moved = await request(app)
      .patch(`/api/agenda/appointments/${secondAppointment._id}/reschedule`)
      .set('Authorization', `Bearer ${secondToken}`)
      .set('Idempotency-Key', 'agenda-move-test-success')
      .send(payload)
      .expect(200)
    const replay = await request(app)
      .patch(`/api/agenda/appointments/${secondAppointment._id}/reschedule`)
      .set('Authorization', `Bearer ${secondToken}`)
      .set('Idempotency-Key', 'agenda-move-test-success')
      .send(payload)
      .expect(200)

    expect(moved.body.appointment.startsAt).toBe(payload.startsAt)
    expect(replay.headers['idempotent-replayed']).toBe('true')
    expect(replay.body.appointment._id).toBe(secondAppointment._id)

    await request(app)
      .patch(`/api/agenda/appointments/${secondAppointment._id}/reschedule`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .set('Idempotency-Key', 'agenda-move-wrong-owner')
      .send(payload)
      .expect(404)
  })

  test('cancelamento é idempotente e não expõe chaves internas', async () => {
    const endpoint = `/api/agenda/appointments/${idempotentAppointment._id}/cancel`
    const first = await request(app)
      .patch(endpoint)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ reason: 'Cancelamento idempotente' })
      .expect(200)
    const replay = await request(app)
      .patch(endpoint)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ reason: 'Repetição segura' })
      .expect(200)
    expect(first.body.appointment.status).toBe('cancelled')
    expect(replay.body.appointment.status).toBe('cancelled')
    expect(replay.body.appointment.reservationKey).toBeUndefined()
    expect(replay.body.appointment.reservationKeys).toBeUndefined()
  })

  test('gestor administra somente a unidade concedida', async () => {
    const grant = await request(app)
      .post('/api/agenda/admin/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: citizen._id, unitId: unit._id, role: 'agenda_manager' })
      .expect(201)

    const units = await request(app)
      .get('/api/agenda/admin/units')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200)
    expect(units.body.items.map((item) => item._id)).toEqual([unit._id])

    const services = await request(app)
      .get('/api/agenda/admin/services')
      .set('Authorization', `Bearer ${citizenToken}`)
      .query({ unitId: unit._id })
      .expect(200)
    expect(services.body.items.some((item) => item._id === service._id)).toBe(true)

    const updated = await request(app)
      .patch(`/api/agenda/admin/services/${service._id}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ description: 'Atualizado pelo gestor da unidade' })
      .expect(200)
    expect(updated.body.service.description).toBe('Atualizado pelo gestor da unidade')

    const createdResource = await request(app)
      .post('/api/agenda/admin/resources')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ unitId: unit._id, name: 'Sala de atendimento 1', type: 'room' })
      .expect(201)
    roomResource = createdResource.body.resource
    const resources = await request(app)
      .get('/api/agenda/admin/resources')
      .set('Authorization', `Bearer ${citizenToken}`)
      .query({ unitId: unit._id, type: 'room', active: true })
      .expect(200)
    expect(resources.body.items.map((item) => item._id)).toContain(createdResource.body.resource._id)
    const equipment = await request(app)
      .post('/api/agenda/admin/resources')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ unitId: unit._id, name: 'Projetor móvel', type: 'equipment' })
      .expect(201)
    const disabledResource = await request(app)
      .patch(`/api/agenda/admin/resources/${equipment.body.resource._id}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ active: false })
      .expect(200)
    expect(disabledResource.body.resource.active).toBe(false)

    const assignments = await request(app)
      .get('/api/agenda/admin/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect(assignments.body.items.some((item) => item._id === grant.body.assignment._id)).toBe(true)

    await request(app)
      .patch(`/api/agenda/admin/assignments/${grant.body.assignment._id}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    await request(app)
      .get('/api/agenda/admin/units')
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(403)
  })

  test('vincula recurso ativo ao serviço e impede uso acima da capacidade', async () => {
    await request(app)
      .patch(`/api/agenda/admin/services/${capacityService._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resourceRequired: true, resourceIds: [roomResource._id] })
      .expect(200)

    const resourceStart = new Date(startsAt.getTime() + 300 * 60000)
    const book = (token, key) => request(app)
      .post('/api/agenda/appointments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ serviceId: capacityService._id, startsAt: resourceStart.toISOString() })
    const first = await book(citizenToken, 'resource-booking-test-01').expect(201)
    const second = await book(secondToken, 'resource-booking-test-02').expect(201)
    expect(first.body.appointment.resourceId).toBe(roomResource._id)
    expect(second.body.appointment.resourceId).toBe(roomResource._id)
    await book(adminToken, 'resource-booking-test-03').expect(409)
  })

  test('atendente consulta a agenda e executa somente transições formais', async () => {
    await request(app)
      .post('/api/agenda/admin/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: secondCitizen._id, unitId: unit._id, role: 'agenda_attendant' })
      .expect(201)

    const manualPayload = {
      userId: citizen._id,
      serviceId: service._id,
      startsAt: new Date(startsAt.getTime() + 120 * 60000).toISOString(),
      notes: 'Criado presencialmente pelo atendente',
    }
    const manual = await request(app)
      .post('/api/agenda/admin/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .set('Idempotency-Key', 'agenda-manual-test-001')
      .send(manualPayload)
      .expect(201)
    expect(manual.body.appointment).toMatchObject({ userId: citizen._id.toString(), source: 'admin' })
    const manualReplay = await request(app)
      .post('/api/agenda/admin/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .set('Idempotency-Key', 'agenda-manual-test-001')
      .send(manualPayload)
      .expect(200)
    expect(manualReplay.body.appointment._id).toBe(manual.body.appointment._id)

    const calendar = await request(app)
      .get('/api/agenda/admin/appointments')
      .set('Authorization', `Bearer ${secondToken}`)
      .query({ unitId: unit._id, status: 'booked,confirmed', page: 1, limit: 20 })
      .expect(200)
    expect(calendar.body.pagination.total).toBeGreaterThan(0)
    expect(calendar.body.items.some((item) => item._id === secondAppointment._id)).toBe(true)

    await request(app)
      .patch(`/api/agenda/admin/appointments/${secondAppointment._id}/status`)
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ status: 'confirmed' })
      .expect(200)
    const completed = await request(app)
      .patch(`/api/agenda/admin/appointments/${secondAppointment._id}/status`)
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ status: 'completed' })
      .expect(200)
    expect(completed.body.appointment.statusHistory.map((event) => event.status)).toEqual(['confirmed', 'completed'])

    await request(app)
      .patch(`/api/agenda/admin/appointments/${secondAppointment._id}/status`)
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ status: 'confirmed' })
      .expect(409)

    const report = await request(app)
      .get('/api/agenda/admin/reports/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    expect(report.body.byStatus.completed).toBeGreaterThanOrEqual(1)
  })
})
