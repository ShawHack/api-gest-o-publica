const {
  CALENDAR_RECURRENCE_FREQUENCIES,
  CALENDAR_EVENT_STATUSES,
  CALENDAR_EVENT_TYPE_COLORS,
} = require('./education-constants')

const DEFAULT_EVENT_COLOR = '#2563eb'

function getColorForType(type) {
  return CALENDAR_EVENT_TYPE_COLORS[type] || DEFAULT_EVENT_COLOR
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function parseTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${pad2(hours)}:${pad2(minutes)}`
}

function parseDateOnly(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function combineDateAndTime(dateOnly, time) {
  const date = parseDateOnly(dateOnly)
  if (!date) return null
  const parsedTime = parseTime(time || '00:00') || '00:00'
  const dt = new Date(`${date}T${parsedTime}:00`)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function splitDateTime(value) {
  if (!value) return { dateOnly: '', time: '' }
  const dt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dt.getTime())) return { dateOnly: '', time: '' }
  return {
    dateOnly: `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`,
    time: `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`,
  }
}

function parseDateSlots(raw) {
  if (!raw) return []
  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((slot) => ({
      dateOnly: parseDateOnly(slot.dateOnly) || '',
      times: (Array.isArray(slot.times) ? slot.times : [{
        startTime: slot.startTime,
        endTime: slot.endTime,
      }])
        .map((time) => ({
          startTime: parseTime(time.startTime) || '',
          endTime: parseTime(time.endTime) || '',
        }))
        .filter((time) => time.startTime && time.endTime),
    }))
    .filter((slot) => slot.dateOnly && slot.times.length)
}

function flattenDateSlots(dateSlots = []) {
  const flat = []
  for (const slot of dateSlots) {
    for (const time of slot.times || []) {
      flat.push({
        dateOnly: slot.dateOnly,
        startTime: time.startTime,
        endTime: time.endTime,
        startAt: combineDateAndTime(slot.dateOnly, time.startTime),
        endAt: combineDateAndTime(slot.dateOnly, time.endTime),
      })
    }
  }
  return flat.sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
}

function syncPrimaryDatesFromSlots(event) {
  const flat = flattenDateSlots(event.dateSlots || [])
  if (!flat.length) return event
  const first = flat[0]
  const last = flat[flat.length - 1]
  event.startDateOnly = first.dateOnly
  event.startTime = first.startTime
  event.endDateOnly = last.dateOnly
  event.endTime = last.endTime
  event.startDate = first.startAt
  event.endDate = last.endAt
  return event
}

function resolveDateSlots(raw = {}) {
  if (raw.dateSlots?.length) {
    return raw.dateSlots.map((slot) => ({
      dateOnly: slot.dateOnly || '',
      times: (slot.times || []).map((t) => ({
        startTime: t.startTime || '',
        endTime: t.endTime || '',
      })),
    }))
  }
  if (raw.startDateOnly) {
    return [{
      dateOnly: raw.startDateOnly,
      times: [{
        startTime: raw.startTime || '00:00',
        endTime: raw.endTime || '23:59',
      }],
    }]
  }
  const start = splitDateTime(raw.startDate)
  const end = splitDateTime(raw.endDate || raw.startDate)
  if (!start.dateOnly) return []
  return [{
    dateOnly: start.dateOnly,
    times: [{ startTime: start.time || '00:00', endTime: end.time || start.time || '23:59' }],
  }]
}

function parseScheduleSlots(raw) {
  if (!raw) return []
  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((slot) => ({
      startTime: parseTime(slot.startTime) || '',
      endTime: parseTime(slot.endTime) || '',
      label: String(slot.label || '').trim(),
    }))
    .filter((slot) => slot.startTime && slot.endTime)
}

function parseRecurrence(body = {}) {
  let recurrence = body.recurrence
  if (typeof recurrence === 'string') {
    try {
      recurrence = JSON.parse(recurrence)
    } catch {
      recurrence = {}
    }
  }
  recurrence = recurrence && typeof recurrence === 'object' ? recurrence : {}

  const enabled = recurrence.enabled === true || recurrence.enabled === 'true' || body.recurrenceEnabled === 'true'
  const frequency = CALENDAR_RECURRENCE_FREQUENCIES.includes(recurrence.frequency)
    ? recurrence.frequency
    : (CALENDAR_RECURRENCE_FREQUENCIES.includes(body.recurrenceFrequency) ? body.recurrenceFrequency : null)

  return {
    enabled: enabled && !!frequency,
    frequency: enabled && frequency ? frequency : null,
    interval: Math.max(1, parseInt(recurrence.interval || body.recurrenceInterval || 1, 10) || 1),
    endDate: recurrence.endDate || body.recurrenceEndDate
      ? combineDateAndTime(parseDateOnly(recurrence.endDate || body.recurrenceEndDate), '23:59')
      : null,
    weekdays: Array.isArray(recurrence.weekdays)
      ? recurrence.weekdays.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
      : [],
  }
}

function applyCalendarEventFields(event, body = {}) {
  if (body.title !== undefined) event.title = String(body.title).trim()
  if (body.description !== undefined) event.description = String(body.description || '')
  if (body.type !== undefined) {
    event.type = body.type
    event.color = getColorForType(body.type)
  }

  if (body.dateSlots !== undefined) {
    event.dateSlots = parseDateSlots(body.dateSlots)
    syncPrimaryDatesFromSlots(event)
  } else {
    const startDateOnly = body.startDateOnly !== undefined
      ? parseDateOnly(body.startDateOnly)
      : (body.startDate ? splitDateTime(body.startDate).dateOnly : event.startDateOnly)
    const endDateOnly = body.endDateOnly !== undefined
      ? parseDateOnly(body.endDateOnly)
      : (body.endDate ? splitDateTime(body.endDate).dateOnly : event.endDateOnly)
    const startTime = body.startTime !== undefined
      ? (parseTime(body.startTime) || '00:00')
      : (event.startTime || splitDateTime(event.startDate).time || '00:00')
    const endTime = body.endTime !== undefined
      ? (parseTime(body.endTime) || '23:59')
      : (event.endTime || splitDateTime(event.endDate).time || startTime)

    if (startDateOnly) {
      event.startDateOnly = startDateOnly
      event.startTime = startTime
      event.startDate = combineDateAndTime(startDateOnly, startTime)
      event.dateSlots = [{
        dateOnly: startDateOnly,
        times: [{ startTime, endTime: endTime || startTime }],
      }]
    }
    if (endDateOnly || startDateOnly) {
      event.endDateOnly = endDateOnly || startDateOnly
      event.endTime = endTime
      event.endDate = combineDateAndTime(event.endDateOnly, endTime)
    }
  }

  if (!event.color && event.type) {
    event.color = getColorForType(event.type)
  }

  if (body.scheduleSlots !== undefined) {
    event.scheduleSlots = parseScheduleSlots(body.scheduleSlots)
  }
  if (body.recurrence !== undefined || body.recurrenceEnabled !== undefined) {
    event.recurrence = parseRecurrence(body)
  }

  if (body.location !== undefined) event.location = String(body.location || '').trim()
  if (body.responsible !== undefined) event.responsible = String(body.responsible || '').trim()
  if (body.notifyBeforeDays !== undefined) {
    const days = parseInt(body.notifyBeforeDays, 10)
    if (Number.isFinite(days) && days >= 0) event.notifyBeforeDays = days
  }

  if (body.status && CALENDAR_EVENT_STATUSES.includes(body.status)) {
    event.status = body.status
    if (body.status === 'cancelled') event.cancelledAt = new Date()
    if (body.status === 'completed') event.completedAt = new Date()
    if (body.status === 'active' || body.status === 'in_progress') {
      event.cancelledAt = null
      event.completedAt = null
    }
    if (body.status === 'inactive') {
      event.cancelledAt = null
    }
  }

  return event
}

function serializeCalendarEvent(event) {
  const raw = event?.toObject ? event.toObject() : { ...event }
  const dateSlots = resolveDateSlots(raw)
  const flat = flattenDateSlots(dateSlots)
  const startParts = flat[0]
    ? { dateOnly: flat[0].dateOnly, time: flat[0].startTime }
    : (raw.startDateOnly
      ? { dateOnly: raw.startDateOnly, time: raw.startTime || '00:00' }
      : splitDateTime(raw.startDate))
  const endParts = flat[flat.length - 1]
    ? { dateOnly: flat[flat.length - 1].dateOnly, time: flat[flat.length - 1].endTime }
    : (raw.endDateOnly
      ? { dateOnly: raw.endDateOnly, time: raw.endTime || raw.startTime || '00:00' }
      : splitDateTime(raw.endDate || raw.startDate))

  return {
    ...raw,
    startDateOnly: startParts.dateOnly,
    startTime: startParts.time,
    endDateOnly: endParts.dateOnly,
    endTime: endParts.time,
    dateSlots,
    color: raw.color || getColorForType(raw.type),
    status: raw.status || 'active',
    recurrence: raw.recurrence || { enabled: false, frequency: null, interval: 1, endDate: null, weekdays: [] },
    scheduleSlots: raw.scheduleSlots || [],
    attachments: raw.attachments || [],
    notifyBeforeDays: raw.notifyBeforeDays ?? 1,
    isMultiDay: startParts.dateOnly !== endParts.dateOnly || dateSlots.length > 1,
  }
}

function addRecurrenceInterval(date, frequency, interval = 1) {
  const next = new Date(date)
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      break
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval))
      break
    case 'biweekly':
      next.setDate(next.getDate() + (14 * interval))
      break
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      break
    default:
      return null
  }
  return next
}

function eventOverlapsRange(event, from, to) {
  const start = new Date(event.startDate)
  const end = new Date(event.endDate || event.startDate)
  return start <= to && end >= from
}

function expandRecurringEvent(event, from, to) {
  const base = serializeCalendarEvent(event)
  if (!base.recurrence?.enabled || !base.recurrence?.frequency) {
    return [base]
  }

  const occurrences = []
  const recurrenceEnd = base.recurrence.endDate ? new Date(base.recurrence.endDate) : to
  let currentStart = new Date(base.startDate)
  let currentEnd = new Date(base.endDate || base.startDate)
  const durationMs = currentEnd.getTime() - currentStart.getTime()
  let guard = 0

  while (currentStart <= recurrenceEnd && currentStart <= to && guard < 500) {
    guard += 1
    const instanceEnd = new Date(currentStart.getTime() + durationMs)
    if (instanceEnd >= from && currentStart <= to) {
      occurrences.push({
        ...base,
        _id: `${base._id}__${currentStart.toISOString().slice(0, 10)}`,
        masterEventId: base._id,
        isRecurrenceInstance: true,
        occurrenceDate: new Date(currentStart),
        startDate: new Date(currentStart),
        endDate: instanceEnd,
        startDateOnly: splitDateTime(currentStart).dateOnly,
        endDateOnly: splitDateTime(instanceEnd).dateOnly,
      })
    }
    const next = addRecurrenceInterval(currentStart, base.recurrence.frequency, base.recurrence.interval || 1)
    if (!next) break
    currentStart = next
    currentEnd = new Date(currentStart.getTime() + durationMs)
  }

  return occurrences
}

function expandEventsForRange(events, from, to) {
  const expanded = []
  for (const event of events) {
    if (event.recurrence?.enabled) {
      expanded.push(...expandRecurringEvent(event, from, to))
    } else if (eventOverlapsRange(event, from, to)) {
      expanded.push(serializeCalendarEvent(event))
    }
  }
  return expanded.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
}

function validateCalendarEventPayload(body, { isUpdate = false } = {}) {
  const errors = []
  if (!isUpdate && !body.title?.trim()) errors.push('Título do evento é obrigatório')
  if (!isUpdate && !body.type) errors.push('Tipo de evento é obrigatório')

  const dateSlots = parseDateSlots(body.dateSlots)
  if (!isUpdate && dateSlots.length === 0) {
    const startDateOnly = parseDateOnly(body.startDateOnly || body.startDate)
    const endDateOnly = parseDateOnly(body.endDateOnly || body.endDate || body.startDateOnly || body.startDate)
    if (!startDateOnly) errors.push('Informe ao menos uma data válida')
    if (!endDateOnly) errors.push('Data de término é obrigatória')
    if (!parseTime(body.startTime || '00:00')) errors.push('Hora de início inválida')
    if (!parseTime(body.endTime || body.startTime || '00:00')) errors.push('Hora de término inválida')
    if (startDateOnly && endDateOnly) {
      const start = combineDateAndTime(startDateOnly, body.startTime || '00:00')
      const end = combineDateAndTime(endDateOnly, body.endTime || body.startTime || '23:59')
      if (start && end && end < start) errors.push('Data/hora de término deve ser posterior ao início')
    }
  }

  if (!isUpdate && dateSlots.length > 0) {
    for (const slot of dateSlots) {
      for (const time of slot.times) {
        const start = combineDateAndTime(slot.dateOnly, time.startTime)
        const end = combineDateAndTime(slot.dateOnly, time.endTime)
        if (start && end && end < start) {
          errors.push(`Horário inválido em ${slot.dateOnly}`)
        }
      }
    }
  }

  return errors
}

module.exports = {
  DEFAULT_EVENT_COLOR,
  getColorForType,
  parseTime,
  parseDateOnly,
  combineDateAndTime,
  splitDateTime,
  parseDateSlots,
  parseScheduleSlots,
  parseRecurrence,
  applyCalendarEventFields,
  serializeCalendarEvent,
  syncPrimaryDatesFromSlots,
  resolveDateSlots,
  flattenDateSlots,
  expandRecurringEvent,
  expandEventsForRange,
  validateCalendarEventPayload,
}
