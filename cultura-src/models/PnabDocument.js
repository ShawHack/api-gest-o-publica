const mongoose = require('mongoose');

const PnabDocumentSchema = new mongoose.Schema({
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital', required: true },
  titulo: { type: String, required: true },
  descricao: { type: String },
  tipo: { type: String, enum: ['Edital', 'Anexo', 'Modelo', 'Errata', 'Resultado', 'Prestação de Contas', 'Ata', 'Parecer', 'Outro'], default: 'Anexo' },
  versao: { type: String, default: '1.0' },
  arquivoUrl: { type: String, required: true },
  historicoVersoes: [{
    versao: String,
    arquivoUrl: String,
    dataUpload: { type: Date, default: Date.now },
    publicadoPor: String,
    descricaoAlteracao: String
  }],
  downloadsCount: { type: Number, default: 0 },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabDocument', PnabDocumentSchema);
