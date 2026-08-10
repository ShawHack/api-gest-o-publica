const mongoose = require('../db/conn')

/**
 * Categoria de documentos dentro de um Ano de um Ciclo PNAB.
 * Aparece como card no portal/admin; documentos PDF ficam vinculados a ela.
 */
const PnabDocCategorySchema = new mongoose.Schema({
  ciclo: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabCycle', required: true, index: true },
  ano: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabYear', required: true, index: true },
  titulo: { type: String, required: true, trim: true },
  subtitulo: { type: String, trim: true, default: '' },
  descricao: { type: String, trim: true, default: '' },
  /** URL de ícone/imagem do card (biblioteca de mídias). */
  iconeUrl: { type: String, default: '' },
  corAccent: { type: String, default: '' },
  ordem: { type: Number, default: 0 },
  publicado: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now },
})

PnabDocCategorySchema.index({ ciclo: 1, ano: 1, deleted: 1, ordem: 1 })

module.exports = mongoose.model('PnabDocCategory', PnabDocCategorySchema)
