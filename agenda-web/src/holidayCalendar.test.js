import { describe, expect, it } from 'vitest'
import { blockedDatesForUnit, fullDayRange, monthDays } from './holidayCalendar'

describe('dias sem expediente', () => {
  it('monta todos os dias do mês', () => {
    const days = monthDays('2026-10')
    expect(days.filter((item) => !item.placeholder)).toHaveLength(31)
    expect(days.find((item) => item.day === 12)?.date).toBe('2026-10-12')
  })
  it('cria intervalo de um dia completo', () => {
    const range = fullDayRange('2026-10-12')
    expect(new Date(range.endsAt).getTime() - new Date(range.startsAt).getTime()).toBe(86400000)
  })
  it('destaca somente bloqueios ativos da unidade', () => {
    const dates = blockedDatesForUnit([
      { active: true, scope: 'unit', unitId: { _id: 'u1' }, startsAt: '2026-10-12T03:00:00.000Z' },
      { active: false, scope: 'unit', unitId: 'u1', startsAt: '2026-10-28T03:00:00.000Z' },
      { active: true, scope: 'unit', unitId: 'u2', startsAt: '2026-10-20T03:00:00.000Z' },
    ], 'u1', '2026-10')
    expect([...dates]).toEqual(['2026-10-12'])
  })
})
