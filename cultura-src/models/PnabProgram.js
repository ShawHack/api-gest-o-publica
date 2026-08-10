const mongoose = require('mongoose');

const PnabProgramSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true, trim: true },
  descricao: { type: String, trim: true },
  ativo: { type: Boolean, default: true },
  dataCriacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabProgram', PnabProgramSchema);
