const mongoose = require('../db/conn')

const PnabYearSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true }, // ex: "2024", "2025"
  descricao: { type: String, trim: true },
  bannerUrl: { type: String },
  imagemUrl: { type: String },
  status: { type: String, enum: ['ativo', 'inativo'], default: 'ativo' },
  ordem: { type: Number, default: 0 },
  /** Ponte para o ciclo PNAB (migração gradual). */
  ciclo: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabCycle', index: true },
  deleted: { type: Boolean, default: false },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabYear', PnabYearSchema);
