/** Constantes do módulo Portal Garça Cidade de Culturas (SECULT). */

const CULTURA_ROLES = ['admin_cultura']

const POST_FORMATOS = ['Evento', 'Notícia']

const POST_STATUSES = ['draft', 'published', 'archived']

const DEFAULT_CATEGORIES = [
  { nome: 'Ao Ar Livre', cor: '#f97316' },
  { nome: 'Festival', cor: '#3b82f6' },
  { nome: 'Cultura', cor: '#22c55e' },
  { nome: 'Teatro', cor: '#721c24' },
  { nome: 'Música', cor: '#8b5cf6' },
]

module.exports = {
  CULTURA_ROLES,
  POST_FORMATOS,
  POST_STATUSES,
  DEFAULT_CATEGORIES,
}
