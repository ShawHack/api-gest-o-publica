export function dateKeyLocal(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function monthDays(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number)
  if (!year || month < 1 || month > 12) return []
  const leading = new Date(year, month - 1, 1).getDay()
  const total = new Date(year, month, 0).getDate()
  return [
    ...Array.from({ length: leading }, (_, index) => ({ placeholder: true, key: `empty-${index}` })),
    ...Array.from({ length: total }, (_, index) => {
      const day = index + 1
      return { day, date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }
    }),
  ]
}

export function fullDayRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(start.getTime())) throw new Error('Data inválida.')
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { startsAt: start.toISOString(), endsAt: end.toISOString() }
}

export function blockedDatesForUnit(blocks, unitId, monthKey) {
  return new Set((blocks || [])
    .filter((item) => item.active !== false && item.scope === 'unit' && String(item.unitId?._id || item.unitId) === String(unitId))
    .map((item) => dateKeyLocal(item.startsAt))
    .filter((date) => date.startsWith(`${monthKey}-`)))
}
