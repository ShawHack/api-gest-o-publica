const mongoose = require('../db/conn')

/** Áreas-padrão de um ciclo PNAB (aparecem como cards no portal). */
const AREA_TIPOS = [
  'PAAR',
  'Audiencias',
  'Editais',
  'Inscricoes',
  'Selecao',
  'Execucao',
  'PrestacaoContas',
  'Monitoramento',
  'Outro',
]

/**
 * Área / etapa de um ciclo (card público + pasta de documentos).
 * Substitui, no desenho por ciclos, o papel genérico de “serviço/edital” como container.
 */
const PnabCycleAreaSchema = new mongoose.Schema({
  ciclo: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabCycle', required: true, index: true },
  tipo: { type: String, enum: AREA_TIPOS, required: true, default: 'Outro' },
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, trim: true },
  imagemUrl: { type: String },
  bannerUrl: { type: String },
  ordem: { type: Number, default: 0 },
  statusWorkflow: {
    type: String,
    enum: ['Rascunho', 'Publicado', 'Arquivado'],
    default: 'Rascunho',
  },
  /** Quando true, lista no portal público. */
  publicado: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now },
})

PnabCycleAreaSchema.index({ ciclo: 1, deleted: 1, ordem: 1 })
PnabCycleAreaSchema.index({ ciclo: 1, tipo: 1 })

module.exports = mongoose.model('PnabCycleArea', PnabCycleAreaSchema)
module.exports.AREA_TIPOS = AREA_TIPOS
