const mongoose = require('../db/conn')

const PnabNoticiaSchema = new mongoose.Schema({
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital' }, // opcional
  titulo: { type: String, required: true, trim: true },
  resumo: { type: String, trim: true },
  texto: { type: String, required: true },
  imagemUrl: { type: String },
  galeriaUrls: [{ type: String }],
  videosUrls: [{ type: String }],
  tags: [{ type: String }],
  downloads: [{
    titulo: String,
    url: String
  }],
  statusWorkflow: { type: String, enum: ['Em elaboração', 'Rascunho', 'Aguardando revisão', 'Publicado', 'Arquivado'], default: 'Rascunho' },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabNoticia', PnabNoticiaSchema);
