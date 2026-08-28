const { analyzeAgendaInventory, fingerprint } = require('../../helpers/agenda-migration-inventory')

describe('inventário de migração da Agenda', () => {
  test('separa bloqueios e mapeia usuário central sem expor e-mail', () => {
    const report = analyzeAgendaInventory({
      services: [{ id: 'service-1' }],
      centralUsers: [{ _id: 'user-1', email: 'cidadao@garca.sp.gov.br' }],
      appointments: [
        { id: 'a1', data: { userId: 'legacy', userEmail: 'CIDADAO@garca.sp.gov.br', serviceId: 'service-1', date: '2026-09-01T12:00:00Z', timeSlot: '09:00-09:20', status: 'pending' } },
        { id: 'b1', data: { userId: 'BLOCKED', serviceId: 'service-1', date: '2026-09-02T12:00:00Z' } },
      ],
    })

    expect(report.summary).toMatchObject({ appointments: 2, reservations: 1, blocks: 1, matchedUsers: 1 })
    expect(report.records[0]).toMatchObject({ centralUserId: 'user-1', issues: [] })
    expect(JSON.stringify(report)).not.toContain('cidadao@garca.sp.gov.br')
    expect(report.records[0].emailFingerprint).toBe(fingerprint('cidadao@garca.sp.gov.br'))
  })

  test('relata usuário ambíguo, serviço ausente e data inválida', () => {
    const report = analyzeAgendaInventory({
      centralUsers: [{ _id: 'u1', email: 'duplicado@teste' }, { _id: 'u2', email: 'duplicado@teste' }],
      appointments: [{ id: 'a2', data: { userEmail: 'duplicado@teste', serviceId: 'inexistente', date: 'inválida' } }],
    })

    expect(report.summary).toMatchObject({ ambiguousUsers: 1, missingServices: 1, invalidDates: 1 })
    expect(report.records[0].issues).toEqual(expect.arrayContaining(['ambiguous_user', 'missing_service', 'invalid_date']))
  })
})
