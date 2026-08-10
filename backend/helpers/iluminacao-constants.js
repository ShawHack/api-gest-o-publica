/**
 * Catálogo de status e problemas — Iluminação Pública.
 * Compatível com legado Firestore: pending | assigned | resolved.
 */

const LEGACY_STATUS_MAP = {
  pending: 'received',
  assigned: 'forwarded',
  resolved: 'resolved',
}

const STATUS_LABELS = {
  received: 'Solicitação recebida',
  under_review: 'Em análise',
  forwarded: 'Encaminhada para a equipe responsável',
  scheduled: 'Serviço programado',
  en_route: 'Equipe em deslocamento',
  in_progress: 'Atendimento em andamento',
  waiting_material: 'Aguardando material',
  waiting_utility: 'Aguardando manutenção da concessionária',
  resolved: 'Resolvido',
  not_found: 'Não localizado',
  duplicate: 'Solicitação duplicada',
  not_applicable: 'Atendimento não aplicável',
  cancelled: 'Cancelado',
  // legado (aliases de leitura)
  pending: 'Solicitação recebida',
  assigned: 'Encaminhada para a equipe responsável',
}

const STATUS_DESCRIPTIONS = {
  received: 'Sua solicitação foi encaminhada para análise pela equipe responsável.',
  under_review: 'Nossa equipe está avaliando o reporte e a localização do poste.',
  forwarded: 'O chamado foi encaminhado para a equipe de campo responsável.',
  scheduled: 'A visita técnica foi agendada. Acompanhe novas atualizações por aqui.',
  en_route: 'A equipe está a caminho do local informado.',
  in_progress: 'O atendimento está em andamento no local.',
  waiting_material: 'O atendimento depende da chegada de material. Retomaremos em seguida.',
  waiting_utility: 'O caso depende de intervenção da concessionária de energia.',
  resolved: 'A solicitação foi concluída. Agradecemos sua colaboração.',
  not_found:
    'Não encontramos o poste/problema com os dados informados. Se possível, registre novamente com mais detalhes.',
  duplicate: 'Identificamos outro chamado aberto para o mesmo poste/problema.',
  not_applicable: 'Após análise, o atendimento não se aplica a este caso.',
  cancelled: 'A solicitação foi cancelada.',
  pending: 'Sua solicitação foi encaminhada para análise pela equipe responsável.',
  assigned: 'O chamado foi encaminhado para a equipe de campo responsável.',
}

const ALLOWED_STATUSES = new Set([
  ...Object.keys(STATUS_LABELS),
])

const PROBLEM_LABELS = {
  queimada: 'Lâmpada queimada',
  piscando: 'Luz piscando',
  acesa_dia: 'Acesa de dia',
  danificado: 'Poste danificado',
  fios_expostos: 'Fios expostos',
  outro: 'Outro problema de iluminação',
}

function normalizeStatus(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (LEGACY_STATUS_MAP[s]) return LEGACY_STATUS_MAP[s]
  return s
}

function statusLabel(raw) {
  const key = String(raw || '').trim()
  return STATUS_LABELS[key] || STATUS_LABELS[normalizeStatus(key)] || key || '—'
}

function statusDescription(raw) {
  const key = String(raw || '').trim()
  return (
    STATUS_DESCRIPTIONS[key] ||
    STATUS_DESCRIPTIONS[normalizeStatus(key)] ||
    'Acompanhe as atualizações por este WhatsApp.'
  )
}

function problemLabel(type) {
  return PROBLEM_LABELS[type] || type || 'Problema reportado'
}

function isAllowedStatus(raw) {
  const key = String(raw || '').trim()
  return ALLOWED_STATUSES.has(key) || ALLOWED_STATUSES.has(normalizeStatus(key))
}

module.exports = {
  LEGACY_STATUS_MAP,
  STATUS_LABELS,
  STATUS_DESCRIPTIONS,
  ALLOWED_STATUSES,
  PROBLEM_LABELS,
  normalizeStatus,
  statusLabel,
  statusDescription,
  problemLabel,
  isAllowedStatus,
}
