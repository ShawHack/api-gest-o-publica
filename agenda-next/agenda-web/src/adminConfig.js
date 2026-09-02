export function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
}

export function findByName(items, value) {
  const wanted = normalizeName(value)
  return items.find((item) => normalizeName(item.name) === wanted)
}

export function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
}

export function buildWeeklyAvailability(days, start, end, lunch) {
  const periods = lunch?.start && lunch?.end
    ? [{ start, end: lunch.start }, { start: lunch.end, end }]
    : [{ start, end }]
  return days.map(Number).sort().map((dayOfWeek) => ({ dayOfWeek, periods }))
}

export function lunchFromAvailability(weeklyAvailability) {
  const periods = weeklyAvailability?.[0]?.periods || []
  if (periods.length >= 2) return { enabled: true, start: periods[0].end, end: periods[1].start }
  return { enabled: false, start: '12:00', end: '13:00' }
}

export function landingUrl(unitSlug, serviceSlug) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/agendamentos/#/p/${unitSlug}/${serviceSlug}`
}

export function parseLandingHash(hash) {
  const match = String(hash || '').replace(/^#/, '').match(/^\/p\/([^/]+)\/([^/?#]+)/)
  if (!match) return null
  return { unitSlug: decodeURIComponent(match[1]), serviceSlug: decodeURIComponent(match[2]) }
}

export function validateDaySchedule(start, end, lunch) {
  if (!start || !end || start >= end) return 'O expediente deve ter início anterior ao fim.'
  if (!lunch?.enabled) return null
  if (!lunch.start || !lunch.end || lunch.start >= lunch.end) return 'O almoço precisa ter início e fim válidos.'
  if (lunch.start <= start || lunch.end >= end) return 'O almoço precisa ficar dentro do expediente.'
  return null
}


