import { EVENT_LABELS, formatDate, formatDateTime } from './educationUtils'

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const CALENDAR_FILTER_GROUPS = [
  { id: '', label: 'Todas as categorias' },
  { id: 'reunioes', label: 'Reuniões', types: ['reuniao', 'reuniao_conselho'] },
  {
    id: 'eventos',
    label: 'Eventos',
    types: ['evento_escolar', 'evento_esportivo', 'evento_cultural', 'data_comemorativa', 'comunicado_geral'],
  },
  { id: 'feriados', label: 'Feriados', types: ['feriado'] },
  { id: 'capacitacoes', label: 'Capacitações', types: ['formacao'] },
  { id: 'conselhos', label: 'Conselhos', types: ['conselho_classe', 'reuniao_conselho'] },
  { id: 'outros', label: 'Outros', types: ['calendario_letivo'] },
]

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toDateOnly(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayDateOnly() {
  return toDateOnly(new Date())
}

export function parseDateOnly(dateOnly) {
  if (!dateOnly) return null
  const [y, m, d] = dateOnly.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function combineDateTime(dateOnly, time = '00:00') {
  const base = parseDateOnly(dateOnly)
  if (!base) return null
  const [h, min] = String(time || '00:00').split(':').map(Number)
  base.setHours(h || 0, min || 0, 0, 0)
  return base
}

export function formatDateBr(dateOnly) {
  const d = parseDateOnly(dateOnly)
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatTimeRange(startTime, endTime) {
  if (!startTime) return '—'
  if (!endTime || endTime === startTime) return startTime
  return `${startTime} às ${endTime}`
}

export function excerpt(text, max = 140) {
  const value = String(text || '').trim()
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max).trim()}…`
}

export function expandEventOccurrences(event) {
  if (!event) return []
  const slots = event.dateSlots?.length
    ? event.dateSlots
    : event.startDateOnly
      ? [{
        dateOnly: event.startDateOnly,
        times: [{
          startTime: event.startTime || '00:00',
          endTime: event.endTime || event.startTime || '23:59',
        }],
      }]
      : []

  const occurrences = []
  for (const slot of slots) {
    if (!slot.dateOnly) continue
    for (const time of slot.times || []) {
      const startAt = combineDateTime(slot.dateOnly, time.startTime)
      occurrences.push({
        event,
        dateOnly: slot.dateOnly,
        startTime: time.startTime || '00:00',
        endTime: time.endTime || time.startTime || '23:59',
        startAt,
        sortKey: startAt ? startAt.getTime() : 0,
      })
    }
  }

  if (!occurrences.length && event.startDate) {
    const dateOnly = toDateOnly(event.startDate)
    const startAt = new Date(event.startDate)
    occurrences.push({
      event,
      dateOnly,
      startTime: `${pad2(startAt.getHours())}:${pad2(startAt.getMinutes())}`,
      endTime: event.endDate
        ? `${pad2(new Date(event.endDate).getHours())}:${pad2(new Date(event.endDate).getMinutes())}`
        : '23:59',
      startAt,
      sortKey: startAt.getTime(),
    })
  }

  return occurrences.sort((a, b) => a.sortKey - b.sortKey)
}

export function buildCalendarMatrix(year, month) {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startPad = first.getDay()
  const cells = []

  for (let i = 0; i < startPad; i += 1) {
    cells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad2(month)}-${pad2(day)}`)
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return cells
}

export function matchesCategory(event, categoryId) {
  if (!categoryId) return true
  const group = CALENDAR_FILTER_GROUPS.find((g) => g.id === categoryId)
  if (!group?.types) return true
  return group.types.includes(event.type)
}

export function matchesSearch(event, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true

  const slotsText = (event.dateSlots || [])
    .map((slot) => {
      const times = (slot.times || []).map((t) => `${t.startTime} ${t.endTime}`).join(' ')
      return `${slot.dateOnly} ${times}`
    })
    .join(' ')

  const haystack = [
    event.title,
    event.description,
    event.location,
    event.responsible,
    event.educationEntityId?.name,
    EVENT_LABELS[event.type] || event.type,
    formatDate(event.startDate),
    formatDateTime(event.startDate),
    event.startDateOnly,
    slotsText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(q)
}

export function filterEvents(events, { search = '', categoryId = '', futureOnly = false } = {}) {
  const today = parseDateOnly(todayDateOnly())
  today.setHours(0, 0, 0, 0)

  return (events || []).filter((event) => {
    if (!matchesCategory(event, categoryId)) return false
    if (!matchesSearch(event, search)) return false
    if (!futureOnly) return true

    const occurrences = expandEventOccurrences(event)
    return occurrences.some((occ) => {
      const d = parseDateOnly(occ.dateOnly)
      if (!d) return false
      d.setHours(0, 0, 0, 0)
      return d >= today
    })
  })
}

export function groupOccurrencesByDate(events, filters = {}) {
  const filtered = filterEvents(events, filters)
  const map = new Map()

  for (const event of filtered) {
    for (const occ of expandEventOccurrences(event)) {
      if (filters.futureOnly) {
        const d = parseDateOnly(occ.dateOnly)
        const today = parseDateOnly(todayDateOnly())
        if (d && today && d < today) continue
      }
      if (!map.has(occ.dateOnly)) map.set(occ.dateOnly, [])
      map.get(occ.dateOnly).push(occ)
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.sortKey - b.sortKey)
  }

  return map
}

export function getUpcomingOccurrences(events, limit = 8, filters = {}) {
  const today = parseDateOnly(todayDateOnly())
  today.setHours(0, 0, 0, 0)
  const now = new Date()

  const all = []
  for (const event of filterEvents(events, filters)) {
    for (const occ of expandEventOccurrences(event)) {
      const day = parseDateOnly(occ.dateOnly)
      if (!day) continue
      const start = occ.startAt || combineDateTime(occ.dateOnly, occ.startTime)
      if (!start || start < now) {
        if (day < today) continue
      }
      if (day < today) continue
      all.push(occ)
    }
  }

  return all
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, limit)
}
