export const EMPTY_DATE_SLOT = {
  dateOnly: '',
  times: [{ startTime: '08:00', endTime: '10:00' }],
}

export const EMPTY_EVENT_FORM = {
  title: '',
  description: '',
  type: 'evento_escolar',
  educationEntityId: '',
  dateSlots: [{ dateOnly: '', times: [{ startTime: '08:00', endTime: '10:00' }] }],
}

export function eventToForm(event) {
  if (!event) {
    return {
      title: '',
      description: '',
      type: 'evento_escolar',
      educationEntityId: '',
      dateSlots: [{ dateOnly: '', times: [{ startTime: '08:00', endTime: '10:00' }] }],
    }
  }
  const dateSlots = event.dateSlots?.length
    ? event.dateSlots.map((slot) => ({
      dateOnly: slot.dateOnly || '',
      times: (slot.times || []).map((t) => ({
        startTime: t.startTime || '08:00',
        endTime: t.endTime || '10:00',
      })),
    }))
    : [{
      dateOnly: event.startDateOnly || '',
      times: [{ startTime: event.startTime || '08:00', endTime: event.endTime || '10:00' }],
    }]

  return {
    title: event.title || '',
    description: event.description || '',
    type: event.type || 'evento_escolar',
    educationEntityId: event.educationEntityId?._id || event.educationEntityId || '',
    dateSlots,
  }
}

export function buildCalendarEventFormData(form) {
  const fd = new FormData()
  fd.append('title', form.title.trim())
  if (form.description?.trim()) fd.append('description', form.description.trim())
  fd.append('type', form.type)
  if (form.educationEntityId) fd.append('educationEntityId', form.educationEntityId)
  fd.append('dateSlots', JSON.stringify(form.dateSlots))
  return fd
}

export function formatDateBr(dateOnly) {
  if (!dateOnly) return '—'
  const [y, m, d] = dateOnly.split('-')
  if (!y || !m || !d) return dateOnly
  return `${d}/${m}/${y}`
}

export function formatSlotLabel(slot) {
  const date = formatDateBr(slot.dateOnly)
  const times = (slot.times || [])
    .map((t) => `${t.startTime} às ${t.endTime}`)
    .join(' · ')
  return `${date} — ${times}`
}

export function formatAllSlots(event) {
  const slots = event.dateSlots?.length ? event.dateSlots : eventToForm(event).dateSlots
  return slots.map(formatSlotLabel)
}

export function validateEventForm(form) {
  if (!form.title?.trim()) return 'Informe o título do evento.'
  const validSlots = (form.dateSlots || []).filter(
    (slot) => slot.dateOnly && slot.times?.some((t) => t.startTime && t.endTime)
  )
  if (!validSlots.length) return 'Adicione ao menos uma data com horário.'
  return null
}
