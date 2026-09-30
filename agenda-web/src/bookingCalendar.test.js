import { describe, expect, it } from 'vitest'
import { closureLabelsByDate } from './bookingCalendar'

describe('closureLabelsByDate', () => {
  it('usa o motivo definido no bloqueio', () => {
    const labels = closureLabelsByDate([{ date: '2026-10-12', reason: 'Feriado', category: 'holiday', fullDay: true }])
    expect(labels.get('2026-10-12')).toBe('Feriado')
  })

  it('usa a categoria apenas quando o motivo estiver vazio', () => {
    const labels = closureLabelsByDate([{ date: '2026-10-28', reason: '', category: 'maintenance', fullDay: true }])
    expect(labels.get('2026-10-28')).toBe('Manutenção')
  })

  it('não fecha o dia inteiro para bloqueio parcial', () => {
    const labels = closureLabelsByDate([{ date: '2026-10-15', reason: 'Reunião', category: 'pause', fullDay: false }])
    expect(labels.has('2026-10-15')).toBe(false)
  })
})
