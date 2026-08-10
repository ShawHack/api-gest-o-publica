const mongoose = require('mongoose');

const PnabFaqSchema = new mongoose.Schema({
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital', required: true },
  pergunta: { type: String, required: true, trim: true },
  resposta: { type: String, required: true, trim: true },
  ordem: { type: Number, default: 0 },
  categoria: { type: String, trim: true },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabFaq', PnabFaqSchema);
