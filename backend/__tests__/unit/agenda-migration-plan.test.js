const { buildAgendaMigrationPlan, parseTimeSlot } = require('../../helpers/agenda-migration-plan')

describe('plano de migração da Agenda', () => {
  const serviceMap = { legacy: { serviceId: 'new-service', unitId: 'new-unit', durationMinutes: 20 } }

  test('converte reserva elegível de forma determinística', () => {
    const record = {
      firestoreId: 'legacy-1', kind: 'appointment', centralUserId: 'user-1', serviceId: 'legacy',
      startsAt: '2026-09-01T00:00:00.000Z', timeSlot: '08:00-08:20', status: 'pending', issues: [],
    }
    const first = buildAgendaMigrationPlan({ records: [record], serviceMap })
    const second = buildAgendaMigrationPlan({ records: [record], serviceMap })
    expect(first.appointments[0]).toMatchObject({ serviceId: 'new-service', status: 'booked', source: 'migration' })
    expect(first.summary.planChecksum).toBe(second.summary.planChecksum)
  })

  test('não adivinha mudança pendente nem bloqueio específico de serviço', () => {
    const plan = buildAgendaMigrationPlan({
      serviceMap,
      records: [
        { firestoreId: 'a1', kind: 'appointment', centralUserId: 'u1', serviceId: 'legacy', startsAt: '2026-09-01T00:00:00Z', timeSlot: '08:00-08:20', status: 'changeRequested' },
        { firestoreId: 'b1', kind: 'block', serviceId: 'legacy', startsAt: '2026-09-01T00:00:00Z', timeSlot: '09:00-09:20', status: 'blocked' },
      ],
    })
    expect(plan.summary).toMatchObject({ input: 2, rejected: 2, appointments: 0, unitBlocks: 0 })
    expect(plan.rejected[0].reasons).toContain('pending_change_manual_review')
    expect(plan.rejected[1].reasons).toContain('unsupported_service_slot_block')
  })

  test('valida intervalos legados', () => {
    expect(parseTimeSlot('13:00-13:20')).toEqual({ start: '13:00', end: '13:20', durationMinutes: 20 })
    expect(parseTimeSlot('13:20-13:00')).toBeNull()
    expect(parseTimeSlot('inválido')).toBeNull()
  })
})
