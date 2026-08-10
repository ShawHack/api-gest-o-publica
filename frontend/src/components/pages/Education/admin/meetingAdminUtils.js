export const MEETING_TYPES = ['reuniao_conselho', 'reuniao']

export const MEETING_STATUS_OPTIONS = [
  { value: 'active', label: 'Agendada' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Finalizada' },
  { value: 'cancelled', label: 'Cancelada' },
]

export const EMPTY_MEETING_TIME = { startTime: '08:00', endTime: '10:00' }

export const EMPTY_MEETING_FORM = {
  title: '',
  description: '',
  startDateOnly: '',
  times: [{ ...EMPTY_MEETING_TIME }],
  location: '',
  responsible: '',
  status: 'active',
}

export function isMeetingType(type) {
  return MEETING_TYPES.includes(type)
}

export function meetingStatusLabel(status, isPublic = true) {
  if (!isPublic && status === 'inactive') return 'Rascunho'
  const found = MEETING_STATUS_OPTIONS.find((o) => o.value === status)
  if (found) return found.label
  if (status === 'inactive') return 'Rascunho'
  return status
}

export function createEmptyMeetingTime() {
  return { startTime: '14:00', endTime: '16:00' }
}

export function addMeetingTimeSlot(form) {
  return { ...form, times: [...form.times, createEmptyMeetingTime()] }
}

export function removeMeetingTimeSlot(form, index) {
  if (form.times.length <= 1) return form
  return { ...form, times: form.times.filter((_, i) => i !== index) }
}

export function updateMeetingTimeSlot(form, index, field, value) {
  return {
    ...form,
    times: form.times.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
  }
}

export function formatMeetingTimesDisplay(meeting) {
  const slot = meeting.dateSlots?.[0]
  if (slot?.times?.length) {
    return slot.times.map((t) => `${t.startTime} – ${t.endTime}`).join(', ')
  }
  if (meeting.startTime) {
    return meeting.endTime && meeting.endTime !== meeting.startTime
      ? `${meeting.startTime} – ${meeting.endTime}`
      : meeting.startTime
  }
  return '—'
}

export function meetingToForm(event) {
  if (!event) return { ...EMPTY_MEETING_FORM, times: [{ ...EMPTY_MEETING_TIME }] }
  const times = event.dateSlots?.[0]?.times?.length
    ? event.dateSlots[0].times.map((t) => ({
      startTime: t.startTime || '08:00',
      endTime: t.endTime || '10:00',
    }))
    : [{
      startTime: event.startTime || '08:00',
      endTime: event.endTime || '10:00',
    }]
  return {
    title: event.title || '',
    description: event.description || '',
    startDateOnly: event.dateSlots?.[0]?.dateOnly || event.startDateOnly || '',
    times,
    location: event.location || '',
    responsible: event.responsible || '',
    status: event.status === 'inactive' ? 'active' : (event.status || 'active'),
  }
}

export function buildMeetingFormData(form, councilId, { publish = true, file = null } = {}) {
  const fd = new FormData()
  const first = form.times[0] || EMPTY_MEETING_TIME
  fd.append('title', form.title.trim())
  fd.append('description', form.description?.trim() || '')
  fd.append('type', 'reuniao_conselho')
  fd.append('educationEntityId', councilId)
  fd.append('startDateOnly', form.startDateOnly)
  fd.append('endDateOnly', form.startDateOnly)
  fd.append('startTime', first.startTime)
  fd.append('endTime', first.endTime)
  fd.append('dateSlots', JSON.stringify([{
    dateOnly: form.startDateOnly,
    times: form.times,
  }]))
  fd.append('location', form.location?.trim() || '')
  fd.append('responsible', form.responsible?.trim() || '')
  fd.append('status', publish ? form.status : 'inactive')
  fd.append('isPublic', publish ? 'true' : 'false')
  if (file) fd.append('attachments', file)
  return fd
}

export function validateMeetingForm(form) {
  if (!form.title?.trim()) return 'Informe o título da reunião.'
  if (!form.startDateOnly) return 'Informe a data da reunião.'
  if (!form.times?.length) return 'Informe ao menos um horário.'
  for (let i = 0; i < form.times.length; i += 1) {
    const slot = form.times[i]
    if (!slot.startTime || !slot.endTime) return 'Preencha início e término de todos os horários.'
    if (slot.endTime < slot.startTime) {
      return `Horário ${i + 1}: o término deve ser posterior ao início.`
    }
  }
  return null
}
