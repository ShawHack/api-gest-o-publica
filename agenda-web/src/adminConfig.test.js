import { describe, expect, it } from 'vitest'
import { buildWeeklyAvailability, findByName, lunchFromAvailability, normalizeName, slugify, validateDaySchedule } from './adminConfig'

describe('configuração administrativa', () => {
  it('reconhece nomes existentes sem duplicar por caixa ou espaços', () => {
    const unit = { _id: '1', name: 'Paço Municipal' }
    expect(findByName([unit], '  PAÇO   municipal ')).toBe(unit)
    expect(normalizeName('  Saúde  ')).toBe('saúde')
  })

  it('cria identificadores seguros a partir do nome', () => {
    expect(slugify('Secretaria de Educação')).toBe('secretaria-de-educacao')
  })

  it('monta o horário semanal em ordem', () => {
    expect(buildWeeklyAvailability([5, 1, 3], '08:00', '17:00')).toEqual([
      { dayOfWeek: 1, periods: [{ start: '08:00', end: '17:00' }] },
      { dayOfWeek: 3, periods: [{ start: '08:00', end: '17:00' }] },
      { dayOfWeek: 5, periods: [{ start: '08:00', end: '17:00' }] },
    ])
  })

  it('parte o expediente no intervalo de almoço', () => {
    expect(buildWeeklyAvailability([1], '08:00', '17:00', { start: '12:00', end: '13:00' })).toEqual([
      { dayOfWeek: 1, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
    ])
    expect(lunchFromAvailability([{ dayOfWeek: 1, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] }])).toEqual({
      enabled: true, start: '12:00', end: '13:00',
    })
    expect(validateDaySchedule('08:00', '17:00', { enabled: true, start: '12:00', end: '13:00' })).toBeNull()
    expect(validateDaySchedule('08:00', '17:00', { enabled: true, start: '07:00', end: '13:00' })).toMatch(/almoço/)
  })
})
