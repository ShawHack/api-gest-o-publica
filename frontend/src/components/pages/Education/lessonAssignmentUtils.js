import { formatDate, mediaUrl } from './educationUtils'

export const EMPTY_TEACHER = {
  name: '',
  registration: '',
  teacherType: 'selecionado',
  educationEntityId: '',
  subject: '',
  position: '',
  notes: '',
}

export const EMPTY_VACANCY = {
  educationEntityId: '',
  position: '',
  subject: '',
  workload: '',
  period: '',
  classCount: '',
  vacancyStatus: 'disponivel',
}

export const EMPTY_ASSIGNMENT_FORM = {
  title: '',
  description: '',
  category: 'atribuicao_anual',
  processStatus: 'aberta',
  assignmentDateOnly: '',
  assignmentTime: '08:00',
  assignmentEndTime: '12:00',
  location: '',
  observations: '',
  period: String(new Date().getFullYear()),
  showEffectiveTeachers: false,
  teachers: [{ ...EMPTY_TEACHER }],
  vacancies: [{ ...EMPTY_VACANCY }],
}

export function assignmentToForm(item) {
  if (!item) return { ...EMPTY_ASSIGNMENT_FORM, teachers: [{ ...EMPTY_TEACHER }], vacancies: [{ ...EMPTY_VACANCY }] }
  return {
    title: item.title || '',
    description: item.description || '',
    category: item.category || 'atribuicao_anual',
    processStatus: item.processStatus || 'aberta',
    assignmentDateOnly: item.assignmentDateOnly || '',
    assignmentTime: item.assignmentTime || '08:00',
    assignmentEndTime: item.assignmentEndTime || '12:00',
    location: item.location || '',
    observations: item.observations || '',
    period: item.period || String(new Date().getFullYear()),
    showEffectiveTeachers: !!item.showEffectiveTeachers,
    teachers: item.teachers?.length
      ? item.teachers.map((t) => ({
        _id: t._id,
        name: t.name || '',
        registration: t.registration || '',
        teacherType: t.teacherType || 'selecionado',
        educationEntityId: t.educationEntityId?._id || t.educationEntityId || '',
        subject: t.subject || '',
        position: t.position || '',
        notes: t.notes || '',
      }))
      : [{ ...EMPTY_TEACHER }],
    vacancies: item.vacancies?.length
      ? item.vacancies.map((v) => ({
        _id: v._id,
        educationEntityId: v.educationEntityId?._id || v.educationEntityId || '',
        position: v.position || '',
        subject: v.subject || '',
        workload: v.workload || '',
        period: v.period || '',
        classCount: v.classCount ?? '',
        vacancyStatus: v.vacancyStatus || 'disponivel',
      }))
      : [{ ...EMPTY_VACANCY }],
    existingDocuments: item.documents || [],
  }
}

export function buildLessonAssignmentFormData(form, { newDocuments = [], documentsMeta = [] } = {}) {
  const fd = new FormData()
  fd.append('title', form.title.trim())
  fd.append('description', form.description || '')
  fd.append('category', form.category)
  fd.append('processStatus', form.processStatus)
  fd.append('assignmentDateOnly', form.assignmentDateOnly || '')
  fd.append('assignmentTime', form.assignmentTime || '')
  fd.append('assignmentEndTime', form.assignmentEndTime || '')
  fd.append('location', form.location || '')
  fd.append('observations', form.observations || '')
  fd.append('period', form.period || '')
  fd.append('showEffectiveTeachers', form.showEffectiveTeachers ? 'true' : 'false')

  const teachers = (form.teachers || []).filter((t) => t.name?.trim())
  const vacancies = (form.vacancies || []).filter(
    (v) => v.educationEntityId && v.position?.trim() && v.subject?.trim()
  )

  fd.append('teachers', JSON.stringify(teachers))
  fd.append('vacancies', JSON.stringify(vacancies))

  if (form.existingDocuments?.length) {
    fd.append('existingDocuments', JSON.stringify(form.existingDocuments))
  }

  newDocuments.forEach((file) => fd.append('documents', file))
  if (documentsMeta.length) {
    fd.append('documentsMeta', JSON.stringify(documentsMeta))
  }

  return fd
}

export function formatAssignmentSchedule(item) {
  if (!item?.assignmentDateOnly) return 'Data a definir'
  const date = formatDate(item.assignmentDate)
  const time = item.assignmentTime
    ? `${item.assignmentTime}${item.assignmentEndTime ? ` às ${item.assignmentEndTime}` : ''}`
    : ''
  return time ? `${date} — ${time}` : date
}

export function entityName(entityRef) {
  if (!entityRef) return '—'
  if (typeof entityRef === 'object') return entityRef.name || '—'
  return '—'
}

export function documentDownloadUrl(fileUrl) {
  return mediaUrl(fileUrl)
}

export function groupVacanciesByEntity(vacancies = []) {
  const map = new Map()
  for (const vacancy of vacancies) {
    const entity = vacancy.educationEntityId
    const key = entity?._id || entity || 'unknown'
    const name = entityName(entity)
    if (!map.has(key)) map.set(key, { entity, name, vacancies: [] })
    map.get(key).vacancies.push(vacancy)
  }
  return Array.from(map.values())
}

export function filterTeachersByType(teachers = [], type) {
  return teachers.filter((t) => t.teacherType === type)
}
