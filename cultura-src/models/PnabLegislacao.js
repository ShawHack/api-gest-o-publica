const mongoose = require('mongoose');

const PnabLegislacaoSchema = new mongoose.Schema({
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital' }, // opcional
  titulo: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['Lei', 'Decreto', 'Portaria', 'Resolução', 'Manual', 'Cartilha', 'Normativa', 'Outro'], default: 'Lei' },
  linkOficial: { type: String },
  arquivoUrl: { type: String },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabLegislacao', PnabLegislacaoSchema);
