/**
 * Áreas padrão criadas automaticamente em cada ciclo PNAB.
 * Ordem e títulos alinhados ao fluxograma oficial de execução.
 */
const DEFAULT_CYCLE_AREAS = [
  {
    tipo: 'PAAR',
    titulo: 'PAAR / Plano de Ação',
    descricao: 'Plano de Aplicação dos Recursos e planos de ação do ciclo (quando aplicável).',
    ordem: 10,
  },
  {
    tipo: 'Audiencias',
    titulo: 'Audiências',
    descricao: 'Audiências públicas, consultas e atos de participação social do ciclo.',
    ordem: 20,
  },
  {
    tipo: 'Editais',
    titulo: 'Editais',
    descricao: 'Editais e chamadas públicas de fomento cultural do ciclo.',
    ordem: 30,
  },
  {
    tipo: 'Inscricoes',
    titulo: 'Inscrições',
    descricao: 'Orientações e materiais relativos às inscrições nos editais do ciclo.',
    ordem: 40,
  },
  {
    tipo: 'Selecao',
    titulo: 'Seleção',
    descricao: 'Resultados, atas e documentos da etapa de seleção.',
    ordem: 50,
  },
  {
    tipo: 'Execucao',
    titulo: 'Execução',
    descricao: 'Acompanhamento da execução dos editais e ações culturais.',
    ordem: 60,
  },
  {
    tipo: 'Monitoramento',
    titulo: 'Monitoramento',
    descricao: 'Indicadores, relatórios e monitoramento do ciclo.',
    ordem: 70,
  },
  {
    tipo: 'PrestacaoContas',
    titulo: 'Prestação de Contas',
    descricao: 'Documentos e obrigações de prestação de contas do ciclo.',
    ordem: 80,
  },
]

module.exports = { DEFAULT_CYCLE_AREAS }
