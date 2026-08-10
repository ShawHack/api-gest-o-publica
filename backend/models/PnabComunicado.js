const mongoose = require('../db/conn')

const PnabComunicadoSchema = new mongoose.Schema({
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital', required: true },
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, required: true },
  imagemUrl: { type: String },
  dataInicioExibicao: { type: Date },
  dataFimExibicao: { type: Date },
  fixado: { type: Boolean, default: false },
  statusWorkflow: { type: String, enum: ['Em elaboração', 'Rascunho', 'Aguardando revisão', 'Publicado', 'Arquivado'], default: 'Rascunho' },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabComunicado', PnabComunicadoSchema);
