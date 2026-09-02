import { useEffect, useMemo, useState } from 'react'
import { api } from './api'

const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayKey() {
  const now = new Date()
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate())
}

function monthCells(year, month) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const last = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday }, () => null)
  for (let day = 1; day <= last; day += 1) cells.push(day)
  while (cells.length % 7) cells.push(null)
  return cells
}

function addMinutes(time, minutes) {
  const [hour, minute] = String(time || '00:00').split(':').map(Number)
  const total = hour * 60 + minute + Number(minutes || 0)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function groupByHour(slots) {
  const groups = []
  const index = new Map()
  for (const slot of slots) {
    const hour = String(slot.time || '').slice(0, 2) || '00'
    if (!index.has(hour)) {
      const group = { hour, slots: [] }
      index.set(hour, group)
      groups.push(group)
    }
    index.get(hour).slots.push(slot)
  }
  return groups
}

export default function BookingCalendar({ service, availabilityPath, onBook, confirmLabel = 'Confirmar agendamento' }) {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [showTaken, setShowTaken] = useState(false)
  const [error, setError] = useState('')
  const min = [todayKey(), service.bookingFrom].filter(Boolean).sort().at(-1)
  const max = service.bookingUntil || ''
  const duration = service.durationMinutes || 15
  const openWeekdays = useMemo(
    () => new Set((service.weeklyAvailability || []).filter((entry) => entry.periods?.length).map((entry) => entry.dayOfWeek)),
    [service],
  )
  const visible = useMemo(
    () => (showTaken ? slots : slots.filter((slot) => slot.available)),
    [slots, showTaken],
  )
  const groups = useMemo(() => groupByHour(visible), [visible])

  const cells = monthCells(cursor.year, cursor.month)
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  async function loadDay(key) {
    setDate(key)
    setSelected(null)
    setBusy(true)
    setError('')
    try {
      const path = typeof availabilityPath === 'function'
        ? availabilityPath(key)
        : `/api/agenda/services/${service._id}/availability?date=${key}`
      const data = await api(path)
      setSlots(data.slots || [])
    } catch (err) {
      setSlots([])
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const firstOpen = cells.find((day) => {
      if (!day) return false
      const key = dateKey(cursor.year, cursor.month, day)
      const weekday = new Date(cursor.year, cursor.month, day).getDay()
      return key >= min && (!max || key <= max) && openWeekdays.has(weekday)
    })
    if (firstOpen) loadDay(dateKey(cursor.year, cursor.month, firstOpen))
    else {
      setDate('')
      setSlots([])
      setSelected(null)
    }
  }, [service._id, cursor.year, cursor.month])

  async function confirm() {
    if (!selected?.available || !onBook) return
    setConfirming(true)
    try {
      await onBook(selected.startsAt)
      setSelected(null)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="booking">
      <div className="calendar">
        <div className="cal-head">
          <button type="button" className="dark" onClick={() => setCursor((item) => item.month === 0 ? { year: item.year - 1, month: 11 } : { year: item.year, month: item.month - 1 })} aria-label="Mês anterior">‹</button>
          <strong>{title}</strong>
          <button type="button" className="dark" onClick={() => setCursor((item) => item.month === 11 ? { year: item.year + 1, month: 0 } : { year: item.year, month: item.month + 1 })} aria-label="Próximo mês">›</button>
        </div>
        <div className="cal-week">{weekLabels.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="cal-grid">
          {cells.map((day, index) => {
            if (!day) return <span key={`e-${index}`} className="cal-empty" />
            const key = dateKey(cursor.year, cursor.month, day)
            const weekday = new Date(cursor.year, cursor.month, day).getDay()
            const past = key < min || (max && key > max)
            const closed = !openWeekdays.has(weekday)
            const disabled = past || closed
            return (
              <button
                key={key}
                type="button"
                className={`cal-day${key === date ? ' selected' : ''}${closed ? ' closed' : ''}`}
                disabled={disabled}
                onClick={() => loadDay(key)}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="cal-legend"><span className="dot open" /> dia com expediente <span className="dot closed" /> fechado / passado</p>
      </div>
      <div className="slot-pane">
        <h3>{date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Escolha um dia'}</h3>
        <p className="muted">Atendimento de {duration} minutos. Selecione o horário e confirme.</p>
        <label className="toggle-row">
          <input type="checkbox" checked={showTaken} onChange={(e) => setShowTaken(e.target.checked)} />
          Mostrar horários ocupados
        </label>
        {busy && <p className="muted">Carregando horários…</p>}
        {error && <p className="error">{error}</p>}
        {!busy && date && !visible.length && <p className="empty-hint">Nenhum horário livre neste dia.</p>}
        <div className="day-hours">
          {groups.map((group) => (
            <section key={group.hour} className="hour-block">
              <h4>{group.hour}h</h4>
              <div className="hour-slots">
                {group.slots.map((slot) => {
                  const until = addMinutes(slot.time, duration)
                  const active = selected?.startsAt === slot.startsAt
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      disabled={!slot.available}
                      className={`hour-slot${active ? ' selected' : ''}`}
                      onClick={() => slot.available && setSelected(slot)}
                      aria-pressed={active}
                      aria-label={`${slot.time} até ${until}, ${slot.available ? `${slot.remainingCapacity} vaga(s)` : 'indisponível'}`}
                    >
                      <span style={{ fontWeight: active ? 800 : 600 }}>{active ? `✓ ${slot.time} – ${until}` : `${slot.time} – ${until}`}</span>
                      <small style={{ fontWeight: 700 }}>{active ? 'SELECIONADO' : (slot.available ? `${slot.remainingCapacity} vaga(s)` : 'Ocupado')}</small>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Barra de Confirmação Sempre Visível e Clara */}
        {visible.length > 0 && (
          <div className="confirm-bar" style={{ marginTop: '1.2rem', background: selected ? 'linear-gradient(135deg, #0f172a, #1e293b)' : '#f1f5f9', color: selected ? '#fff' : '#475569', border: selected ? '2px solid #22c55e' : '1px solid #cbd5e1' }}>
            {selected ? (
              <>
                <div>
                  <strong style={{ fontSize: '1.05rem', color: '#4ade80' }}>
                    ✓ Horário Selecionado: {selected.time} – {addMinutes(selected.time, duration)}
                  </strong>
                  <p style={{ margin: '.2rem 0 0', color: '#cbd5e1', fontSize: '.85rem' }}>
                    Clique no botão ao lado para confirmar sua reserva.
                  </p>
                </div>
                <button
                  type="button"
                  style={{ background: '#22c55e', color: '#052e16', fontWeight: 800, padding: '.85rem 1.4rem', fontSize: '1rem', boxShadow: '0 4px 14px rgba(34,197,94,.4)', cursor: 'pointer' }}
                  disabled={confirming}
                  onClick={confirm}
                >
                  {confirming ? '⏳ Confirmando…' : `✅ ${confirmLabel}`}
                </button>
              </>
            ) : (
              <>
                <div>
                  <strong style={{ fontSize: '.95rem', color: '#334155' }}>
                    👆 Selecione um horário acima
                  </strong>
                  <p style={{ margin: '.2rem 0 0', color: '#64748b', fontSize: '.85rem' }}>
                    Clique em um dos horários disponíveis para liberar a confirmação.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  style={{ background: '#cbd5e1', color: '#64748b', fontWeight: 700, padding: '.75rem 1.2rem', cursor: 'not-allowed', border: 'none' }}
                >
                  Selecione um horário
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
