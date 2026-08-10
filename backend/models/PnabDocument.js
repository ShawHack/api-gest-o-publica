const mongoose = require('../db/conn')

const PnabDocumentSchema = new mongoose.Schema({
  /** Legado: documento ligado a edital/serviço. */
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital' },
  /** Legado/etapa: documento ligado a uma área do ciclo. */
  cicloArea: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabCycleArea', index: true },
  /** Preferencial: documento em categoria (card) dentro de Ano do Ciclo. */
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabDocCategory', index: true },
  titulo: { type: String, required: true },
  descricao: { type: String },
  tipo: {
    type: String,
    enum: [
      'Edital',
      'Anexo',
      'Modelo',
      'Errata',
      'Resultado',
      'Prestação de Contas',
      'PAAR',
      'Plano de Ação',
      'Ata',
      'Parecer',
      'Outro',
    ],
    default: 'Anexo',
  },
  versao: { type: String, default: '1.0' },
  arquivoUrl: { type: String, required: true },
  nomeOriginal: { type: String, default: '' },
  historicoVersoes: [
    {
      versao: String,
      arquivoUrl: String,
      dataUpload: { type: Date, default: Date.now },
      publicadoPor: String,
      descricaoAlteracao: String,
    },
  ],
  downloadsCount: { type: Number, default: 0 },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now },
})

PnabDocumentSchema.pre('validate', function (next) {
  if (!this.edital && !this.cicloArea && !this.categoria) {
    return next(new Error('Documento precisa de edital, cicloArea ou categoria.'))
  }
  return next()
})

module.exports = mongoose.model('PnabDocument', PnabDocumentSchema)
