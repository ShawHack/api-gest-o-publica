/** Constantes e enums do módulo Portal Municipal da Educação. */

const ENTITY_TYPES = [
  'secretaria',
  'escola',
  'creche',
  'emei',
  'centro_educacional',
  'projeto_educacional',
  'conselho',
]

const SCHOOL_UNIT_TYPES = [
  'escola',
  'creche',
  'emei',
  'centro_educacional',
  'projeto_educacional',
]

const COUNCIL_SLUGS = ['cme', 'cae', 'cacs-fundeb']

const POST_TYPES = [
  'noticia',
  'comunicado',
  'aviso',
  'evento',
  'projeto',
  'campanha',
  'destaque',
  'mensagem_institucional',
  'conselhos',
]

const POST_STATUSES = ['draft', 'pending_review', 'published', 'archived']

const MEETING_TYPES = ['ordinaria', 'extraordinaria']

const DOCUMENT_TYPES = [
  'ata',
  'parecer',
  'resolucao',
  'deliberacao',
  'portaria',
  'relatorio',
  'prestacao_contas',
  'legislacao',
  'comunicado',
  'documento_institucional',
  'lei',
  'decreto',
  'anexo',
]

const MEMBER_SEGMENTS = [
  'poder_publico',
  'profissionais_educacao',
  'pais_alunos',
  'comunidade',
  'outro',
]

const MEMBER_ROLES = [
  'presidente',
  'vice_presidente',
  'secretario',
  'membro_titular',
  'membro_suplente',
  'outro',
]

const DOCUMENT_CATEGORIES = [
  'prestacao_contas',
  'aplicacao_recursos',
  'fundeb',
  'alimentacao_escolar',
  'relatorio_institucional',
  'indicador_educacional',
  'documento_publico',
  'ata',
  'parecer',
  'resolucao',
  'deliberacao',
  'portaria',
  'relatorio',
  'documentacao_obrigatoria',
]

const LEGISLATION_CATEGORIES = [
  'lei_municipal',
  'decreto',
  'portaria',
  'resolucao',
  'normativa',
  'regulamento',
]

const PME_ATTACHMENT_TYPES = [
  'decreto',
  'portaria',
  'ata',
  'deliberacao',
  'resolucao',
  'relatorio',
  'anexo',
  'outro',
]

const CALENDAR_EVENT_TYPES = [
  'evento_escolar',
  'reuniao',
  'formacao',
  'feriado',
  'conselho_classe',
  'evento_esportivo',
  'evento_cultural',
  'comunicado_geral',
  'calendario_letivo',
  'data_comemorativa',
  'reuniao_conselho',
]

const CALENDAR_EVENT_TYPE_COLORS = {
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

const CALENDAR_EVENT_STATUSES = ['active', 'in_progress', 'inactive', 'cancelled', 'completed']

const CALENDAR_RECURRENCE_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
]

const LESSON_ASSIGNMENT_PROCESS_STATUSES = [
  'aberta',
  'em_andamento',
  'encerrada',
  'cancelada',
]

const LESSON_ASSIGNMENT_PUBLICATION_STATUSES = [
  'draft',
  'published',
  'archived',
]

const LESSON_ASSIGNMENT_CATEGORIES = [
  'atribuicao_anual',
  'suplementar',
  'remocao',
  'substituicao',
  'outro',
]

const LESSON_TEACHER_TYPES = [
  'efetivo',
  'selecionado',
  'convocado',
]

const LESSON_VACANCY_STATUSES = [
  'disponivel',
  'preenchida',
  'reservada',
  'cancelada',
]

const LESSON_DOCUMENT_TYPES = [
  'edital',
  'comunicado',
  'outro',
]

const POST_ATTACHMENT_TYPES = [
  'edital',
  'comunicado',
  'resolucao',
  'ata',
  'deliberacao',
  'portaria',
  'relatorio',
  'outro',
]

const EDUCATION_ROLES = [
  'education_admin',
  'education_secretary',
  'education_manager',
  'education_council',
]

const VISIBILITY = ['public', 'internal']

const DOCUMENT_STATUSES = ['draft', 'pending_review', 'published', 'archived']

const MEDIA_TYPES = ['image', 'video']

const FEATURED_MEDIA_TYPES = ['none', 'image', 'youtube']

/**
 * Fase futura — Portal do Aluno e dos Pais (não implementado).
 * Arquitetura preparada para extensão com:
 * - perfil do aluno (StudentProfile model)
 * - vínculo pai/responsável por CPF + ID do aluno (GuardianLink)
 * - boletim, advertências, cronograma, documentos escolares
 * - transporte escolar, cardápio, vagas, inscrições online
 * - app móvel integrado via mesmas rotas /api/education/student/*
 */
const FUTURE_STUDENT_PORTAL = {
  enabled: false,
  plannedRoutes: [
    '/education/student/profile',
    '/education/student/grades',
    '/education/student/schedule',
    '/education/parent/children',
  ],
}

module.exports = {
  ENTITY_TYPES,
  SCHOOL_UNIT_TYPES,
  COUNCIL_SLUGS,
  POST_TYPES,
  POST_STATUSES,
  MEETING_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_CATEGORIES,
  LEGISLATION_CATEGORIES,
  PME_ATTACHMENT_TYPES,
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_COLORS,
  CALENDAR_EVENT_STATUSES,
  CALENDAR_RECURRENCE_FREQUENCIES,
  LESSON_ASSIGNMENT_PROCESS_STATUSES,
  LESSON_ASSIGNMENT_PUBLICATION_STATUSES,
  LESSON_ASSIGNMENT_CATEGORIES,
  LESSON_TEACHER_TYPES,
  LESSON_VACANCY_STATUSES,
  LESSON_DOCUMENT_TYPES,
  POST_ATTACHMENT_TYPES,
  EDUCATION_ROLES,
  MEMBER_SEGMENTS,
  MEMBER_ROLES,
  VISIBILITY,
  DOCUMENT_STATUSES,
  MEDIA_TYPES,
  FEATURED_MEDIA_TYPES,
  FUTURE_STUDENT_PORTAL,
}
