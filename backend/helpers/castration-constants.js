const REQUEST_STATUSES = [
  'pendente',
  'em_analise',
  'aprovada',
  'lista_de_espera',
  'recusada',
  'agendada',
  'realizada',
  'cancelada',
]

const CAMPAIGN_STATUSES = ['draft', 'open', 'full', 'closed']

const STATUS_LABELS = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovada: 'Aprovada',
  lista_de_espera: 'Lista de espera',
  recusada: 'Recusada',
  agendada: 'Agendada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
}

const ALLOWED_TRANSITIONS = {
  pendente: ['em_analise', 'aprovada', 'lista_de_espera', 'recusada', 'cancelada'],
  em_analise: ['aprovada', 'lista_de_espera', 'recusada', 'cancelada'],
  aprovada: ['agendada', 'recusada', 'cancelada'],
  lista_de_espera: ['em_analise', 'aprovada', 'recusada', 'cancelada'],
  agendada: ['realizada', 'cancelada'],
  realizada: [],
  recusada: [],
  cancelada: [],
}

const SPECIES_OPTIONS = ['cachorro', 'gato', 'outro']
const SEX_OPTIONS = ['macho', 'femea']

module.exports = {
  REQUEST_STATUSES,
  CAMPAIGN_STATUSES,
  STATUS_LABELS,
  ALLOWED_TRANSITIONS,
  SPECIES_OPTIONS,
  SEX_OPTIONS,
}
