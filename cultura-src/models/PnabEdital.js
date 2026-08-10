const mongoose = require('mongoose');

const PnabEditalSchema = new mongoose.Schema({
  titulo: { type: String, required: true, trim: true },
  programa: { type: String, required: true, default: 'PNAB' }, // PNAB, Lei Aldir Blanc, etc.
  ano: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabYear', required: true },
  descricao: { type: String, required: true },
  statusEdital: { type: String, enum: ['Aberto', 'Em Análise', 'Resultado Preliminar', 'Finalizado', 'Prorrogado'], default: 'Aberto' },
  statusWorkflow: { type: String, enum: ['Em elaboração', 'Rascunho', 'Aguardando revisão', 'Publicado', 'Arquivado'], default: 'Rascunho' },
  destacado: { type: Boolean, default: false },
  ordem: { type: Number, default: 0 },
  bannerUrl: { type: String },
  imagemUrl: { type: String },
  galeriaUrls: [{ type: String }],
  videosUrls: [{ type: String }],
  tags: [{ type: String }],
  observacoes: { type: String },
  dataPublicacao: { type: Date, default: Date.now }, // Agendamento
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabEdital', PnabEditalSchema);
