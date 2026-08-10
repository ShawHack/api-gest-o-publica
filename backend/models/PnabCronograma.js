const mongoose = require('../db/conn')

const PnabCronogramaSchema = new mongoose.Schema({
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital', required: true },
  data: { type: String, required: true }, // ex: "2025-08-10" ou descrição textual
  evento: { type: String, required: true, trim: true },
  descricao: { type: String, trim: true },
  status: { type: String, enum: ['Agendado', 'Em Andamento', 'Realizado', 'Prorrogado'], default: 'Agendado' },
  ordem: { type: Number, default: 0 },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabCronograma', PnabCronogramaSchema);
