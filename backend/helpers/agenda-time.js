const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function zonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    dayOfWeek: WEEKDAYS[values.weekday],
    minutes: Number(values.hour) * 60 + Number(values.minute),
  }
}

function zonedDateKey(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function zonedDateTimeToUtc(dateKey, time, timezone) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return new Date(NaN)
  const desired = Date.UTC(year, month - 1, day, hour, minute)
  let candidate = desired
  for (let index = 0; index < 3; index += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(candidate))
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const observed = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute),
    )
    candidate += desired - observed
  }
  return new Date(candidate)
}

function timeToMinutes(value) {
  const [hour, minute] = String(value).split(':').map(Number)
  return hour * 60 + minute
}

function validateBookableStart(service, unit, startsAt, now = new Date(), periodsOverride) {
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) return 'Data ou horário inválido.'
  const minimum = now.getTime() + service.minimumNoticeMinutes * 60000
  const maximum = now.getTime() + service.bookingWindowDays * 86400000
  if (startsAt.getTime() < minimum) return 'O horário não respeita a antecedência mínima.'
  if (startsAt.getTime() > maximum) return 'O horário está fora da janela de agendamento.'

  const timezone = unit.timezone || 'America/Sao_Paulo'
  const local = zonedParts(startsAt, timezone)
  if (local.minutes % service.slotIntervalMinutes !== 0) return 'O horário não coincide com o intervalo do serviço.'
  const endMinutes = local.minutes + service.durationMinutes
  const schedule = (service.weeklyAvailability || []).find((entry) => entry.dayOfWeek === local.dayOfWeek)
  const periods = periodsOverride === undefined ? schedule?.periods : periodsOverride
  const withinPeriod = periods?.some((period) => {
    const start = timeToMinutes(period.start)
    const end = timeToMinutes(period.end)
    return local.minutes >= start && endMinutes <= end
  })
  return withinPeriod ? null : 'O serviço não está disponível nesse horário.'
}

module.exports = { zonedParts, zonedDateKey, zonedDateTimeToUtc, timeToMinutes, validateBookableStart }
