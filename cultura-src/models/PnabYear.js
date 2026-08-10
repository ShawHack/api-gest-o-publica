const mongoose = require('mongoose');

const PnabYearSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true }, // ex: "2024", "2025"
  descricao: { type: String, trim: true },
  bannerUrl: { type: String },
  imagemUrl: { type: String },
  status: { type: String, enum: ['ativo', 'inativo'], default: 'ativo' },
  ordem: { type: Number, default: 0 },
  deleted: { type: Boolean, default: false },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabYear', PnabYearSchema);
