export const DOCUMENT_TYPE_LABELS = {
  ata: 'Ata',
  parecer: 'Parecer',
  resolucao: 'Resolução',
  deliberacao: 'Deliberação',
  portaria: 'Portaria',
  relatorio: 'Relatório',
  prestacao_contas: 'Prestação de contas',
  legislacao: 'Legislação',
  comunicado: 'Comunicado',
  documento_institucional: 'Documento institucional',
  lei: 'Lei',
  decreto: 'Decreto',
  anexo: 'Anexo',
}

export const MEETING_TYPE_LABELS = {
  ordinaria: 'Reunião ordinária',
  extraordinaria: 'Reunião extraordinária',
}

export const MEMBER_ROLE_LABELS = {
  presidente: 'Presidente',
  vice_presidente: 'Vice-presidente',
  secretario: 'Secretário(a)',
  membro_titular: 'Membro titular',
  membro_suplente: 'Membro suplente',
  outro: 'Membro',
}

export const MEMBER_SEGMENT_LABELS = {
  poder_publico: 'Poder público',
  profissionais_educacao: 'Profissionais da educação',
  pais_alunos: 'Pais e alunos',
  comunidade: 'Comunidade',
  outro: 'Outro segmento',
}

export const COUNCIL_NAV = [
  { to: 'sobre', label: 'Sobre' },
  { to: 'composicao', label: 'Composição' },
  { to: 'documentos', label: 'Documentos' },
  { to: 'reunioes', label: 'Reuniões' },
  { to: 'noticias', label: 'Notícias' },
  { to: 'galerias', label: 'Galerias' },
  { to: 'legislacao', label: 'Legislação' },
  { to: 'transparencia', label: 'Transparência' },
]

export function councilBasePath(slug) {
  return `/educacao/conselhos/${encodeURIComponent(slug)}`
}
