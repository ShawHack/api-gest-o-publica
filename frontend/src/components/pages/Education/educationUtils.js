export const EVENT_LABELS = {
  evento_escolar: 'Evento Escolar',
  reuniao: 'Reunião',
  formacao: 'Formação de Professores',
  feriado: 'Feriado',
  conselho_classe: 'Conselho de Classe',
  evento_esportivo: 'Evento Esportivo',
  evento_cultural: 'Evento Cultural',
  comunicado_geral: 'Comunicado Geral',
  calendario_letivo: 'Calendário letivo',
  data_comemorativa: 'Data comemorativa',
  reuniao_conselho: 'Reunião de conselho',
}

export const EVENT_TYPE_COLORS = {
  evento_escolar: '#2563eb',
  reuniao: '#16a34a',
  formacao: '#7c3aed',
  feriado: '#dc2626',
  conselho_classe: '#ea580c',
  evento_esportivo: '#ca8a04',
  evento_cultural: '#db2777',
  comunicado_geral: '#6b7280',
  calendario_letivo: '#3460a4',
  data_comemorativa: '#0d9488',
  reuniao_conselho: '#ea580c',
}

export function getEventTypeColor(type) {
  return EVENT_TYPE_COLORS[type] || '#2563eb'
}

export const CALENDAR_STATUS_LABELS = {
  active: 'Agendada',
  in_progress: 'Em andamento',
  inactive: 'Rascunho',
  cancelled: 'Cancelada',
  completed: 'Finalizada',
}

export const ENTITY_TYPE_LABELS = {
  secretaria: 'Secretaria',
  escola: 'Escola',
  creche: 'Creche',
  emei: 'EMEI',
  centro_educacional: 'Centro Educacional',
  projeto_educacional: 'Projeto Educacional',
  conselho: 'Conselho',
}

export const POST_TYPE_LABELS = {
  noticia: 'Notícia',
  comunicado: 'Comunicado',
  aviso: 'Aviso',
  evento: 'Evento',
  projeto: 'Projeto',
  campanha: 'Campanha',
  destaque: 'Destaque',
  mensagem_institucional: 'Mensagem institucional',
  conselhos: 'Conselhos',
}

export const POST_ATTACHMENT_TYPE_LABELS = {
  edital: 'Edital',
  comunicado: 'Comunicado',
  resolucao: 'Resolução',
  ata: 'Ata',
  deliberacao: 'Deliberação',
  portaria: 'Portaria',
  relatorio: 'Relatório',
  outro: 'Outro',
}

export const POST_STATUS_LABELS = {
  draft: 'Rascunho',
  pending_review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
}

export const EDUCATION_ROLE_LABELS = {
  education_admin: 'Administrador do módulo',
  education_secretary: 'Secretaria Municipal',
  education_manager: 'Gestor de unidade',
  education_council: 'Usuário de conselho',
}

export const DOCUMENT_STATUS_LABELS = {
  draft: 'Rascunho',
  pending_review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
}

export const MAX_EDUCATION_UPLOAD_BYTES = 500 * 1024 * 1024
export const MAX_EDUCATION_UPLOAD_LABEL = '500 MB'

export const FEATURED_MEDIA_LABELS = {
  none: 'Sem destaque visual',
  image: 'Imagem de capa',
  youtube: 'Vídeo do YouTube',
}

export function normalizeExternalUrl(input) {
  if (!input || typeof input !== 'string') return ''
  const raw = input.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^\/\//.test(raw)) return `https:${raw}`
  return `https://${raw.replace(/^\/+/, '')}`
}

export function isValidExternalUrl(input) {
  if (!input || typeof input !== 'string') return false
  try {
    const url = new URL(input.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const LESSON_PROCESS_STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
}

export const LESSON_PUBLICATION_STATUS_LABELS = {
  draft: 'Rascunho',
  published: 'Publicada',
  archived: 'Arquivada',
}

export const LESSON_CATEGORY_LABELS = {
  atribuicao_anual: 'Atribuição anual',
  suplementar: 'Suplementar',
  remocao: 'Remoção',
  substituicao: 'Substituição',
  outro: 'Outro',
}

export const LESSON_TEACHER_TYPE_LABELS = {
  efetivo: 'Professor efetivo',
  selecionado: 'Professor selecionado',
  convocado: 'Professor convocado',
}

export const LESSON_VACANCY_STATUS_LABELS = {
  disponivel: 'Disponível',
  preenchida: 'Preenchida',
  reservada: 'Reservada',
  cancelada: 'Cancelada',
}

export const LESSON_DOCUMENT_TYPE_LABELS = {
  edital: 'Edital',
  comunicado: 'Comunicado',
  outro: 'Outro',
}

export const LESSON_PROCESS_STATUS_COLORS = {
  aberta: '#16a34a',
  em_andamento: '#2563eb',
  encerrada: '#6b7280',
  cancelada: '#dc2626',
}

export const LEGISLATION_LABELS = {
  lei_municipal: 'Lei municipal',
  decreto: 'Decreto',
  portaria: 'Portaria',
  resolucao: 'Resolução',
  normativa: 'Normativa',
  regulamento: 'Regulamento',
}

export const PME_ATTACHMENT_TYPE_LABELS = {
  decreto: 'Decreto',
  portaria: 'Portaria',
  ata: 'Ata de reunião',
  deliberacao: 'Deliberação',
  resolucao: 'Resolução',
  relatorio: 'Relatório',
  anexo: 'Anexo',
  outro: 'Outro',
}

export function mediaUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = (typeof window !== 'undefined' && window.__API_BASE__)
    ? String(window.__API_BASE__).replace(/\/api\/?$/, '')
    : ''
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v')
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
      }
      const parts = url.pathname.split('/').filter(Boolean)
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1]
      const shortsIdx = parts.indexOf('shorts')
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1]
    }
  } catch {
    return null
  }
  return null
}

export function youtubeEmbedUrl(videoId) {
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : ''
}

export function youtubeThumbnailUrl(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
}

export function postThumbnail(post) {
  if (!post) return ''
  if (post.thumbnailUrl) return mediaUrl(post.thumbnailUrl)
  if (post.coverImageUrl) return mediaUrl(post.coverImageUrl)
  if (post.youtubeVideoId) return youtubeThumbnailUrl(post.youtubeVideoId)
  return ''
}

export function getEntityImagePath(entity) {
  if (!entity) return ''
  return entity.coverImageUrl || entity.imageUrl || entity.logoUrl || ''
}

export function entityThumbnail(entity) {
  const path = getEntityImagePath(entity)
  return path ? mediaUrl(path) : ''
}
